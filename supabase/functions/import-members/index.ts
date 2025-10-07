import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImportMemberData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  organization?: string;
  state_association?: string;
  student_fte?: number;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  primary_contact_title?: string;
  secondary_first_name?: string;
  secondary_last_name?: string;
  secondary_contact_title?: string;
  secondary_contact_email?: string;
  student_information_system?: string;
  financial_system?: string;
  financial_aid?: string;
  hcm_hr?: string;
  payroll_system?: string;
  purchasing_system?: string;
  housing_management?: string;
  learning_management?: string;
  admissions_crm?: string;
  alumni_advancement_crm?: string;
  primary_office_apple?: boolean;
  primary_office_lenovo?: boolean;
  primary_office_dell?: boolean;
  primary_office_hp?: boolean;
  primary_office_microsoft?: boolean;
  primary_office_other?: boolean;
  primary_office_other_details?: string;
  other_software_comments?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { members }: { members: ImportMemberData[] } = await req.json();

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const results = {
      successful: [] as string[],
      failed: [] as { email: string; error: string }[],
      existing: [] as string[]
    };

    console.log(`Starting import of ${members.length} members`);

    for (const member of members) {
      try {
        // Clean and validate email address
        const cleanEmail = member.email
          ?.trim()
          .replace(/[\r\n\t\v\f]/g, '') // Remove control characters
          .toLowerCase();

        // Skip invalid emails
        if (!cleanEmail || !cleanEmail.includes('@') || cleanEmail === 'other') {
          console.log(`Skipping invalid email: ${member.email}`);
          results.failed.push({ 
            email: member.email, 
            error: 'Invalid email address format' 
          });
          continue;
        }

        let userId: string;
        let isNewUser = false;

        // First, check if user already exists by looking up their profile
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (existingProfile) {
          // User already exists, update their profile
          console.log(`User ${cleanEmail} already exists, updating profile`);
          userId = existingProfile.user_id;
          results.existing.push(cleanEmail);
        } else {
          // Create new user account
          const tempPassword = crypto.randomUUID();
          const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email: cleanEmail,
            password: tempPassword,
            email_confirm: true, // Skip email confirmation for imported users
            user_metadata: {
              first_name: member.first_name,
              last_name: member.last_name,
              organization: member.organization,
              imported: true
            }
          });

          if (userError) {
            console.error(`Failed to create user ${cleanEmail}:`, userError);
            results.failed.push({ email: member.email, error: userError.message });
            continue;
          }

          if (!userData.user) {
            results.failed.push({ email: member.email, error: 'User creation returned no data' });
            continue;
          }

          userId = userData.user.id;
          isNewUser = true;

          // Wait for the handle_new_user trigger to complete
          console.log(`Waiting for profile creation trigger for ${cleanEmail}...`);
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Verify profile was created
          const { data: checkProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();
          
          if (!checkProfile) {
            console.error(`Profile was not created by trigger for ${cleanEmail}`);
            results.failed.push({ email: member.email, error: 'Profile creation failed' });
            continue;
          }
          console.log(`Profile created by trigger for ${cleanEmail}, ID: ${checkProfile.id}`);
        }

        // Update profile with imported data (works for both new and existing users)
        // Note: Only updating fields that exist in the profiles table
        const { data: updatedProfile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({
            phone: member.phone,
            organization: member.organization,
            primary_contact_title: member.primary_contact_title,
            secondary_first_name: member.secondary_first_name,
            secondary_last_name: member.secondary_last_name,
            secondary_contact_title: member.secondary_contact_title,
            secondary_contact_email: member.secondary_contact_email
          })
          .eq('user_id', userId)
          .select()
          .maybeSingle();

        if (profileError) {
          console.error(`Failed to update profile for ${cleanEmail}:`, profileError);
          results.failed.push({ email: member.email, error: profileError.message });
          continue;
        }

        if (!updatedProfile) {
          console.error(`Profile update returned no data for ${cleanEmail}`);
          results.failed.push({ email: member.email, error: 'Profile update returned no data' });
          continue;
        }

        console.log(`Profile updated successfully for ${cleanEmail}, profile ID: ${updatedProfile.id}`);

        // Create or update organization for this member
        if (member.organization && updatedProfile) {
          console.log(`Attempting to create/update organization: ${member.organization} for ${cleanEmail}`);
          const { data: existingOrg } = await supabaseAdmin
            .from('organizations')
            .select('id')
            .eq('name', member.organization)
            .eq('contact_person_id', updatedProfile.id)
            .maybeSingle();

          const organizationData = {
            name: member.organization,
            contact_person_id: updatedProfile.id,
            email: cleanEmail,
            phone: member.phone,
            address_line_1: member.address,
            city: member.city,
            state: member.state,
            zip_code: member.zip,
            country: 'United States',
            membership_status: 'active' as const,
            annual_fee_amount: 1000.00,
            state_association: member.state_association,
            student_fte: member.student_fte,
            student_information_system: member.student_information_system,
            financial_system: member.financial_system,
            financial_aid: member.financial_aid,
            hcm_hr: member.hcm_hr,
            payroll_system: member.payroll_system,
            purchasing_system: member.purchasing_system,
            housing_management: member.housing_management,
            learning_management: member.learning_management,
            admissions_crm: member.admissions_crm,
            alumni_advancement_crm: member.alumni_advancement_crm,
            payment_platform: member.payment_platform,
            meal_plan_management: member.meal_plan_management,
            identity_management: member.identity_management,
            door_access: member.door_access,
            document_management: member.document_management,
            voip: member.voip,
            network_infrastructure: member.network_infrastructure,
            primary_office_apple: member.primary_office_apple || false,
            primary_office_lenovo: member.primary_office_lenovo || false,
            primary_office_dell: member.primary_office_dell || false,
            primary_office_hp: member.primary_office_hp || false,
            primary_office_microsoft: member.primary_office_microsoft || false,
            primary_office_other: member.primary_office_other || false,
            primary_office_other_details: member.primary_office_other_details,
            other_software_comments: member.other_software_comments
          };

          if (existingOrg) {
            // Update existing organization with all imported data
            const { error: orgError } = await supabaseAdmin
              .from('organizations')
              .update(organizationData)
              .eq('id', existingOrg.id);

            if (orgError) {
              console.error(`Failed to update organization for ${cleanEmail}:`, orgError);
            } else {
              console.log(`Updated organization ${member.organization} for ${cleanEmail}`);
            }
          } else {
            // Create new organization with all imported data
            const { error: orgError } = await supabaseAdmin
              .from('organizations')
              .insert(organizationData);

            if (orgError) {
              console.error(`Failed to create organization for ${cleanEmail}:`, orgError);
            } else {
              console.log(`Created organization ${member.organization} for ${cleanEmail}`);
            }
          }
        }

        // Only send password reset for new users (role is handled by trigger)
        if (isNewUser) {
          // Send password reset email so user can set their own password
          await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: cleanEmail
          });

          console.log(`Successfully imported new user ${cleanEmail}`);
          results.successful.push(cleanEmail);
        } else {
          console.log(`Successfully updated existing user ${cleanEmail}`);
        }

      } catch (error) {
        console.error(`Unexpected error importing ${member.email}:`, error);
        results.failed.push({ 
          email: member.email, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    console.log('Import completed:', results);

    return new Response(
      JSON.stringify(results),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Import function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});