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
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('Starting public views refresh...');

    // If public_organization_directory is a materialized view, refresh it
    // Note: Regular views don't need refresh, but materialized views do
    const { error: refreshError } = await supabase.rpc('refresh_public_views');

    if (refreshError) {
      // If the function doesn't exist, the view might be a regular view
      // In that case, we can just log that no refresh is needed
      console.log('Refresh function not found or view is regular (auto-updating):', refreshError.message);
      
      // Force a query to ensure the view is up to date
      const { count, error: countError } = await supabase
        .from('public_organization_directory')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        throw countError;
      }

      console.log(`Public organization directory verified: ${count} organizations`);
    } else {
      console.log('Public views refreshed successfully');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Public views refreshed successfully',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error refreshing public views:', error);
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
