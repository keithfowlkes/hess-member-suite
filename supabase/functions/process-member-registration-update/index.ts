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

      // Log the rejection
      await supabase.from('audit_log').insert({
        action: 'member_registration_rejected',
        entity_type: 'member_registration_update',
        entity_id: registrationUpdateId,
        user_id: adminUserId,
        details: {
          submitted_email: registrationUpdate.submitted_email,
          organization_name: registrationUpdate.organization_data?.name,
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

    // Handle approval - this is the complex atomic replacement process
    const registrationData = registrationUpdate.registration_data as any;
    const organizationData = registrationUpdate.organization_data as any;

    console.log('Processing approval for:', {
      email: registrationUpdate.submitted_email,
      organizationName: organizationData.name
    });

    // Step 1: Find existing organization by name or email
    let existingOrganization = null;
    if (registrationUpdate.existing_organization_id) {
      const { data } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', registrationUpdate.existing_organization_id)
        .single();
      existingOrganization = data;
    } else if (organizationData.name) {
      // Try to find by organization name
      const { data } = await supabase
        .from('organizations')
        .select('*')
        .ilike('name', organizationData.name)
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
        return new Response(
          JSON.stringify({ error: `Failed to delete existing organization: ${error.message}` }),
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

    // Step 4: Create profile for the new user (this should happen via trigger, but let's ensure it)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: newUser.user.id,
        first_name: registrationData.first_name,
        last_name: registrationData.last_name,
        email: registrationData.email,
        phone: registrationData.phone,
        organization: organizationData.name,
        state_association: registrationData.state_association,
        address: registrationData.address,
        city: registrationData.city,
        state: registrationData.state,
        zip: registrationData.zip,
        primary_contact_title: registrationData.primary_contact_title,
        secondary_first_name: registrationData.secondary_first_name,
        secondary_last_name: registrationData.secondary_last_name,
        secondary_contact_title: registrationData.secondary_contact_title,
        secondary_contact_email: registrationData.secondary_contact_email,
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
        student_fte: organizationData.student_fte,
        primary_office_apple: registrationData.primary_office_apple || false,
        primary_office_asus: registrationData.primary_office_asus || false,
        primary_office_dell: registrationData.primary_office_dell || false,
        primary_office_hp: registrationData.primary_office_hp || false,
        primary_office_microsoft: registrationData.primary_office_microsoft || false,
        primary_office_other: registrationData.primary_office_other || false,
        primary_office_other_details: registrationData.primary_office_other_details,
        other_software_comments: registrationData.other_software_comments,
        is_private_nonprofit: registrationData.is_private_nonprofit || false
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
        name: organizationData.name,
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
        primary_office_apple: registrationData.primary_office_apple || false,
        primary_office_asus: registrationData.primary_office_asus || false,
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

    // Step 8: Send welcome email using centralized email delivery
    try {
      const { data: emailResult, error: emailError } = await supabase.functions.invoke('centralized-email-delivery', {
        body: {
          type: 'welcome_approved',
          to: registrationData.email,
          data: {
            organization_name: organizationData.name,
            primary_contact_name: `${registrationData.first_name} ${registrationData.last_name}`,
            custom_message: 'Your member registration has been approved and your organization has been updated in our system.'
          }
        }
      });

      if (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the entire process for email issues
      } else {
        console.log('Welcome email sent successfully');
      }
    } catch (emailErr) {
      console.error('Email function error:', emailErr);
    }

    // Step 9: Log the approval
    await supabase.from('audit_log').insert({
      action: 'member_registration_approved',
      entity_type: 'member_registration_update',
      entity_id: registrationUpdateId,
      user_id: adminUserId,
      details: {
        submitted_email: registrationUpdate.submitted_email,
        organization_name: organizationData.name,
        new_user_id: newUser.user.id,
        new_organization_id: newOrganization.id,
        replaced_organization_id: existingOrganization?.id
      }
    });

    // Step 10: Refresh analytics datacube
    try {
      await supabase.functions.invoke('refresh-analytics-datacube');
    } catch (error) {
      console.error('Failed to refresh analytics:', error);
      // Don't fail the process for analytics refresh
    }

    console.log('Member registration update processed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: "Member registration update processed successfully",
        details: {
          newUserId: newUser.user.id,
          newOrganizationId: newOrganization.id,
          organizationName: organizationData.name,
          contactEmail: registrationData.email,
          replacedExisting: !!existingOrganization
        }
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("Error in process-member-registration-update function:", error);
    
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);