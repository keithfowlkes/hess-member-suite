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

    console.log('Starting normalization of Slate Admissions CRM entries...');

    // First, get count of records to update
    const { count, error: countError } = await supabaseClient
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .ilike('admissions_crm', '%slate%')
      .eq('membership_status', 'active');

    if (countError) {
      console.error('Error counting organizations:', countError);
      throw countError;
    }

    console.log(`Found ${count || 0} organizations to normalize`);

    // Update all organizations with any Slate variant in admissions_crm to "Slate for Admissions"
    // Don't select the results to make it faster
    const { error: updateError } = await supabaseClient
      .from('organizations')
      .update({ 
        admissions_crm: 'Slate for Admissions',
        updated_at: new Date().toISOString()
      })
      .ilike('admissions_crm', '%slate%')
      .eq('membership_status', 'active');

    if (updateError) {
      console.error('Error updating organizations:', updateError);
      throw updateError;
    }

    console.log(`Successfully normalized ${count || 0} organizations`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Normalized ${count || 0} organizations to "Slate for Admissions"`,
        count: count || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in normalize-slate-admissions:', error);
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
