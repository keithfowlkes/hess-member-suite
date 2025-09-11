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
          persistSession: false
        }
      }
    );

    const { requestId, adminUserId } = await req.json();
    
    if (!requestId || !adminUserId) {
      return new Response(
        JSON.stringify({ error: 'Missing requestId or adminUserId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing approval for reassignment request: ${requestId} by admin: ${adminUserId}`);

    // Get the reassignment request
    const { data: reassignmentReq, error: fetchError } = await supabaseAdmin
      .from('organization_reassignment_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (fetchError || !reassignmentReq) {
      console.error('Error fetching reassignment request:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Reassignment request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found reassignment request for: ${reassignmentReq.new_contact_email}`);

    // Create the auth user if user registration data is provided
    if (reassignmentReq.user_registration_data) {
      const userData = reassignmentReq.user_registration_data;
      const newOrgData = reassignmentReq.new_organization_data || {};

      // Only update columns that exist on organizations table
      const allowedKeys = [
        'name','student_fte','address_line_1','address_line_2','city','state','zip_code','phone','email','website',
        'primary_contact_title','secondary_first_name','secondary_last_name','secondary_contact_title','secondary_contact_email',
        'student_information_system','financial_system','financial_aid','hcm_hr','payroll_system','purchasing_system',
        'housing_management','learning_management','admissions_crm','alumni_advancement_crm','primary_office_apple',
        'primary_office_asus','primary_office_dell','primary_office_hp','primary_office_microsoft','primary_office_other',
        'primary_office_other_details','other_software_comments'
      ];
      const updateFields = Object.fromEntries(
        Object.entries(newOrgData).filter(([k]) => allowedKeys.includes(k))
      );

      let targetAuthUserId: string | null = null;

      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(userData.email);
      
      if (!existingUser.user) {
        console.log(`Creating auth user for: ${userData.email}`);
        // Create the auth user
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: Math.random().toString(36).slice(-8) + 'A1!', // Temporary password
          email_confirm: true, // Skip email confirmation
          user_metadata: {
            first_name: userData.first_name,
            last_name: userData.last_name,
            isPrivateNonProfit: userData.is_private_nonprofit
          }
        });

        if (authError) {
          console.error('Error creating auth user:', authError);
          return new Response(
            JSON.stringify({ error: `Failed to create user account: ${authError.message}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        targetAuthUserId = authUser.user?.id ?? null;
        console.log(`Created auth user: ${targetAuthUserId} for email: ${userData.email}`);

        // Wait briefly for triggers to run
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Send password reset email so user can set their password
        try {
          const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: userData.email,
            options: {
              // Prefer configured app base URL if set, otherwise fall back to request origin
              redirectTo: (await (async () => {
                const origin = req.headers.get('origin') || 'https://members.hessconsortium.app';
                return `${origin}/auth`;
              })())
            }
          });

          if (resetError) {
            console.error('Error sending password reset email:', resetError);
          } else {
            console.log('Sent password reset email');
          }
        } catch (emailError) {
          console.error('Error with password reset email:', emailError);
        }
      } else {
        targetAuthUserId = existingUser.user.id;
        console.log(`User already exists for: ${userData.email} (${targetAuthUserId})`);
      }

      // Find the profile for the (new/existing) auth user
      let newProfileId: string | null = null;
      if (targetAuthUserId) {
        const { data: profileRow, error: profileErr } = await supabaseAdmin
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('user_id', targetAuthUserId)
          .maybeSingle();

        if (profileErr) {
          console.error('Error fetching new profile:', profileErr);
        }
        newProfileId = profileRow?.id ?? null;
      }

      // If we have a profile id, assign as new contact_person_id
      if (newProfileId) {
        (updateFields as any).contact_person_id = newProfileId;
      }

      // Replace organization data (full overwrite semantics with preserved admin fields)
      const { data: existingOrg } = await supabaseAdmin
        .from('organizations')
        .select('membership_status, membership_start_date, membership_end_date, annual_fee_amount')
        .eq('id', reassignmentReq.organization_id)
        .maybeSingle();

      const replaceableKeys = [
        'name','student_fte','address_line_1','address_line_2','city','state','zip_code','phone','email','website',
        'primary_contact_title','secondary_first_name','secondary_last_name','secondary_contact_title','secondary_contact_email',
        'student_information_system','financial_system','financial_aid','hcm_hr','payroll_system','purchasing_system',
        'housing_management','learning_management','admissions_crm','alumni_advancement_crm','primary_office_apple',
        'primary_office_asus','primary_office_dell','primary_office_hp','primary_office_microsoft','primary_office_other',
        'primary_office_other_details','other_software_comments','contact_person_id'
      ];

      // Start with nulls for all replaceable keys, then apply submitted data
      const replacement: Record<string, any> = Object.fromEntries(
        replaceableKeys.map((k) => [k, null])
      );
      for (const [k, v] of Object.entries(updateFields)) {
        if (replaceableKeys.includes(k)) replacement[k] = v;
      }
      if (newProfileId) replacement.contact_person_id = newProfileId;

      const finalUpdate = {
        ...replacement,
        membership_status: existingOrg?.membership_status ?? 'pending',
        membership_start_date: existingOrg?.membership_start_date ?? null,
        membership_end_date: existingOrg?.membership_end_date ?? null,
        annual_fee_amount: existingOrg?.annual_fee_amount ?? null,
      };

      const { error: updateOrgError } = await supabaseAdmin
        .from('organizations')
        .update(finalUpdate)
        .eq('id', reassignmentReq.organization_id);

      if (updateOrgError) {
        console.error('Error updating organization:', updateOrgError);
        return new Response(
          JSON.stringify({ error: `Failed to update organization: ${updateOrgError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Update the organization data without creating a user
      const newOrgData = reassignmentReq.new_organization_data || {};
      const allowedKeys = [
        'name','student_fte','address_line_1','address_line_2','city','state','zip_code','phone','email','website',
        'primary_contact_title','secondary_first_name','secondary_last_name','secondary_contact_title','secondary_contact_email',
        'student_information_system','financial_system','financial_aid','hcm_hr','payroll_system','purchasing_system',
        'housing_management','learning_management','admissions_crm','alumni_advancement_crm','primary_office_apple',
        'primary_office_asus','primary_office_dell','primary_office_hp','primary_office_microsoft','primary_office_other',
        'primary_office_other_details','other_software_comments'
      ];
      const updateFields = Object.fromEntries(
        Object.entries(newOrgData).filter(([k]) => allowedKeys.includes(k))
      );

      // Replace organization data (full overwrite semantics, preserve admin fields)
      const { data: existingOrg2 } = await supabaseAdmin
        .from('organizations')
        .select('membership_status, membership_start_date, membership_end_date, annual_fee_amount')
        .eq('id', reassignmentReq.organization_id)
        .maybeSingle();

      const replaceableKeys2 = [
        'name','student_fte','address_line_1','address_line_2','city','state','zip_code','phone','email','website',
        'primary_contact_title','secondary_first_name','secondary_last_name','secondary_contact_title','secondary_contact_email',
        'student_information_system','financial_system','financial_aid','hcm_hr','payroll_system','purchasing_system',
        'housing_management','learning_management','admissions_crm','alumni_advancement_crm','primary_office_apple',
        'primary_office_asus','primary_office_dell','primary_office_hp','primary_office_microsoft','primary_office_other',
        'primary_office_other_details','other_software_comments','contact_person_id'
      ];

      const replacement2: Record<string, any> = Object.fromEntries(
        replaceableKeys2.map((k) => [k, null])
      );
      for (const [k, v] of Object.entries(updateFields)) {
        if (replaceableKeys2.includes(k)) replacement2[k] = v as any;
      }

      const finalUpdate2 = {
        ...replacement2,
        membership_status: existingOrg2?.membership_status ?? 'pending',
        membership_start_date: existingOrg2?.membership_start_date ?? null,
        membership_end_date: existingOrg2?.membership_end_date ?? null,
        annual_fee_amount: existingOrg2?.annual_fee_amount ?? null,
      };

      const { error: updateOrgError } = await supabaseAdmin
        .from('organizations')
        .update(finalUpdate2)
        .eq('id', reassignmentReq.organization_id);

      if (updateOrgError) {
        console.error('Error updating organization:', updateOrgError);
        return new Response(
          JSON.stringify({ error: `Failed to update organization: ${updateOrgError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update the reassignment request status
    const { error: updateError } = await supabaseAdmin
      .from('organization_reassignment_requests')
      .update({
        status: 'approved',
        approved_by: adminUserId,
        approved_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating reassignment request status:', updateError);
      // Don't return error here as user is already created
    }

    // Send profile update approval email only
    try {
      const orgDataForEmail = reassignmentReq.new_organization_data || {};
      const primaryContactName = `${reassignmentReq.user_registration_data?.first_name || ''} ${reassignmentReq.user_registration_data?.last_name || ''}`.trim() || 'Member';
      await supabaseAdmin.functions.invoke('organization-emails', {
        body: {
          type: 'profile_update_approved',
          to: reassignmentReq.new_contact_email,
          organizationName: orgDataForEmail?.name || 'Organization',
          secondaryEmail: orgDataForEmail?.secondary_contact_email,
          organizationData: {
            primary_contact_name: primaryContactName,
            secondary_first_name: orgDataForEmail?.secondary_first_name,
            secondary_last_name: orgDataForEmail?.secondary_last_name,
            secondary_contact_title: orgDataForEmail?.secondary_contact_title,
            secondary_contact_email: orgDataForEmail?.secondary_contact_email,
            primary_contact_title: orgDataForEmail?.primary_contact_title,
            student_fte: orgDataForEmail?.student_fte,
            address_line_1: orgDataForEmail?.address_line_1,
            city: orgDataForEmail?.city,
            state: orgDataForEmail?.state,
            zip_code: orgDataForEmail?.zip_code,
            phone: orgDataForEmail?.phone,
            email: orgDataForEmail?.email,
            website: orgDataForEmail?.website,
            student_information_system: orgDataForEmail?.student_information_system,
            financial_system: orgDataForEmail?.financial_system,
            financial_aid: orgDataForEmail?.financial_aid,
            hcm_hr: orgDataForEmail?.hcm_hr,
            payroll_system: orgDataForEmail?.payroll_system,
            purchasing_system: orgDataForEmail?.purchasing_system,
            housing_management: orgDataForEmail?.housing_management,
            learning_management: orgDataForEmail?.learning_management,
            admissions_crm: orgDataForEmail?.admissions_crm,
            alumni_advancement_crm: orgDataForEmail?.alumni_advancement_crm,
            primary_office_apple: orgDataForEmail?.primary_office_apple,
            primary_office_asus: orgDataForEmail?.primary_office_asus,
            primary_office_dell: orgDataForEmail?.primary_office_dell,
            primary_office_hp: orgDataForEmail?.primary_office_hp,
            primary_office_microsoft: orgDataForEmail?.primary_office_microsoft,
            primary_office_other: orgDataForEmail?.primary_office_other,
            primary_office_other_details: orgDataForEmail?.primary_office_other_details,
            other_software_comments: orgDataForEmail?.other_software_comments,
          }
        }
      });
      console.log('Sent profile update approval email');
    } catch (emailError) {
      console.error('Error sending profile update approval email:', emailError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Reassignment request approved successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});