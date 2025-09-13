import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateTinymceKeyRequest {
  apiKey: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey }: UpdateTinymceKeyRequest = await req.json();

    if (!apiKey || !apiKey.trim()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'TinyMCE API key is required' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Initialize Supabase client with service role key for secret management
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate the API key format (basic validation)
    const trimmedKey = apiKey.trim();
    if (trimmedKey.length < 10) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Invalid TinyMCE API key format' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    console.log('Updating TinyMCE API key...');

    // Store the API key as a system setting for now
    // In a production environment, you would use Supabase's secret management
    const { error: updateError } = await supabase
      .from('system_settings')
      .upsert({
        setting_key: 'tinymce_api_key',
        setting_value: trimmedKey,
        description: 'TinyMCE API key for rich text editor'
      }, {
        onConflict: 'setting_key'
      });

    if (updateError) {
      console.error('Error updating TinyMCE API key:', updateError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Failed to update TinyMCE API key in database' 
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    console.log('TinyMCE API key updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'TinyMCE API key updated successfully' 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('Error in update-tinymce-key function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || 'Failed to update TinyMCE API key' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

serve(handler);