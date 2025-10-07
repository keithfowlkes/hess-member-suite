import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Auto-refreshing analytics datacube...');

    // Clear existing datacube data
    const { error: deleteError } = await supabase
      .from('system_analytics_datacube')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.error('Error clearing datacube:', deleteError);
      throw deleteError;
    }

    // Fetch all active organizations with their system information
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('membership_status', 'active')
      .eq('organization_type', 'member');

    if (orgError) {
      console.error('Error fetching organizations:', orgError);
      throw orgError;
    }

    console.log(`Processing ${organizations?.length || 0} organizations...`);

    // System fields to track
    const systemFields = [
      'student_information_system',
      'financial_system',
      'financial_aid',
      'hcm_hr',
      'payroll_system',
      'purchasing_system',
      'housing_management',
      'learning_management',
      'admissions_crm',
      'alumni_advancement_crm',
      'payment_platform',
      'meal_plan_management',
      'identity_management',
      'door_access',
      'document_management',
      'voip',
      'network_infrastructure',
    ];

    // Hardware fields
    const hardwareFields = [
      'primary_office_apple',
      'primary_office_lenovo',
      'primary_office_dell',
      'primary_office_hp',
      'primary_office_microsoft',
      'primary_office_asus',
      'primary_office_other',
    ];

    const datacubeEntries: any[] = [];

    // Count systems
    for (const field of systemFields) {
      const systemCounts: Record<string, { count: number; institutions: any[] }> = {};

      organizations?.forEach((org) => {
        const value = org[field];
        if (value && value !== '') {
          if (!systemCounts[value]) {
            systemCounts[value] = { count: 0, institutions: [] };
          }
          systemCounts[value].count++;
          systemCounts[value].institutions.push({
            id: org.id,
            name: org.name,
            city: org.city,
            state: org.state,
            student_fte: org.student_fte,
          });
        }
      });

      for (const [systemName, data] of Object.entries(systemCounts)) {
        datacubeEntries.push({
          system_field: field,
          system_name: systemName,
          institution_count: data.count,
          institution_details: data.institutions,
        });
      }
    }

    // Count hardware
    const hardwareCounts: Record<string, { count: number; institutions: any[] }> = {};
    organizations?.forEach((org) => {
      hardwareFields.forEach((field) => {
        if (org[field] === true) {
          const hardwareName = field.replace('primary_office_', '').replace(/_/g, ' ');
          const displayName = hardwareName.charAt(0).toUpperCase() + hardwareName.slice(1);

          if (!hardwareCounts[displayName]) {
            hardwareCounts[displayName] = { count: 0, institutions: [] };
          }
          hardwareCounts[displayName].count++;
          hardwareCounts[displayName].institutions.push({
            id: org.id,
            name: org.name,
            city: org.city,
            state: org.state,
            student_fte: org.student_fte,
          });
        }
      });
    });

    for (const [hardwareName, data] of Object.entries(hardwareCounts)) {
      datacubeEntries.push({
        system_field: 'primary_office_hardware',
        system_name: hardwareName,
        institution_count: data.count,
        institution_details: data.institutions,
      });
    }

    // Add overall totals
    const totalOrganizations = organizations?.length || 0;
    const totalStudentFte = organizations?.reduce((sum, org) => sum + (org.student_fte || 0), 0) || 0;

    datacubeEntries.push({
      system_field: 'organization_totals',
      system_name: 'total_organizations',
      institution_count: totalOrganizations,
      institution_details: null,
    });

    datacubeEntries.push({
      system_field: 'organization_totals',
      system_name: 'total_student_fte',
      institution_count: totalStudentFte,
      institution_details: null,
    });

    // Insert all entries
    if (datacubeEntries.length > 0) {
      const { error: insertError } = await supabase
        .from('system_analytics_datacube')
        .insert(datacubeEntries);

      if (insertError) {
        console.error('Error inserting datacube entries:', insertError);
        throw insertError;
      }
    }

    console.log(`Successfully refreshed datacube with ${datacubeEntries.length} entries`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Analytics datacube refreshed successfully',
        entriesCreated: datacubeEntries.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in auto-refresh-analytics:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
