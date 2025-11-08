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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Query the auth logs for login events
    const query = `
      select 
        id, 
        auth_logs.timestamp, 
        event_message,
        metadata.level, 
        metadata.msg
      from auth_logs
        cross join unnest(metadata) as metadata
      where metadata.msg = 'Login'
      order by timestamp desc
      limit 20
    `;

    const { data, error } = await supabaseClient.rpc('pg_temp.query_analytics', {
      query_text: query,
      project_ref: Deno.env.get('SUPABASE_PROJECT_REF') ?? ''
    });

    if (error) {
      console.error('Error querying auth logs:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch login history' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse the login records
    const parsedLogins = (data || []).map((log: any) => {
      let actorUsername = 'Unknown';
      let actorId = 'Unknown';

      try {
        const eventMessage = typeof log.event_message === 'string' 
          ? JSON.parse(log.event_message) 
          : log.event_message;

        if (eventMessage.auth_event) {
          actorUsername = eventMessage.auth_event.actor_username || 'Unknown';
          actorId = eventMessage.auth_event.actor_id || 'Unknown';
        } else if (eventMessage.actor_username) {
          actorUsername = eventMessage.actor_username;
          actorId = eventMessage.actor_id || 'Unknown';
        }
      } catch (e) {
        console.error('Error parsing event message:', e);
      }

      return {
        id: log.id,
        timestamp: log.timestamp,
        actor_username: actorUsername,
        actor_id: actorId,
        msg: log.msg || 'Login'
      };
    });

    return new Response(
      JSON.stringify({ logins: parsedLogins }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
