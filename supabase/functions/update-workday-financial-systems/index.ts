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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting update of Workday HCM organizations to Workday Finance...');

    // Update all organizations with Workday HCM to have Workday Finance
    const { data: updatedOrgs, error: updateError } = await supabaseClient
      .from('organizations')
      .update({ 
        financial_system: 'Workday Finance',
        updated_at: new Date().toISOString()
      })
      .eq('hcm_hr', 'Workday HCM')
      .eq('membership_status', 'active')
      .in('organization_type', ['member', null])
      .select('name, financial_system, hcm_hr');

    if (updateError) {
      console.error('Error updating organizations:', updateError);
      throw updateError;
    }

    console.log(`Successfully updated ${updatedOrgs?.length || 0} organizations`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated ${updatedOrgs?.length || 0} organizations to Workday Finance`,
        organizations: updatedOrgs
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in update-workday-financial-systems:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});