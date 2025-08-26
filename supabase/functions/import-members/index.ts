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
  primary_office_asus?: boolean;
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
        let userId: string;
        let isNewUser = false;

        // First, check if user already exists by looking up their profile
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('email', member.email)
          .single();

        if (existingProfile) {
          // User already exists, update their profile
          console.log(`User ${member.email} already exists, updating profile`);
          userId = existingProfile.user_id;
          results.existing.push(member.email);
        } else {
          // Create new user account
          const tempPassword = crypto.randomUUID();
          const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email: member.email,
            password: tempPassword,
            email_confirm: true, // Skip email confirmation for imported users
            user_metadata: {
              first_name: member.first_name,
              last_name: member.last_name,
              imported: true
            }
          });

          if (userError) {
            console.error(`Failed to create user ${member.email}:`, userError);
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
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Update profile with imported data (works for both new and existing users)
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({
            phone: member.phone,
            organization: member.organization,
            state_association: member.state_association,
            student_fte: member.student_fte,
            address: member.address,
            city: member.city,
            state: member.state,
            zip: member.zip,
            primary_contact_title: member.primary_contact_title,
            secondary_first_name: member.secondary_first_name,
            secondary_last_name: member.secondary_last_name,
            secondary_contact_title: member.secondary_contact_title,
            secondary_contact_email: member.secondary_contact_email,
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
            primary_office_apple: member.primary_office_apple || false,
            primary_office_asus: member.primary_office_asus || false,
            primary_office_dell: member.primary_office_dell || false,
            primary_office_hp: member.primary_office_hp || false,
            primary_office_microsoft: member.primary_office_microsoft || false,
            primary_office_other: member.primary_office_other || false,
            primary_office_other_details: member.primary_office_other_details,
            other_software_comments: member.other_software_comments
          })
          .eq('user_id', userId);

        if (profileError) {
          console.error(`Failed to update profile for ${member.email}:`, profileError);
          results.failed.push({ email: member.email, error: profileError.message });
          continue;
        }

        // Only assign role and send password reset for new users
        if (isNewUser) {
          // Assign member role
          const { error: roleError } = await supabaseAdmin
            .from('user_roles')
            .insert({
              user_id: userId,
              role: 'member'
            });

          if (roleError) {
            console.error(`Failed to assign role for ${member.email}:`, roleError);
            results.failed.push({ email: member.email, error: roleError.message });
            continue;
          }

          // Send password reset email so user can set their own password
          await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: member.email
          });

          console.log(`Successfully imported new user ${member.email}`);
          results.successful.push(member.email);
        } else {
          console.log(`Successfully updated existing user ${member.email}`);
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