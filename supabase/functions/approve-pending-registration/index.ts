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

    const { registrationId, adminUserId } = await req.json();
    
    if (!registrationId || !adminUserId) {
      return new Response(
        JSON.stringify({ error: 'Missing registrationId or adminUserId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing approval for registration: ${registrationId} by admin: ${adminUserId}`);

    // Get the pending registration
    const { data: pendingReg, error: fetchError } = await supabaseAdmin
      .from('pending_registrations')
      .select('*')
      .eq('id', registrationId)
      .eq('approval_status', 'pending')
      .single();

    if (fetchError || !pendingReg) {
      console.error('Error fetching pending registration:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Pending registration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found pending registration for: ${pendingReg.email}`);

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return new Response(
        JSON.stringify({ error: 'Failed to check existing users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const existingUser = existingUsers.users.find(user => user.email === pendingReg.email);
    
    let authUser;
    
    if (existingUser) {
      console.log(`User already exists for email: ${pendingReg.email}, updating user metadata`);
      
      // Update existing user's metadata
      const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          user_metadata: {
            ...existingUser.user_metadata,
            first_name: pendingReg.first_name,
            last_name: pendingReg.last_name,
            organization: pendingReg.organization_name,
            state_association: pendingReg.state_association,
            student_fte: pendingReg.student_fte?.toString(),
            address: pendingReg.address,
            city: pendingReg.city,
            state: pendingReg.state,
            zip: pendingReg.zip,
            primary_contact_title: pendingReg.primary_contact_title,
            secondary_first_name: pendingReg.secondary_first_name,
            secondary_last_name: pendingReg.secondary_last_name,
            secondary_contact_title: pendingReg.secondary_contact_title,
            secondary_contact_email: pendingReg.secondary_contact_email,
            student_information_system: pendingReg.student_information_system,
            financial_system: pendingReg.financial_system,
            financial_aid: pendingReg.financial_aid,
            hcm_hr: pendingReg.hcm_hr,
            payroll_system: pendingReg.payroll_system,
            purchasing_system: pendingReg.purchasing_system,
            housing_management: pendingReg.housing_management,
            learning_management: pendingReg.learning_management,
            admissions_crm: pendingReg.admissions_crm,
            alumni_advancement_crm: pendingReg.alumni_advancement_crm,
            primary_office_apple: pendingReg.primary_office_apple,
            primary_office_asus: pendingReg.primary_office_asus,
            primary_office_dell: pendingReg.primary_office_dell,
            primary_office_hp: pendingReg.primary_office_hp,
            primary_office_microsoft: pendingReg.primary_office_microsoft,
            primary_office_other: pendingReg.primary_office_other,
            primary_office_other_details: pendingReg.primary_office_other_details,
            other_software_comments: pendingReg.other_software_comments,
            isPrivateNonProfit: pendingReg.is_private_nonprofit,
          }
        }
      );

      if (updateError) {
        console.error('Error updating existing user:', updateError);
        return new Response(
          JSON.stringify({ error: `Failed to update existing user: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      authUser = { user: updatedUser.user };
    } else {
      console.log(`Creating new user for email: ${pendingReg.email}`);
      
      // Create the auth user using their original password
      const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: pendingReg.email,
      password: pendingReg.password_hash, // Use the password they set during registration
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        first_name: pendingReg.first_name,
        last_name: pendingReg.last_name,
        organization: pendingReg.organization_name,
        state_association: pendingReg.state_association,
        student_fte: pendingReg.student_fte?.toString(),
        address: pendingReg.address,
        city: pendingReg.city,
        state: pendingReg.state,
        zip: pendingReg.zip,
        primary_contact_title: pendingReg.primary_contact_title,
        secondary_first_name: pendingReg.secondary_first_name,
        secondary_last_name: pendingReg.secondary_last_name,
        secondary_contact_title: pendingReg.secondary_contact_title,
        secondary_contact_email: pendingReg.secondary_contact_email,
        student_information_system: pendingReg.student_information_system,
        financial_system: pendingReg.financial_system,
        financial_aid: pendingReg.financial_aid,
        hcm_hr: pendingReg.hcm_hr,
        payroll_system: pendingReg.payroll_system,
        purchasing_system: pendingReg.purchasing_system,
        housing_management: pendingReg.housing_management,
        learning_management: pendingReg.learning_management,
        admissions_crm: pendingReg.admissions_crm,
        alumni_advancement_crm: pendingReg.alumni_advancement_crm,
        primary_office_apple: pendingReg.primary_office_apple,
        primary_office_asus: pendingReg.primary_office_asus,
        primary_office_dell: pendingReg.primary_office_dell,
        primary_office_hp: pendingReg.primary_office_hp,
        primary_office_microsoft: pendingReg.primary_office_microsoft,
        primary_office_other: pendingReg.primary_office_other,
        primary_office_other_details: pendingReg.primary_office_other_details,
        other_software_comments: pendingReg.other_software_comments,
        isPrivateNonProfit: pendingReg.is_private_nonprofit,
        }
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        return new Response(
          JSON.stringify({ error: `Failed to create user account: ${authError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      authUser = { user: newUser.user };
    }

    console.log(`Processed auth user: ${authUser.user?.id} for email: ${pendingReg.email}`);

    // The handle_new_user trigger will automatically create the profile and organization
    // We just need to wait a moment for it to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get the newly created organization and activate it
    // First check if organization already exists by name AND contact person
    let { data: newOrganization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, email, contact_person_id, profiles:contact_person_id(user_id)')
      .eq('name', pendingReg.organization_name)
      .single();

    // Check if the found organization belongs to the current user
    let shouldCreateNew = true;
    if (!orgError && newOrganization && newOrganization.profiles?.user_id === authUser.user?.id) {
      console.log('Found existing organization for same user');
      shouldCreateNew = false;
    } else if (!orgError && newOrganization) {
      console.log('Found organization with same name but different user - will create new one');
      shouldCreateNew = true;
    }

    // If organization doesn't exist for this user, create it manually
    if (shouldCreateNew) {
      console.log('Organization not found, creating manually...');
      
      // Get the profile ID for the user
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', authUser.user?.id)
        .single();

      if (profile) {
        const { data: createdOrg, error: createError } = await supabaseAdmin
          .from('organizations')
          .insert({
            name: pendingReg.organization_name,
            contact_person_id: profile.id,
            student_fte: pendingReg.student_fte,
            address_line_1: pendingReg.address,
            city: pendingReg.city,
            state: pendingReg.state,
            zip_code: pendingReg.zip,
            email: pendingReg.email,
            primary_contact_title: pendingReg.primary_contact_title,
            secondary_first_name: pendingReg.secondary_first_name,
            secondary_last_name: pendingReg.secondary_last_name,
            secondary_contact_title: pendingReg.secondary_contact_title,
            secondary_contact_email: pendingReg.secondary_contact_email,
            student_information_system: pendingReg.student_information_system,
            financial_system: pendingReg.financial_system,
            financial_aid: pendingReg.financial_aid,
            hcm_hr: pendingReg.hcm_hr,
            payroll_system: pendingReg.payroll_system,
            purchasing_system: pendingReg.purchasing_system,
            housing_management: pendingReg.housing_management,
            learning_management: pendingReg.learning_management,
            admissions_crm: pendingReg.admissions_crm,
            alumni_advancement_crm: pendingReg.alumni_advancement_crm,
            primary_office_apple: pendingReg.primary_office_apple,
            primary_office_asus: pendingReg.primary_office_asus,
            primary_office_dell: pendingReg.primary_office_dell,
            primary_office_hp: pendingReg.primary_office_hp,
            primary_office_microsoft: pendingReg.primary_office_microsoft,
            primary_office_other: pendingReg.primary_office_other,
            primary_office_other_details: pendingReg.primary_office_other_details,
            other_software_comments: pendingReg.other_software_comments,
            membership_status: 'active',
            membership_start_date: new Date().toISOString().split('T')[0],
            country: 'United States'
          })
          .select('id, name, email')
          .single();

        if (createError) {
          console.error('Error creating organization manually:', createError);
        } else {
          newOrganization = createdOrg;
          console.log(`Organization ${newOrganization.name} created manually`);
        }
      }
    }

    // Only activate organization if one was found or created
    if (newOrganization) {
      // Update organization to active status upon approval
      const { error: updateOrgError } = await supabaseAdmin
        .from('organizations')
        .update({
          membership_status: 'active',
          membership_start_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', newOrganization.id);

      if (updateOrgError) {
        console.error('Error activating organization:', updateOrgError);
      } else {
        console.log(`Organization ${newOrganization.name} activated successfully`);
      }
    }

    // Update the pending registration status
    const { error: updateError } = await supabaseAdmin
      .from('pending_registrations')
      .update({
        approval_status: 'approved',
        approved_by: adminUserId,
        approved_at: new Date().toISOString()
      })
      .eq('id', registrationId);

    if (updateError) {
      console.error('Error updating pending registration status:', updateError);
      // Don't return error here as user is already created
    }

    // User can now log in directly with their original password

    // Send welcome email using organization-emails function
    try {
      if (newOrganization) {
        console.log('Sending welcome email via organization-emails function...');
        
        // Prepare organization data for the welcome email
        const organizationData = {
          primary_contact_name: `${pendingReg.first_name} ${pendingReg.last_name}`,
          primary_contact_title: pendingReg.primary_contact_title || '',
          secondary_first_name: pendingReg.secondary_first_name || '',
          secondary_last_name: pendingReg.secondary_last_name || '',
          secondary_contact_title: pendingReg.secondary_contact_title || '',
          secondary_contact_email: pendingReg.secondary_contact_email || '',
          student_fte: pendingReg.student_fte || 0,
          address_line_1: pendingReg.address || '',
          city: pendingReg.city || '',
          state: pendingReg.state || '',
          zip_code: pendingReg.zip || '',
          phone: '',
          email: pendingReg.email,
          website: '',
          student_information_system: pendingReg.student_information_system || '',
          financial_system: pendingReg.financial_system || '',
          financial_aid: pendingReg.financial_aid || '',
          hcm_hr: pendingReg.hcm_hr || '',
          payroll_system: pendingReg.payroll_system || '',
          purchasing_system: pendingReg.purchasing_system || '',
          housing_management: pendingReg.housing_management || '',
          learning_management: pendingReg.learning_management || '',
          admissions_crm: pendingReg.admissions_crm || '',
          alumni_advancement_crm: pendingReg.alumni_advancement_crm || '',
          primary_office_apple: pendingReg.primary_office_apple || false,
          primary_office_asus: pendingReg.primary_office_asus || false,
          primary_office_dell: pendingReg.primary_office_dell || false,
          primary_office_hp: pendingReg.primary_office_hp || false,
          primary_office_microsoft: pendingReg.primary_office_microsoft || false,
          primary_office_other: pendingReg.primary_office_other || false,
          primary_office_other_details: pendingReg.primary_office_other_details || '',
          other_software_comments: pendingReg.other_software_comments || '',
        };

        await supabaseAdmin.functions.invoke('organization-emails', {
          body: {
            type: 'welcome_approved',
            to: pendingReg.email,
            organizationName: pendingReg.organization_name,
            secondaryEmail: pendingReg.secondary_contact_email,
            organizationData: organizationData
          }
        });
        console.log('Sent welcome email successfully');
      }
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Registration approved and user created successfully',
        userId: authUser.user?.id,
        organizationId: newOrganization?.id // Include organization ID for invoice sending
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