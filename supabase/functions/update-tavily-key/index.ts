import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateTavilyKeyRequest {
  apiKey: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey } = await req.json() as UpdateTavilyKeyRequest;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate API key format (Tavily keys start with "tvly-")
    if (!apiKey.startsWith('tvly-') && apiKey.length < 20) {
      return new Response(
        JSON.stringify({ error: 'Invalid Tavily API key format. Keys should start with "tvly-"' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Upsert the Tavily API key in system_settings
    const { error: upsertError } = await supabase
      .from('system_settings')
      .upsert(
        { 
          setting_key: 'tavily_api_key', 
          setting_value: apiKey,
          description: 'Tavily API key for AI contact verification web search',
          updated_at: new Date().toISOString()
        },
        { onConflict: 'setting_key' }
      );

    if (upsertError) {
      console.error('Error upserting Tavily API key:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save API key' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Tavily API key updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Tavily API key updated successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in update-tavily-key function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);
