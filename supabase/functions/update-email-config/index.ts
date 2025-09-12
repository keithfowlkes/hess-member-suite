import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailConfigRequest {
  resendApiKey?: string;
  resendFromEmail?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const { resendApiKey, resendFromEmail }: EmailConfigRequest = await req.json();
    
    console.log('Updating email configuration:', { 
      hasApiKey: !!resendApiKey, 
      fromEmail: resendFromEmail 
    });

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const results: any[] = [];

    // Handle API key request (not supported via app for security)
    if (resendApiKey) {
      results.push({ secret: 'RESEND_API_KEY', status: 'unsupported', reason: 'Update via Supabase Secrets only' });
    }

    // Update sender email in system settings
    if (resendFromEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(resendFromEmail)) {
        results.push({ setting: 'email_from', status: 'failed', error: 'Invalid email format' });
      } else {
        const { error: upsertError } = await supabase
          .from('system_settings')
          .upsert([
            {
              setting_key: 'email_from',
              setting_value: resendFromEmail,
              description: 'Sender email address for Resend (managed via app)'
            }
          ], { onConflict: 'setting_key' });

        if (upsertError) {
          console.error('Failed to upsert email_from setting:', upsertError);
          results.push({ setting: 'email_from', status: 'failed', error: upsertError.message });
        } else {
          results.push({ setting: 'email_from', status: 'updated' });
        }
      }
    }

    const hasFailures = results.some(r => r.status === 'failed');
    
    return new Response(
      JSON.stringify({
        success: !hasFailures,
        message: hasFailures 
          ? 'Some configurations failed to update'
          : 'Email configuration updated successfully',
        results,
        timestamp: new Date().toISOString()
      }),
      {
        status: hasFailures ? 207 : 200, // 207 Multi-Status for partial success
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in update-email-config function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to update email configuration",
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);