import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessRegistrationUpdateRequest {
  registrationUpdateId: string;
  adminUserId: string;
  action: 'approve' | 'reject';
  adminNotes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { registrationUpdateId, adminUserId, action, adminNotes }: ProcessRegistrationUpdateRequest = await req.json();

    console.log(`Processing registration update: ${registrationUpdateId} with action: ${action}`);

    // Validate required parameters
    if (!registrationUpdateId) {
      return new Response(
        JSON.stringify({ error: "Registration update ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!adminUserId) {
      return new Response(
        JSON.stringify({ error: "Admin user ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Valid action (approve/reject) is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the requesting user is actually an admin
    const { data: adminRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUserId)
      .eq('role', 'admin')
      .single();

    if (roleError || !adminRole) {
      console.error(`Unauthorized access attempt by user: ${adminUserId}`);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    console.log(`Admin verification successful for user: ${adminUserId}`);

    // Fetch the registration update
    const { data: registrationUpdate, error: fetchError } = await supabase
      .from('member_registration_updates')
      .select('*')
      .eq('id', registrationUpdateId)
      .eq('status', 'pending')
      .single();

    if (fetchError || !registrationUpdate) {
      console.error('Registration update not found:', fetchError);
      return new Response(
        JSON.stringify({ error: "Registration update not found or already processed" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === 'reject') {
      // Simply mark as rejected
      const { error: updateError } = await supabase
        .from('member_registration_updates')
        .update({
          status: 'rejected',
          reviewed_by: adminUserId,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes
        })
        .eq('id', registrationUpdateId);

      if (updateError) {
        console.error('Failed to reject registration update:', updateError);
        return new Response(
          JSON.stringify({ error: "Failed to reject registration update" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Get organization name for logging
      const registrationData = registrationUpdate.registration_data as any;
      const organizationData = registrationUpdate.organization_data as any;
      const organizationName = organizationData.name || 
                               registrationUpdate.existing_organization_name || 
                               registrationData.organization || 
                               registrationData.organization_name ||
                               'Unknown Organization';

      // Log the rejection
      await supabase.from('audit_log').insert({
        action: 'member_registration_rejected',
        entity_type: 'member_registration_update',
        entity_id: registrationUpdateId,
        user_id: adminUserId,
        details: {
          submitted_email: registrationUpdate.submitted_email,
          organization_name: organizationName,
          rejection_reason: adminNotes
        }
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Registration update rejected successfully" 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Handle approval - determine if this is an update to existing organization or new registration
    const registrationData = registrationUpdate.registration_data as any;
    const organizationData = registrationUpdate.organization_data as any;

    // Determine the organization name from multiple sources
    const organizationName = organizationData.name || 
                             registrationUpdate.existing_organization_name || 
                             registrationData.organization || 
                             registrationData.organization_name ||
                             'Unknown Organization';

    console.log('Processing approval for:', {
      email: registrationUpdate.submitted_email,
      organizationName: organizationName,
      organizationDataName: organizationData.name,
      existingOrgName: registrationUpdate.existing_organization_name,
      registrationDataOrg: registrationData.organization,
      submissionType: registrationUpdate.submission_type,
      existingOrgId: registrationUpdate.existing_organization_id
    });

    // Check if this is a member update (existing organization) or new registration
    const isUpdate = registrationUpdate.submission_type === 'member_update' && registrationUpdate.existing_organization_id;
    
    // Declare variables that will be used in audit logging
    let newOrganization: any;
    let newUser: any;
    let existingOrganization: any = null;

    if (isUpdate) {
      console.log('Processing as member update for existing organization:', registrationUpdate.existing_organization_id);
      
      // Step 1: Get existing organization and its contact person
      const { data: existingOrganization, error: orgFetchError } = await supabase
        .from('organizations')
        .select('*, contact_person_id')
        .eq('id', registrationUpdate.existing_organization_id)
        .single();

      if (orgFetchError || !existingOrganization) {
        console.error('Failed to fetch existing organization:', orgFetchError);
        return new Response(
          JSON.stringify({ error: "Existing organization not found" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Step 2: Get existing profile
      const { data: existingProfile, error: profileFetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', existingOrganization.contact_person_id)
        .single();

      if (profileFetchError || !existingProfile) {
        console.error('Failed to fetch existing profile:', profileFetchError);
        return new Response(
          JSON.stringify({ error: "Existing profile not found" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Step 3: Update existing organization with new data
      const { error: orgUpdateError } = await supabase
        .from('organizations')
        .update({
          name: organizationName,
          student_fte: organizationData.student_fte,
          address_line_1: organizationData.address_line_1 || registrationData.address,
          address_line_2: organizationData.address_line_2,
          city: organizationData.city || registrationData.city,
          state: organizationData.state || registrationData.state,
          zip_code: organizationData.zip_code || registrationData.zip,
          country: organizationData.country || 'United States',
          phone: organizationData.phone || registrationData.phone,
          email: organizationData.email || registrationData.email,
          website: organizationData.website,
          notes: organizationData.notes,
          primary_contact_title: registrationData.primary_contact_title,
          secondary_first_name: registrationData.secondary_first_name,
          secondary_last_name: registrationData.secondary_last_name,
          secondary_contact_title: registrationData.secondary_contact_title,
          secondary_contact_email: registrationData.secondary_contact_email,
          secondary_contact_phone: registrationData.secondary_contact_phone || registrationUpdate.secondary_contact_phone,
          student_information_system: registrationData.student_information_system,
          financial_system: registrationData.financial_system,
          financial_aid: registrationData.financial_aid,
          hcm_hr: registrationData.hcm_hr,
          payroll_system: registrationData.payroll_system,
          purchasing_system: registrationData.purchasing_system,
          housing_management: registrationData.housing_management,
          learning_management: registrationData.learning_management,
          admissions_crm: registrationData.admissions_crm,
          alumni_advancement_crm: registrationData.alumni_advancement_crm,
          payment_platform: registrationData.payment_platform,
          meal_plan_management: registrationData.meal_plan_management,
          identity_management: registrationData.identity_management,
          door_access: registrationData.door_access,
          document_management: registrationData.document_management,
          voip: registrationData.voip || registrationUpdate.voip,
          network_infrastructure: registrationData.network_infrastructure || registrationUpdate.network_infrastructure,
          approximate_date_joined_hess: registrationData.approximate_date_joined_hess || registrationUpdate.approximate_date_joined_hess,
          partner_program_interest: organizationData.partner_program_interest || [],
          primary_office_apple: registrationData.primary_office_apple || false,
          primary_office_lenovo: registrationData.primary_office_lenovo || false,
          primary_office_dell: registrationData.primary_office_dell || false,
          primary_office_hp: registrationData.primary_office_hp || false,
          primary_office_microsoft: registrationData.primary_office_microsoft || false,
          primary_office_other: registrationData.primary_office_other || false,
          primary_office_other_details: registrationData.primary_office_other_details,
          other_software_comments: registrationData.other_software_comments,
          updated_at: new Date().toISOString()
        })
        .eq('id', registrationUpdate.existing_organization_id);

      if (orgUpdateError) {
        console.error('Failed to update organization:', orgUpdateError);
        return new Response(
          JSON.stringify({ error: `Failed to update organization: ${orgUpdateError.message}` }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Step 4: Update existing profile with contact person data only
      // Note: All system fields are stored in organizations table, not profiles
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          first_name: registrationData.first_name,
          last_name: registrationData.last_name,
          email: registrationData.email,
          phone: registrationData.phone,
          organization: organizationName,
          primary_contact_title: registrationData.primary_contact_title,
          secondary_first_name: registrationData.secondary_first_name,
          secondary_last_name: registrationData.secondary_last_name,
          secondary_contact_title: registrationData.secondary_contact_title,
          secondary_contact_email: registrationData.secondary_contact_email,
          secondary_contact_phone: registrationData.secondary_contact_phone || registrationUpdate.secondary_contact_phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingOrganization.contact_person_id);

      if (profileUpdateError) {
        console.error('Failed to update profile:', profileUpdateError);
        return new Response(
          JSON.stringify({ error: `Failed to update profile: ${profileUpdateError.message}` }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log('Organization and profile updated successfully');

      // Use existing organization and profile IDs for logging
      newOrganization = { id: registrationUpdate.existing_organization_id };
      newUser = { user: { id: existingProfile.user_id } };

    } else {
      console.log('Processing as new registration - creating new organization and user');

      // Step 1: Find existing organization by name to potentially replace it
      let existingOrganization = null;
      if (organizationName && organizationName !== 'Unknown Organization') {
        // Try to find by organization name
        const { data } = await supabase
          .from('organizations')
          .select('*')
          .ilike('name', organizationName)
          .single();
        existingOrganization = data;
      }

      // Step 2: If organization exists, delete it and all associated data using the existing delete function
      if (existingOrganization) {
        console.log(`Deleting existing organization: ${existingOrganization.name} (${existingOrganization.id})`);
        
        try {
          const { data: deleteResult, error: deleteError } = await supabase.functions.invoke('delete-organization', {
            body: {
              organizationId: existingOrganization.id,
              adminUserId: adminUserId
            }
          });

          if (deleteError) {
            console.error('Failed to delete existing organization:', deleteError);
            throw new Error(`Failed to delete existing organization: ${deleteError.message}`);
          }

          console.log('Organization deleted successfully:', deleteResult);
        } catch (error) {
          console.error('Delete organization function error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return new Response(
            JSON.stringify({ error: `Failed to delete existing organization: ${errorMessage}` }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }

      // Step 3: Create new user account
      console.log('Creating new user account...');
      
      const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
        email: registrationData.email,
        password: registrationData.password || crypto.randomUUID(), // Generate random password if none provided
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          first_name: registrationData.first_name,
          last_name: registrationData.last_name,
          organization: organizationData.name,
          ...registrationData // Include all registration data in user metadata
        }
      });

      if (userError || !newUser.user) {
        console.error('Failed to create user:', userError);
        return new Response(
          JSON.stringify({ error: `Failed to create user account: ${userError?.message}` }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log('User created successfully:', newUser.user.id);

      // Step 4: Create profile for the new user (contact person data only)
      // Note: All system fields are stored in organizations table, not profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: newUser.user.id,
          first_name: registrationData.first_name,
          last_name: registrationData.last_name,
          email: registrationData.email,
          phone: registrationData.phone,
          organization: organizationName,
          primary_contact_title: registrationData.primary_contact_title,
          secondary_first_name: registrationData.secondary_first_name,
          secondary_last_name: registrationData.secondary_last_name,
          secondary_contact_title: registrationData.secondary_contact_title,
          secondary_contact_email: registrationData.secondary_contact_email,
          secondary_contact_phone: registrationData.secondary_contact_phone || registrationUpdate.secondary_contact_phone
        })
        .select()
        .single();

      if (profileError) {
        console.error('Failed to create profile:', profileError);
        // Don't fail the entire process, the trigger might have created it
      }

      const profileId = profile?.id || (await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', newUser.user.id)
        .single()).data?.id;

      if (!profileId) {
        console.error('No profile found after creation attempt');
        return new Response(
          JSON.stringify({ error: "Failed to create user profile" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Step 5: Create new organization
      console.log('Creating new organization...');
      
      const { data: newOrganization, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: organizationName,
          contact_person_id: profileId,
          student_fte: organizationData.student_fte,
          address_line_1: organizationData.address_line_1 || registrationData.address,
          address_line_2: organizationData.address_line_2,
          city: organizationData.city || registrationData.city,
          state: organizationData.state || registrationData.state,
          zip_code: organizationData.zip_code || registrationData.zip,
          country: organizationData.country || 'United States',
          phone: organizationData.phone || registrationData.phone,
          email: organizationData.email || registrationData.email,
          website: organizationData.website,
          notes: organizationData.notes,
          primary_contact_title: registrationData.primary_contact_title,
          secondary_first_name: registrationData.secondary_first_name,
          secondary_last_name: registrationData.secondary_last_name,
          secondary_contact_title: registrationData.secondary_contact_title,
          secondary_contact_email: registrationData.secondary_contact_email,
          secondary_contact_phone: registrationData.secondary_contact_phone || registrationUpdate.secondary_contact_phone,
          student_information_system: registrationData.student_information_system,
          financial_system: registrationData.financial_system,
          financial_aid: registrationData.financial_aid,
          hcm_hr: registrationData.hcm_hr,
          payroll_system: registrationData.payroll_system,
          purchasing_system: registrationData.purchasing_system,
          housing_management: registrationData.housing_management,
          learning_management: registrationData.learning_management,
          admissions_crm: registrationData.admissions_crm,
          alumni_advancement_crm: registrationData.alumni_advancement_crm,
          payment_platform: registrationData.payment_platform,
          meal_plan_management: registrationData.meal_plan_management,
          identity_management: registrationData.identity_management,
          door_access: registrationData.door_access,
          document_management: registrationData.document_management,
          voip: registrationData.voip || registrationUpdate.voip,
          network_infrastructure: registrationData.network_infrastructure || registrationUpdate.network_infrastructure,
          approximate_date_joined_hess: registrationData.approximate_date_joined_hess || registrationUpdate.approximate_date_joined_hess,
          partner_program_interest: organizationData.partner_program_interest || [],
          primary_office_apple: registrationData.primary_office_apple || false,
          primary_office_lenovo: registrationData.primary_office_lenovo || false,
          primary_office_dell: registrationData.primary_office_dell || false,
          primary_office_hp: registrationData.primary_office_hp || false,
          primary_office_microsoft: registrationData.primary_office_microsoft || false,
          primary_office_other: registrationData.primary_office_other || false,
          primary_office_other_details: registrationData.primary_office_other_details,
          other_software_comments: registrationData.other_software_comments,
          membership_status: 'active',
          annual_fee_amount: organizationData.annual_fee_amount || 1000.00
        })
        .select()
        .single();

      if (orgError) {
        console.error('Failed to create organization:', orgError);
        return new Response(
          JSON.stringify({ error: `Failed to create organization: ${orgError.message}` }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log('Organization created successfully:', newOrganization.id);

      // Step 6: Assign user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: newUser.user.id,
          role: 'member'
        });

      if (roleError) {
        console.error('Failed to assign user role:', roleError);
        // Don't fail the process, the trigger might have handled it
      }
    }

    // Step 7: Mark registration update as approved
    const { error: updateError } = await supabase
      .from('member_registration_updates')
      .update({
        status: 'approved',
        reviewed_by: adminUserId,
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes
      })
      .eq('id', registrationUpdateId);

    if (updateError) {
      console.error('Failed to mark registration update as approved:', updateError);
    }

    // Step 8: Build update details for the email notification
    const updateDetails = [];
    
    if (isUpdate && existingOrganization) {
      // Compare existing vs new data and build a list of changes
      const fieldsToCheck = [
        { key: 'name', label: 'Organization Name' },
        { key: 'student_fte', label: 'Student FTE' },
        { key: 'address_line_1', label: 'Address' },
        { key: 'city', label: 'City' },
        { key: 'state', label: 'State' },
        { key: 'zip_code', label: 'ZIP Code' },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email' },
        { key: 'primary_contact_title', label: 'Primary Contact Title' },
        { key: 'secondary_first_name', label: 'Secondary Contact First Name' },
        { key: 'secondary_last_name', label: 'Secondary Contact Last Name' },
        { key: 'secondary_contact_title', label: 'Secondary Contact Title' },
        { key: 'secondary_contact_email', label: 'Secondary Contact Email' },
        { key: 'student_information_system', label: 'Student Information System' },
        { key: 'financial_system', label: 'Financial System' },
        { key: 'financial_aid', label: 'Financial Aid System' },
        { key: 'hcm_hr', label: 'HCM/HR System' },
        { key: 'payroll_system', label: 'Payroll System' },
        { key: 'purchasing_system', label: 'Purchasing System' },
        { key: 'housing_management', label: 'Housing Management System' },
        { key: 'learning_management', label: 'Learning Management System' },
        { key: 'admissions_crm', label: 'Admissions CRM' },
        { key: 'alumni_advancement_crm', label: 'Alumni/Advancement CRM' }
      ];

      fieldsToCheck.forEach(field => {
        const newValue = organizationData[field.key] || registrationData[field.key];
        const oldValue = existingOrganization[field.key];
        
        if (newValue && newValue !== oldValue) {
          updateDetails.push(`- ${field.label}: ${newValue}`);
        }
      });

      // Check boolean fields
      const booleanFields = [
        { key: 'primary_office_apple', label: 'Apple Office Software' },
        { key: 'primary_office_lenovo', label: 'Lenovo Office Computers' },
        { key: 'primary_office_dell', label: 'Dell Office Software' },
        { key: 'primary_office_hp', label: 'HP Office Software' },
        { key: 'primary_office_microsoft', label: 'Microsoft Office Software' },
        { key: 'primary_office_other', label: 'Other Office Software' }
      ];

      booleanFields.forEach(field => {
        const newValue = registrationData[field.key] || false;
        const oldValue = existingOrganization[field.key] || false;
        
        if (newValue !== oldValue) {
          updateDetails.push(`- ${field.label}: ${newValue ? 'Yes' : 'No'}`);
        }
      });

      if (registrationData.primary_office_other_details && 
          registrationData.primary_office_other_details !== existingOrganization.primary_office_other_details) {
        updateDetails.push(`- Other Office Software Details: ${registrationData.primary_office_other_details}`);
      }

      if (registrationData.other_software_comments && 
          registrationData.other_software_comments !== existingOrganization.other_software_comments) {
        updateDetails.push(`- Additional Software Comments: ${registrationData.other_software_comments}`);
      }
    } else {
      updateDetails.push('- New organization registration approved');
      updateDetails.push(`- Organization Name: ${organizationName}`);
      updateDetails.push(`- Primary Contact: ${registrationData.first_name} ${registrationData.last_name}`);
      updateDetails.push(`- Email: ${registrationData.email}`);
    }

    // Step 9: Send profile update approval email using centralized email delivery
    try {
      const { data: emailResult, error: emailError } = await supabase.functions.invoke('centralized-email-delivery', {
        body: {
          type: 'member_info_update',
          to: registrationData.email,
          data: {
            first_name: registrationData.first_name,
            last_name: registrationData.last_name,
            organization_name: organizationName,
            update_details: updateDetails.length > 0 ? updateDetails.join('\n') : 'Profile information updated'
          }
        }
      });

      if (emailError) {
        console.error('Failed to send approval email:', emailError);
        // Don't fail the entire process for email issues
      } else {
        console.log('Approval email sent successfully');
      }
    } catch (emailErr) {
      console.error('Email function error:', emailErr);
    }

    // Step 9: Log the approval
    await supabase.from('audit_log').insert({
      action: isUpdate ? 'member_profile_updated' : 'member_registration_approved',
      entity_type: 'member_registration_update',
      entity_id: registrationUpdateId,
      user_id: adminUserId,
      details: {
        submitted_email: registrationUpdate.submitted_email,
        organization_name: organizationName,
        user_id: newUser.user.id,
        organization_id: newOrganization.id,
        is_update: isUpdate,
        replaced_organization_id: isUpdate ? null : existingOrganization?.id
      }
    });

    // Step 10: Refresh analytics datacube
    try {
      await supabase.functions.invoke('refresh-analytics-datacube');
    } catch (error) {
      console.error('Failed to refresh analytics:', error);
      // Don't fail the process for analytics refresh
    }

    console.log(`Member registration ${isUpdate ? 'update' : 'approval'} processed successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Member registration ${isUpdate ? 'update' : 'approval'} processed successfully`,
        details: {
          userId: newUser.user.id,
          organizationId: newOrganization.id,
          organizationName: organizationName,
          contactEmail: registrationData.email,
          isUpdate: isUpdate,
          replacedExisting: isUpdate ? false : !!existingOrganization
        }
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("Error in process-member-registration-update function:", error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: errorMessage
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);