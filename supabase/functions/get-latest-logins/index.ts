import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Fetching latest logins...');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Query profiles with user data joined from auth.users
    const { data: profiles, error } = await supabaseClient
      .from('profiles')
      .select('user_id, email, first_name, last_name, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching profiles:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user data' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Found ${profiles?.length || 0} profiles`);

    // For each profile, get their last sign-in time from auth.users
    const loginsPromises = (profiles || []).map(async (profile) => {
      try {
        const { data: authData, error: authError } = await supabaseClient.auth.admin.getUserById(profile.user_id);
        
        if (authError || !authData?.user) {
          console.error(`Error fetching auth data for user ${profile.user_id}:`, authError);
          return null;
        }

        return {
          id: profile.user_id,
          timestamp: authData.user.last_sign_in_at ? new Date(authData.user.last_sign_in_at).getTime() * 1000 : 0,
          actor_username: profile.email || 'Unknown',
          actor_id: profile.user_id,
          msg: 'Login'
        };
      } catch (e) {
        console.error(`Error processing user ${profile.user_id}:`, e);
        return null;
      }
    });

    const allLogins = await Promise.all(loginsPromises);
    
    // Filter out nulls and sort by timestamp
    const validLogins = allLogins
      .filter(login => login !== null && login.timestamp > 0)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);

    console.log(`Returning ${validLogins.length} login records`);

    return new Response(
      JSON.stringify({ logins: validLogins }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
