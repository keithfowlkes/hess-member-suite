import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔑 Getting TinyMCE API key...');

    // First try to get from Supabase secrets (environment variable)
    const secretApiKey = Deno.env.get('TINYMCE_API_KEY');
    
    if (secretApiKey && secretApiKey !== 'no-api-key') {
      console.log('✅ Found TinyMCE API key in secrets');
      return new Response(
        JSON.stringify({ apiKey: secretApiKey }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    console.log('⚠️ No key in secrets, checking system settings...');

    // Fallback to system settings
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: settingData, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'tinymce_api_key')
      .maybeSingle();

    if (error) {
      console.error('❌ Database error:', error);
    } else if (settingData?.setting_value) {
      console.log('✅ Found TinyMCE API key in system settings');
      return new Response(
        JSON.stringify({ apiKey: settingData.setting_value }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }
    
    console.log('❌ TinyMCE API key not found anywhere');
    return new Response(
      JSON.stringify({ error: 'TinyMCE API key not configured' }),
      { 
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('💥 Error in get-tinymce-key function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

serve(handler);