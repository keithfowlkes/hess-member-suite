import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the encryption key from secrets
    const encryptionKey = Deno.env.get('PASSWORD_ENCRYPTION_KEY');
    
    if (!encryptionKey) {
      return new Response(
        JSON.stringify({ error: 'PASSWORD_ENCRYPTION_KEY secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store/update the key in system_settings
    const { error } = await supabaseAdmin
      .from('system_settings')
      .upsert({
        setting_key: 'password_encryption_key',
        setting_value: encryptionKey,
        description: 'AES-256-GCM encryption key for password storage (base64 encoded)',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'setting_key'
      });

    if (error) {
      console.error('Error setting encryption key:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to set encryption key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Encryption key set successfully in system_settings');
    
    return new Response(
      JSON.stringify({ success: true, message: 'Encryption key configured successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
