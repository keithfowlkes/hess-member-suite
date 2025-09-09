import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting analytics datacube refresh...');

    // Define the system fields to analyze
    const systemFields = [
      'student_information_system',
      'financial_system', 
      'learning_management',
      'financial_aid',
      'hcm_hr',
      'payroll_system',
      'housing_management',
      'admissions_crm',
      'alumni_advancement_crm'
    ];

    // Clear existing datacube data
    const { error: clearError } = await supabase
      .from('system_analytics_datacube')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (clearError) {
      console.error('Error clearing datacube:', clearError);
      throw clearError;
    }

    console.log('Cleared existing datacube data');

    // Get all active organizations with their system data
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select(`
        id, name, 
        student_information_system,
        financial_system,
        learning_management, 
        financial_aid,
        hcm_hr,
        payroll_system,
        housing_management,
        admissions_crm,
        alumni_advancement_crm
      `)
      .eq('membership_status', 'active')
      .neq('name', 'Administrator');

    if (orgError) {
      console.error('Error fetching organizations:', orgError);
      throw orgError;
    }

    console.log(`Processing ${organizations?.length || 0} organizations`);

    // Process each system field
    const datacubeEntries: Array<{
      system_field: string;
      system_name: string;
      institution_count: number;
    }> = [];

    for (const field of systemFields) {
      // Count occurrences of each system value for this field
      const systemCounts: Record<string, number> = {};
      
      organizations?.forEach(org => {
        const systemValue = org[field as keyof typeof org];
        if (systemValue && typeof systemValue === 'string' && systemValue.trim() !== '') {
          const normalizedValue = systemValue.trim();
          systemCounts[normalizedValue] = (systemCounts[normalizedValue] || 0) + 1;
        }
      });

      // Convert counts to datacube entries
      Object.entries(systemCounts).forEach(([systemName, count]) => {
        if (count > 0) {
          datacubeEntries.push({
            system_field: field,
            system_name: systemName,
            institution_count: count
          });
        }
      });
    }

    console.log(`Generated ${datacubeEntries.length} datacube entries`);

    // Insert new datacube data in batches
    if (datacubeEntries.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < datacubeEntries.length; i += batchSize) {
        const batch = datacubeEntries.slice(i, i + batchSize);
        
        const { error: insertError } = await supabase
          .from('system_analytics_datacube')
          .insert(batch);

        if (insertError) {
          console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
          throw insertError;
        }
      }
    }

    console.log('Analytics datacube refreshed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Analytics datacube refreshed successfully',
        entriesProcessed: datacubeEntries.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error refreshing analytics datacube:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);