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

    // 3) CREATE NEW contact user and profile when registration data provided
    let newContactProfileId: string | null = null;
    let newUserId: string | null = null;
    
    if (registration) {
      // Check if user already exists by email
      const { data: existingProfile, error: existProfErr } = await supabaseAdmin
        .from('profiles')
        .select('id, user_id')
        .eq('email', newContactEmail)
        .maybeSingle();
      
      if (existProfErr) console.warn('[APPROVE-REASSIGNMENT] Error checking existing profile', existProfErr);

      if (existingProfile?.user_id) {
        // User already exists, use existing profile
        newUserId = existingProfile.user_id;
        newContactProfileId = existingProfile.id;
        console.log('[APPROVE-REASSIGNMENT] Using existing user for', newContactEmail);
      } else {
        // Create new user
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

        // Fetch the profile created by the trigger
        const { data: prof, error: profErr } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('user_id', newUserId!)
          .maybeSingle();
          
        if (profErr || !prof) {
          console.error('[APPROVE-REASSIGNMENT] Profile not found after user creation', profErr);
          return new Response(
            JSON.stringify({ error: 'Failed to create user profile' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        newContactProfileId = prof.id;
      }
    } else {
      // If no registration provided, try to link to an existing profile by email
      const { data: prof, error: profErr } = await supabaseAdmin
        .from('profiles')
        .select('id, user_id')
        .eq('email', newContactEmail)
        .maybeSingle();
        
      if (profErr) console.warn('[APPROVE-REASSIGNMENT] Profile lookup by email failed', profErr);
      
      if (prof) {
        newContactProfileId = prof.id;
        newUserId = prof.user_id;
      }
    }

    // 4) Update the existing organization with new data instead of creating a new one
    const allowedOrgKeys = [
      'name','student_fte','address_line_1','address_line_2','city','state','zip_code','phone','email','website',
      'primary_contact_title','secondary_first_name','secondary_last_name','secondary_contact_title','secondary_contact_email',
      'student_information_system','financial_system','financial_aid','hcm_hr','payroll_system','purchasing_system',
      'housing_management','learning_management','admissions_crm','alumni_advancement_crm','primary_office_apple',
      'primary_office_asus','primary_office_dell','primary_office_hp','primary_office_microsoft','primary_office_other',
      'primary_office_other_details','other_software_comments',
    ];

    const updatePayload: Record<string, any> = Object.fromEntries(
      Object.entries(newOrgData || {}).filter(([k]) => allowedOrgKeys.includes(k))
    );

    // Update contact person if we have a new one
    if (newContactProfileId) {
      updatePayload.contact_person_id = newContactProfileId;
    }

    console.log('[APPROVE-REASSIGNMENT] Updating organization with new data');
    
    const { error: updateOrgErr } = await supabaseAdmin
      .from('organizations')
      .update(updatePayload)
      .eq('id', orgId);

    if (updateOrgErr) {
      console.error('[APPROVE-REASSIGNMENT] Failed updating organization', updateOrgErr);
      return new Response(
        JSON.stringify({ error: `Failed to update organization: ${updateOrgErr.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[APPROVE-REASSIGNMENT] Successfully updated organization');

    // 5) Mark the reassignment request as approved
    const { error: updReqErr } = await supabaseAdmin
      .from('organization_reassignment_requests')
      .update({
        status: 'approved',
        approved_by: adminUserId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', requestId);
      
    if (updReqErr) {
      console.error('[APPROVE-REASSIGNMENT] Failed updating request status', updReqErr);
    } else {
      console.log('[APPROVE-REASSIGNMENT] Request marked as approved');
    }

    // 6) Clean up old user if they exist and are different from new user
    if (existingOrg?.profiles?.user_id && existingOrg.profiles.user_id !== newUserId) {
      const oldUserId = existingOrg.profiles.user_id;
      console.log('[APPROVE-REASSIGNMENT] Cleaning up old user', oldUserId);
      
      try {
        // Delete user roles
        await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', oldUserId);

        // Delete auth user
        const { error: authDelErr } = await supabaseAdmin.auth.admin.deleteUser(oldUserId);
        if (authDelErr && !authDelErr.message?.includes('User not found')) {
          console.error('[APPROVE-REASSIGNMENT] Failed deleting auth user', authDelErr);
        }
      } catch (cleanupErr) {
        console.error('[APPROVE-REASSIGNMENT] Error during user cleanup', cleanupErr);
      }
    }

    // 7) Send notification email using centralized email delivery
    try {
      console.log('[APPROVE-REASSIGNMENT] Sending notification email to', newContactEmail);
      
      // Prepare update details for email
      const updateDetails = [];
      const orgData = newOrgData || {};
      const existingOrgData = existingOrg || {};
      
      // Compare and list changes
      const fieldsToCheck = [
        { key: 'name', label: 'Organization Name' },
        { key: 'address_line_1', label: 'Address' },
        { key: 'city', label: 'City' },
        { key: 'state', label: 'State' },
        { key: 'zip_code', label: 'ZIP Code' },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email' },
        { key: 'student_fte', label: 'Student FTE' }
      ];
      
      fieldsToCheck.forEach(field => {
        if (orgData[field.key] && orgData[field.key] !== existingOrgData[field.key]) {
          updateDetails.push(`- ${field.label}: ${orgData[field.key]}`);
        }
      });

      const emailPayload = {
        type: 'member_info_update',
        to: [newContactEmail],
        data: {
          first_name: registration?.first_name || '',
          last_name: registration?.last_name || '',
          organization_name: orgData.name || existingOrgData.name || 'Your Organization',
          update_details: updateDetails.length > 0 ? updateDetails.join('\n') : 'Contact information updated'
        }
      };

      const emailResponse = await supabaseAdmin.functions.invoke('centralized-email-delivery', {
        body: emailPayload
      });

      if (emailResponse.error) {
        console.error('[APPROVE-REASSIGNMENT] Email notification failed', emailResponse.error);
      } else {
        console.log('[APPROVE-REASSIGNMENT] Email notification sent successfully');
      }
    } catch (emailErr) {
      console.error('[APPROVE-REASSIGNMENT] Email notification exception', emailErr);
    }

    // 8) Send password reset email for new users
    if (newUserId && registration) {
      try {
        console.log('[APPROVE-REASSIGNMENT] Sending password reset email to', newContactEmail);
        
        const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: newContactEmail,
          options: {
            redirectTo: (() => {
              const origin = req.headers.get('origin') || 'https://members.hessconsortium.app';
              return `${origin}/auth`;
            })(),
          },
        });
        
        if (resetError) {
          console.error('[APPROVE-REASSIGNMENT] Password reset email failed', resetError);
        } else {
          console.log('[APPROVE-REASSIGNMENT] Password reset email sent successfully');
        }
      } catch (resetErr) {
        console.error('[APPROVE-REASSIGNMENT] Password reset email exception', resetErr);
      }
    }

    console.log('[APPROVE-REASSIGNMENT] Process completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Member information update request approved successfully',
        organizationId: orgId,
        newContactEmail: newContactEmail
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[APPROVE-REASSIGNMENT] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});