import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RestoreData {
  college: string;
  city?: string;
  state?: string;
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
        const collegeName = org.college?.trim();
        const city = org.city?.trim();
        const state = org.state?.trim();
        
        if (!collegeName) {
          console.log(`Skipping entry with no college name`);
          results.failed.push({ 
            name: 'Unknown', 
            error: 'No college name provided' 
          });
          continue;
        }

        // Find the organization by name, city, and state
        let query = supabaseAdmin
          .from('organizations')
          .select('id, contact_person_id, name');
        
        // Match by name
        query = query.eq('name', collegeName);
        
        // Add city matching if provided
        if (city) {
          query = query.eq('city', city);
        }
        
        // Add state matching if provided
        if (state) {
          query = query.eq('state', state);
        }
        
        const { data: existingOrg, error: findError } = await query.maybeSingle();

        if (findError) {
          console.error(`Error finding organization ${collegeName}:`, findError);
          results.failed.push({ name: collegeName, error: findError.message });
          continue;
        }

        if (!existingOrg) {
          console.log(`Organization not found: ${collegeName} (${city}, ${state})`);
          results.notFound.push(`${collegeName} (${city}, ${state})`);
          continue;
        }

        // Update organization with restored data (only systems and hardware fields)
        const { error: orgError } = await supabaseAdmin
          .from('organizations')
          .update({
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
            primary_office_apple: org.primary_office_apple || false,
            primary_office_asus: org.primary_office_asus || false,
            primary_office_dell: org.primary_office_dell || false,
            primary_office_hp: org.primary_office_hp || false,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingOrg.id);

        if (orgError) {
          console.error(`Failed to update organization ${collegeName}:`, orgError);
          results.failed.push({ name: collegeName, error: orgError.message });
          continue;
        }

        console.log(`Successfully restored data for ${collegeName}`);
        results.successful.push(collegeName);

      } catch (error) {
        console.error(`Unexpected error restoring ${org.college}:`, error);
        results.failed.push({ 
          name: org.college || 'Unknown', 
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
