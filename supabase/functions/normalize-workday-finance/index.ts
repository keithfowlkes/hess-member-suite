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

    console.log('Starting normalization of Workday Financial Management to Workday Finance...');

    // Update all organizations with "Workday Financial Management" to "Workday Finance"
    const { data: updatedOrgs, error: updateError } = await supabaseClient
      .from('organizations')
      .update({ 
        financial_system: 'Workday Finance',
        updated_at: new Date().toISOString()
      })
      .eq('financial_system', 'Workday Financial Management')
      .select('name, financial_system');

    if (updateError) {
      console.error('Error updating organizations:', updateError);
      throw updateError;
    }

    console.log(`Successfully normalized ${updatedOrgs?.length || 0} organizations`);

    // Also update any dropdown option if it exists
    const { error: optionDeleteError } = await supabaseClient
      .from('system_field_options')
      .delete()
      .eq('field_name', 'financial_system')
      .eq('option_value', 'Workday Financial Management');

    if (optionDeleteError) {
      console.log('No Workday Financial Management option to delete or error:', optionDeleteError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Normalized ${updatedOrgs?.length || 0} organizations from "Workday Financial Management" to "Workday Finance"`,
        organizations: updatedOrgs
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in normalize-workday-finance:', error);
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
