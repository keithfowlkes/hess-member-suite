import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Also initialize a user-aware client to resolve caller from JWT if provided
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { requestId, adminUserId: adminUserIdFromBody } = await req.json();

    // Resolve admin user from body or JWT; only requestId is strictly required
    let adminUserId = adminUserIdFromBody ?? null;
    try {
      const { data: { user } } = await supabaseUser.auth.getUser();
      if (!adminUserId && user?.id) {
        adminUserId = user.id;
      }
    } catch (_e) {
      console.warn('[APPROVE-REASSIGNMENT] Could not resolve admin user from JWT');
    }

    if (!requestId) {
      return new Response(
        JSON.stringify({ error: 'Missing requestId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[APPROVE-REASSIGNMENT] Start requestId=${requestId} adminUserId=${adminUserId}`);

    // 1) Load reassignment request
    const { data: reassignmentReq, error: reqErr } = await supabaseAdmin
      .from('organization_reassignment_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (reqErr || !reassignmentReq) {
      console.error('[APPROVE-REASSIGNMENT] Request not found', reqErr);
      return new Response(
        JSON.stringify({ error: 'Reassignment request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orgId: string = reassignmentReq.organization_id;
    const newOrgData = reassignmentReq.new_organization_data || {};
    const registration = reassignmentReq.user_registration_data || null;
    const newContactEmail: string = reassignmentReq.new_contact_email;

    console.log('[APPROVE-REASSIGNMENT] Loaded request with orgId', orgId);

    // 2) Load existing organization + current primary contact
    const { data: existingOrg, error: orgErr } = await supabaseAdmin
      .from('organizations')
      .select('id, name, contact_person_id, profiles:contact_person_id(id, user_id, email, first_name, last_name)')
      .eq('id', orgId)
      .maybeSingle();

    if (orgErr || !existingOrg) {
      console.error('[APPROVE-REASSIGNMENT] Organization not found', orgErr);
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[APPROVE-REASSIGNMENT] Existing organization:', existingOrg.name);

    // 3) DELETE existing org and its related information (treat as full replacement)
    // Do NOT delete this reassignment request row; we will mark it approved after.

    // 3a) Delete invoices
    const { error: invDelErr } = await supabaseAdmin
      .from('invoices')
      .delete()
      .eq('organization_id', orgId);
    if (invDelErr) console.error('[APPROVE-REASSIGNMENT] Failed deleting invoices', invDelErr);

    // 3b) Delete invitations
    const { error: invtDelErr } = await supabaseAdmin
      .from('organization_invitations')
      .delete()
      .eq('organization_id', orgId);
    if (invtDelErr) console.error('[APPROVE-REASSIGNMENT] Failed deleting invitations', invtDelErr);

    // 3c) Delete transfer requests
    const { error: xferDelErr } = await supabaseAdmin
      .from('organization_transfer_requests')
      .delete()
      .eq('organization_id', orgId);
    if (xferDelErr) console.error('[APPROVE-REASSIGNMENT] Failed deleting transfer requests', xferDelErr);

    // IMPORTANT: We keep organization_reassignment_requests so this approval record remains.

    // 3d) Delete the organization record itself
    const { error: delOrgErr } = await supabaseAdmin
      .from('organizations')
      .delete()
      .eq('id', orgId);
    if (delOrgErr) {
      console.error('[APPROVE-REASSIGNMENT] Failed deleting organization', delOrgErr);
      return new Response(
        JSON.stringify({ error: `Failed deleting organization: ${delOrgErr.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('[APPROVE-REASSIGNMENT] Deleted organization');

    // 3e) Delete the previous contact user + roles + profile (if any)
    const oldUserId: string | null = existingOrg.profiles?.user_id ?? null;
    if (oldUserId) {
      // delete roles
      const { error: roleDelErr } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', oldUserId);
      if (roleDelErr) console.error('[APPROVE-REASSIGNMENT] Failed deleting user roles', roleDelErr);

      // delete auth user
      const { error: authDelErr } = await supabaseAdmin.auth.admin.deleteUser(oldUserId);
      if (authDelErr) {
        if (authDelErr.message?.includes('User not found') || (authDelErr as any).code === 'user_not_found') {
          console.log('[APPROVE-REASSIGNMENT] Old auth user already deleted');
        } else {
          console.error('[APPROVE-REASSIGNMENT] Failed deleting auth user', authDelErr);
        }
      }

      // ensure profile is gone (manual cleanup)
      const { error: profDelErr } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('user_id', oldUserId);
      if (profDelErr) console.error('[APPROVE-REASSIGNMENT] Failed deleting old profile', profDelErr);
      else console.log('[APPROVE-REASSIGNMENT] Deleted old profile');
    }

    // 4) CREATE NEW contact (as if new member) when registration data provided
    let newContactProfileId: string | null = null;
    if (registration) {
      // Try to find existing profile by email first
      const { data: existingProfile, error: existProfErr } = await supabaseAdmin
        .from('profiles')
        .select('id, user_id')
        .eq('email', newContactEmail)
        .maybeSingle();
      if (existProfErr) console.warn('[APPROVE-REASSIGNMENT] Error checking existing profile', existProfErr);

      let newUserId: string | null = existingProfile?.user_id ?? null;

      if (!newUserId) {
        console.log('[APPROVE-REASSIGNMENT] Creating new auth user for', newContactEmail);
        const tempPassword = `${Math.random().toString(36).slice(-8)}Aa!1`;
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: newContactEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            first_name: registration.first_name,
            last_name: registration.last_name,
            isPrivateNonProfit: registration.is_private_nonprofit,
            organization: newOrgData?.name ?? '',
          },
        });
        if (createErr) {
          console.error('[APPROVE-REASSIGNMENT] Failed creating auth user', createErr);
          return new Response(
            JSON.stringify({ error: `Failed to create new contact user: ${createErr.message}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        newUserId = created.user?.id ?? null;

        // Give triggers a moment to insert profile
        await new Promise((r) => setTimeout(r, 1500));
      }

      // Fetch/create profile for that user
      if (newUserId) {
        const { data: prof, error: profErr } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('user_id', newUserId)
          .maybeSingle();
        if (profErr) console.warn('[APPROVE-REASSIGNMENT] Error fetching profile for new user', profErr);

        if (prof?.id) {
          newContactProfileId = prof.id;
        } else {
          // Create minimal profile if trigger didn't create it
          const { data: insertedProf, error: insertProfErr } = await supabaseAdmin
            .from('profiles')
            .insert({
              user_id: newUserId,
              first_name: registration.first_name ?? '',
              last_name: registration.last_name ?? '',
              email: newContactEmail,
              organization: newOrgData?.name ?? '',
            })
            .select('id')
            .maybeSingle();
          if (insertProfErr) {
            console.error('[APPROVE-REASSIGNMENT] Failed inserting profile', insertProfErr);
            return new Response(
              JSON.stringify({ error: `Failed to create new contact profile: ${insertProfErr.message}` }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          newContactProfileId = insertedProf?.id ?? null;
        }

        // Send password reset email so user can set their password
        try {
          const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: newContactEmail,
            options: {
              redirectTo: (await (async () => {
                const origin = req.headers.get('origin') || 'https://members.hessconsortium.app';
                return `${origin}/auth`;
              })()),
            },
          });
          if (resetError) console.error('[APPROVE-REASSIGNMENT] Password reset email failed', resetError);
        } catch (emailErr) {
          console.error('[APPROVE-REASSIGNMENT] Password reset email exception', emailErr);
        }
      }
    } else {
      // If no registration provided, try to link to an existing profile by email (optional)
      const { data: prof, error: profErr } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', newContactEmail)
        .maybeSingle();
      if (profErr) console.warn('[APPROVE-REASSIGNMENT] Profile lookup by email failed', profErr);
      newContactProfileId = prof?.id ?? null;
    }

    // 5) INSERT the new organization record with the new information (as if new member)
    const allowedOrgKeys = [
      'name','student_fte','address_line_1','address_line_2','city','state','zip_code','phone','email','website',
      'primary_contact_title','secondary_first_name','secondary_last_name','secondary_contact_title','secondary_contact_email',
      'student_information_system','financial_system','financial_aid','hcm_hr','payroll_system','purchasing_system',
      'housing_management','learning_management','admissions_crm','alumni_advancement_crm','primary_office_apple',
      'primary_office_asus','primary_office_dell','primary_office_hp','primary_office_microsoft','primary_office_other',
      'primary_office_other_details','other_software_comments',
    ];

    const insertPayload: Record<string, any> = Object.fromEntries(
      Object.entries(newOrgData || {}).filter(([k]) => allowedOrgKeys.includes(k))
    );

    insertPayload.contact_person_id = newContactProfileId ?? null;
    // As new member: membership fields use defaults (pending, etc.)

    const { data: newOrg, error: insertOrgErr } = await supabaseAdmin
      .from('organizations')
      .insert(insertPayload)
      .select('id, name')
      .maybeSingle();

    if (insertOrgErr) {
      console.error('[APPROVE-REASSIGNMENT] Failed inserting new organization', insertOrgErr);
      return new Response(
        JSON.stringify({ error: `Failed to insert new organization: ${insertOrgErr.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[APPROVE-REASSIGNMENT] Created new organization', newOrg?.name, newOrg?.id);

    // 6) Mark the reassignment request approved
    const { error: updReqErr } = await supabaseAdmin
      .from('organization_reassignment_requests')
      .update({
        status: 'approved',
        approved_by: adminUserId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', requestId);
    if (updReqErr) console.error('[APPROVE-REASSIGNMENT] Failed updating request status', updReqErr);

    // 7) Send the "Member Information Update Request approved" email (NOT new member approval)
    try {
      await supabaseAdmin.functions.invoke('organization-emails', {
        body: {
          type: 'profile_update_approved',
          to: newContactEmail,
          organizationName: newOrg?.name || newOrgData?.name || 'Organization',
          organizationData: {
            primary_contact_name: registration ? `${registration.first_name ?? ''} ${registration.last_name ?? ''}`.trim() : 'Member',
            ...newOrgData,
          },
        },
      });
      console.log('[APPROVE-REASSIGNMENT] Sent profile_update_approved email');
    } catch (emailErr) {
      console.error('[APPROVE-REASSIGNMENT] Email send failed', emailErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Organization replaced and request approved',
        newOrganizationId: newOrg?.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[APPROVE-REASSIGNMENT] Unexpected error', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});