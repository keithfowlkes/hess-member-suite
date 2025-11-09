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

    console.log('Starting normalization of Oracle Financial Aid entries...');

    // Update all organizations with any Oracle variant in financial_aid to "Oracle Cloud SFP"
    const { data: updatedOrgs, error: updateError } = await supabaseClient
      .from('organizations')
      .update({ 
        financial_aid: 'Oracle Cloud SFP',
        updated_at: new Date().toISOString()
      })
      .ilike('financial_aid', '%oracle%')
      .eq('membership_status', 'active')
      .select('name, financial_aid');

    if (updateError) {
      console.error('Error updating organizations:', updateError);
      throw updateError;
    }

    console.log(`Successfully normalized ${updatedOrgs?.length || 0} organizations`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Normalized ${updatedOrgs?.length || 0} organizations to "Oracle Cloud SFP"`,
        organizations: updatedOrgs
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in normalize-oracle-financial-aid:', error);
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
