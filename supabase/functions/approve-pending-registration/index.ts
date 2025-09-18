import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    // Check for and clean up any corresponding member registration updates to prevent double approval
    try {
      const { data: memberUpdates, error: memberUpdatesFetchError } = await supabaseAdmin
        .from('member_registration_updates')
        .select('*')
        .eq('submitted_email', pendingReg.email)
        .eq('status', 'pending');

      if (!memberUpdatesFetchError && memberUpdates && memberUpdates.length > 0) {
        console.log(`Found ${memberUpdates.length} pending member registration updates for ${pendingReg.email}, marking as auto-resolved`);
        
        const { error: cleanupError } = await supabaseAdmin
          .from('member_registration_updates')
          .update({
            status: 'approved',
            reviewed_by: adminUserId,
            reviewed_at: new Date().toISOString(),
            admin_notes: 'Auto-resolved: New registration approved, member update no longer needed'
          })
          .eq('submitted_email', pendingReg.email)
          .eq('status', 'pending');

        if (cleanupError) {
          console.warn('Error cleaning up member registration updates:', cleanupError);
        } else {
          console.log('Successfully cleaned up pending member registration updates');
        }
      }
    } catch (cleanupError) {
      console.warn('Error checking for member registration updates to clean up:', cleanupError);
      // Don't fail the approval process if cleanup fails
    }

    const isAdminOrg = /^Administrator/i.test(pendingReg.organization_name || '');
    console.log('isAdminOrg:', isAdminOrg, 'orgName:', pendingReg.organization_name);
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
      
      // Update existing user's metadata and send password reset email
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

      // Set the user's password directly using admin API (password_hash contains plaintext password)
      console.log('Setting user password...');
      try {
        const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          { password: pendingReg.password_hash }
        );

        if (passwordError) {
          console.warn('Could not set user password:', passwordError);
          // Send a password reset email as fallback
          const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: pendingReg.email,
          });
          if (resetError) {
            console.warn('Could not send password reset email:', resetError);
          }
        } else {
          console.log('User password set successfully');
        }
      } catch (passwordUpdateError) {
        console.warn('Error setting user password:', passwordUpdateError);
      }

      authUser = { user: updatedUser.user };
    } else {
      console.log(`Creating new user for email: ${pendingReg.email}`);
      
      // Create the auth user without password first, then set it properly
      const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: pendingReg.email,
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
        
        // Handle the case where user already exists but wasn't found in initial check
        if (authError.message?.includes('already been registered') || authError.code === 'email_exists') {
          console.log('User already exists, switching to existing user flow...');
          
          // Try multiple approaches to find the existing user
          let existingUserRetry = null;
          
          // Approach 1: List users and find by email (with better comparison)
          const { data: existingUsersRetry, error: listErrorRetry } = await supabaseAdmin.auth.admin.listUsers();
          
          if (!listErrorRetry && existingUsersRetry?.users) {
            // Try exact match first
            existingUserRetry = existingUsersRetry.users.find(user => 
              user.email?.toLowerCase() === pendingReg.email.toLowerCase()
            );
            
            // If not found, try broader search
            if (!existingUserRetry) {
              console.log('Exact email match not found, trying broader search...');
              existingUserRetry = existingUsersRetry.users.find(user => 
                user.email?.toLowerCase().includes(pendingReg.email.toLowerCase().split('@')[0])
              );
            }
          }
          
          // Approach 2: Try to get user by email directly (if approach 1 fails)
          if (!existingUserRetry) {
            console.log('User listing approach failed, trying direct email lookup...');
            try {
              const { data: userByEmail, error: emailLookupError } = await supabaseAdmin.auth.admin.getUserById('');
              // This won't work directly, but we can try a different approach
            } catch (e) {
              console.log('Direct email lookup not available');
            }
          }
          
          // Approach 3: Create a minimal profile and let triggers handle user creation
          if (!existingUserRetry) {
            console.log('Could not find existing user, attempting to proceed with profile creation...');
            
            // Instead of failing, let's try to create a profile entry that might help
            // Check if a profile already exists for this email
            const { data: existingProfile, error: profileError } = await supabaseAdmin
              .from('profiles')
              .select('user_id, email')
              .eq('email', pendingReg.email)
              .single();
            
            if (!profileError && existingProfile) {
              console.log('Found existing profile, using that user ID');
              // Try to get the auth user by the profile's user_id
              try {
                const { data: userById, error: userByIdError } = await supabaseAdmin.auth.admin.getUserById(existingProfile.user_id);
                if (!userByIdError && userById.user) {
                  existingUserRetry = userById.user;
                  console.log('Successfully found user via profile lookup');
                }
              } catch (e) {
                console.log('Could not get user by profile user_id:', e);
              }
            }
          }
          
          if (existingUserRetry) {
            console.log(`Found existing user on retry: ${existingUserRetry.email}, updating user metadata`);
            
            // Update existing user's metadata
            const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
              existingUserRetry.id,
              {
                user_metadata: {
                  ...existingUserRetry.user_metadata,
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
              console.error('Error updating existing user on retry:', updateError);
              return new Response(
                JSON.stringify({ error: `Failed to update existing user: ${updateError.message}` }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            // Set the user's password
            console.log('Setting user password on retry...');
            try {
              const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
                existingUserRetry.id,
                { password: pendingReg.password_hash }
              );

              if (passwordError) {
                console.warn('Could not set user password on retry:', passwordError);
                // Send a password reset email as fallback
                const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
                  type: 'recovery',
                  email: pendingReg.email,
                });
                if (resetError) {
                  console.warn('Could not send password reset email on retry:', resetError);
                }
              } else {
                console.log('User password set successfully on retry');
              }
            } catch (passwordUpdateError) {
              console.warn('Error setting user password on retry:', passwordUpdateError);
            }

            authUser = { user: updatedUser.user };
          } else {
            // Last resort: Continue with approval but warn about user account issue
            console.warn('Could not locate existing user, but continuing with approval process');
            console.warn('User may need to use password reset to access their account');
            
            // Set a dummy authUser to continue the process
            authUser = { 
              user: { 
                id: 'existing-user-not-found',
                email: pendingReg.email 
              } 
            };
          }
        } else {
          // Other auth errors
          return new Response(
            JSON.stringify({ error: `Failed to create user account: ${authError.message}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        // User creation was successful - this is a genuinely new user
        authUser = { user: newUser.user };
        
        // Set the password for the new user (password_hash contains plaintext password)
        console.log('Setting password for new user...');
        try {
          const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
            authUser.user.id,
            { password: pendingReg.password_hash }
          );

          if (passwordError) {
            console.warn('Could not set password for new user:', passwordError);
            // Send a password reset email as fallback
            const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
              type: 'recovery',
              email: pendingReg.email,
            });
            if (resetError) {
              console.warn('Could not send password reset email for new user:', resetError);
            }
          } else {
            console.log('Password set successfully for new user');
          }
        } catch (passwordUpdateError) {
          console.warn('Error setting password for new user:', passwordUpdateError);
        }
      }
    }

    console.log(`Processed auth user: ${authUser.user?.id} for email: ${pendingReg.email}`);

    // Wait briefly for the handle_new_user trigger, then verify and create missing records
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Ensure profile exists - create it if the trigger failed
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('user_id', authUser.user?.id)
      .maybeSingle();
    
    if (profileCheckError) {
      console.error('Error checking for existing profile:', profileCheckError);
    }
    
    if (!existingProfile) {
      console.log('Profile not found, creating manually...');
      const { data: createdProfile, error: profileCreateError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: authUser.user?.id,
          first_name: pendingReg.first_name,
          last_name: pendingReg.last_name,
          email: pendingReg.email,
          organization: pendingReg.organization_name,
          student_fte: pendingReg.student_fte,
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
          is_private_nonprofit: pendingReg.is_private_nonprofit
        })
        .select('id')
        .single();
      
      if (profileCreateError) {
        console.error('Failed to create profile manually:', profileCreateError);
        return new Response(
          JSON.stringify({ error: `Failed to create user profile: ${profileCreateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Profile created manually:', createdProfile);
    } else {
      console.log('Profile already exists from trigger');
    }
    
    // Ensure user role exists
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authUser.user?.id,
        role: isAdminOrg ? 'admin' : 'member'
      })
      .select()
      .maybeSingle();
    
    if (roleError && !roleError.message?.includes('duplicate')) {
      console.error('Error creating user role:', roleError);
    } else {
      console.log(`User role assigned: ${isAdminOrg ? 'admin' : 'member'}`);
    }

    // Get the newly created organization and activate it
    // First check if organization already exists by name AND contact person
    let newOrganization = null;
    
    try {
      let { data: existingOrg, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('id, name, email, contact_person_id, profiles:contact_person_id(user_id)')
        .eq('name', pendingReg.organization_name)
        .single();

      // Check if the found organization belongs to the current user
      let shouldCreateNew = true;
      let shouldUpdateExisting = false;
      if (!orgError && existingOrg && existingOrg.profiles?.user_id === authUser.user?.id) {
        console.log('Found existing organization for same user');
        shouldCreateNew = false;
        shouldUpdateExisting = true;
        newOrganization = existingOrg;
      } else if (!orgError && existingOrg) {
        console.log('Found organization with same name but different user - will create new one');
        shouldCreateNew = true;
      }

      // If we found an existing organization for this user, activate it
      if (shouldUpdateExisting && existingOrg) {
        console.log(`Activating existing organization ${existingOrg.name}...`);
        
        // Get the profile ID for this user
        const { data: userProfile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('user_id', authUser.user?.id)
          .single();
        
        if (profileError || !userProfile) {
          console.error('Error fetching user profile for organization update:', profileError);
        } else {
          const { data: updatedOrg, error: updateOrgError } = await supabaseAdmin
            .from('organizations')
            .update({
              membership_status: 'active',
              membership_start_date: new Date().toISOString().split('T')[0],
              contact_person_id: userProfile.id,
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
              updated_at: new Date().toISOString()
            })
            .eq('id', existingOrg.id)
            .select('id, name, membership_status')
            .single();
          
          if (updateOrgError) {
            console.error('Error activating existing organization:', updateOrgError);
          } else {
            console.log(`Organization ${updatedOrg.name} activated with status: ${updatedOrg.membership_status}`);
            newOrganization = updatedOrg;
          }
        }
      }

      // If organization doesn't exist for this user, create it manually
      if (shouldCreateNew) {
        console.log('Organization not found, creating manually...');
        
        // Handle case where we have a placeholder user ID
        if (authUser.user?.id === 'existing-user-not-found') {
          console.log('User ID is placeholder, trying to find organization by email instead...');
          
          // Try to find organization by email instead
          const { data: orgByEmail, error: orgByEmailError } = await supabaseAdmin
            .from('organizations')
            .select('id, name, email')
            .eq('email', pendingReg.email)
            .single();
          
          if (!orgByEmailError && orgByEmail) {
            console.log('Found organization by email, using existing organization');
            newOrganization = orgByEmail;
            shouldCreateNew = false;
          } else {
            console.log('No organization found by email, will skip organization creation due to user lookup issues');
            // Skip organization creation but continue with approval
            shouldCreateNew = false;
          }
        } else {
          // Normal flow: Get the profile ID for the user (should exist now)
          const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('user_id', authUser.user?.id)
            .maybeSingle();

          if (profileError) {
            console.error('Error fetching user profile after creation:', profileError);
            return new Response(
              JSON.stringify({ error: `Failed to fetch user profile: ${profileError.message}` }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          if (!profile) {
            console.error('Profile still not found after manual creation attempt');
            return new Response(
              JSON.stringify({ error: 'Failed to create or find user profile' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // Check if organization already exists
          const { data: existingOrg, error: orgCheckError } = await supabaseAdmin
            .from('organizations')
            .select('id, name, email, membership_status')
            .eq('name', pendingReg.organization_name)
            .maybeSingle();
          
          if (orgCheckError) {
            console.error('Error checking for existing organization:', orgCheckError);
          }
          
          if (existingOrg) {
            console.log('Found existing organization for same user');
            newOrganization = existingOrg;
            shouldCreateNew = false;
            
            // Update the existing organization to be active with all current data
            console.log(`Updating existing organization ${existingOrg.name} to active status...`);
            const { data: updatedOrg, error: updateOrgError } = await supabaseAdmin
              .from('organizations')
              .update({
                membership_status: 'active',
                membership_start_date: new Date().toISOString().split('T')[0],
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
                updated_at: new Date().toISOString()
              })
              .eq('id', existingOrg.id)
              .select('id, name, membership_status')
              .single();
            
            if (updateOrgError) {
              console.error('Error updating existing organization:', updateOrgError);
              return new Response(
                JSON.stringify({ error: `Failed to update organization: ${updateOrgError.message}` }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            } else {
              console.log(`Organization ${updatedOrg.name} updated to ${updatedOrg.membership_status} status`);
              newOrganization = updatedOrg;
            }
          } else {
            // Create new organization
            console.log(`Creating new organization: ${pendingReg.organization_name} with active status...`);
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
                country: 'United States',
                organization_type: isAdminOrg ? 'system' : 'member'
              })
              .select('id, name, email, membership_status')
              .single();

            if (createError) {
              console.error('Error creating organization:', createError);
              return new Response(
                JSON.stringify({ error: `Failed to create organization: ${createError.message}` }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            } else {
              newOrganization = createdOrg;
              console.log(`Organization ${newOrganization.name} created successfully`);
            }
          }
        }
      }

      // Organization creation/validation completed successfully
      console.log(`Organization processing completed: ${newOrganization ? newOrganization.name : 'No organization created'}`);
    } catch (orgCreationError) {
      console.error('Error in organization creation/update process:', orgCreationError);
      return new Response(
        JSON.stringify({ error: `Failed to process organization: ${orgCreationError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    // User can now log in with the password they provided during registration

    // Send welcome email using centralized email delivery
    try {
      console.log('Sending welcome email via centralized-email-delivery-public...');
      
      const { data: emailResult, error: emailError } = await supabaseAdmin.functions.invoke('centralized-email-delivery-public', {
        body: {
          type: 'welcome',
          to: pendingReg.email,
          data: {
            organization_name: pendingReg.organization_name,
            contact_name: `${pendingReg.first_name} ${pendingReg.last_name}`,
            email: pendingReg.email
          }
        }
      });
      
      if (emailError) {
        console.error('Error sending welcome email:', emailError);
      } else {
        console.log('Welcome email sent successfully via centralized delivery');
      }
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Don't fail the approval if email fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Registration approved and user created successfully',
        userId: authUser.user?.id,
        organizationId: newOrganization?.id || null // Ensure we always return an organizationId field
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error during approval process:', error);
    console.error('Error details:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    });
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error during registration approval',
        details: error?.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});