import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RestoreData {
  organization_name: string;
  state_association?: string;
  student_fte?: number;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  primary_first_name?: string;
  primary_last_name?: string;
  primary_contact_title?: string;
  primary_email?: string;
  secondary_first_name?: string;
  secondary_last_name?: string;
  secondary_contact_title?: string;
  secondary_contact_email?: string;
  secondary_contact_phone?: string;
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
  payment_platform?: string;
  meal_plan_management?: string;
  identity_management?: string;
  door_access?: string;
  document_management?: string;
  voip?: string;
  network_infrastructure?: string;
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organizations }: { organizations: RestoreData[] } = await req.json();

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
      failed: [] as { name: string; error: string }[],
      notFound: [] as string[]
    };

    console.log(`Starting restoration of ${organizations.length} organizations`);

    for (const org of organizations) {
      try {
        const orgName = org.organization_name?.trim();
        
        if (!orgName) {
          console.log(`Skipping entry with no organization name`);
          results.failed.push({ 
            name: 'Unknown', 
            error: 'No organization name provided' 
          });
          continue;
        }

        // Find the organization by name
        const { data: existingOrg, error: findError } = await supabaseAdmin
          .from('organizations')
          .select('id, contact_person_id, name')
          .eq('name', orgName)
          .maybeSingle();

        if (findError) {
          console.error(`Error finding organization ${orgName}:`, findError);
          results.failed.push({ name: orgName, error: findError.message });
          continue;
        }

        if (!existingOrg) {
          console.log(`Organization not found: ${orgName}`);
          results.notFound.push(orgName);
          continue;
        }

        // Update organization with restored data
        const { error: orgError } = await supabaseAdmin
          .from('organizations')
          .update({
            state_association: org.state_association || null,
            student_fte: org.student_fte || null,
            address_line_1: org.address || null,
            city: org.city || null,
            state: org.state || null,
            zip_code: org.zip || null,
            primary_contact_title: org.primary_contact_title || null,
            secondary_first_name: org.secondary_first_name || null,
            secondary_last_name: org.secondary_last_name || null,
            secondary_contact_title: org.secondary_contact_title || null,
            secondary_contact_email: org.secondary_contact_email || null,
            secondary_contact_phone: org.secondary_contact_phone || null,
            student_information_system: org.student_information_system || null,
            financial_system: org.financial_system || null,
            financial_aid: org.financial_aid || null,
            hcm_hr: org.hcm_hr || null,
            payroll_system: org.payroll_system || null,
            purchasing_system: org.purchasing_system || null,
            housing_management: org.housing_management || null,
            learning_management: org.learning_management || null,
            admissions_crm: org.admissions_crm || null,
            alumni_advancement_crm: org.alumni_advancement_crm || null,
            payment_platform: org.payment_platform || null,
            meal_plan_management: org.meal_plan_management || null,
            identity_management: org.identity_management || null,
            door_access: org.door_access || null,
            document_management: org.document_management || null,
            voip: org.voip || null,
            network_infrastructure: org.network_infrastructure || null,
            primary_office_apple: org.primary_office_apple || false,
            primary_office_asus: org.primary_office_asus || false,
            primary_office_dell: org.primary_office_dell || false,
            primary_office_hp: org.primary_office_hp || false,
            primary_office_microsoft: org.primary_office_microsoft || false,
            primary_office_other: org.primary_office_other || false,
            primary_office_other_details: org.primary_office_other_details || null,
            other_software_comments: org.other_software_comments || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingOrg.id);

        if (orgError) {
          console.error(`Failed to update organization ${orgName}:`, orgError);
          results.failed.push({ name: orgName, error: orgError.message });
          continue;
        }

        console.log(`Successfully restored data for ${orgName}`);
        results.successful.push(orgName);

      } catch (error) {
        console.error(`Unexpected error restoring ${org.organization_name}:`, error);
        results.failed.push({ 
          name: org.organization_name || 'Unknown', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    console.log('Restoration completed:', results);

    return new Response(
      JSON.stringify(results),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Restoration function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
