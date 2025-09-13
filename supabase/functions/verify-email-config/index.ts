import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Check configuration requirements
    const config = {
      resend_api_key: !!Deno.env.get('RESEND_API_KEY'),
      resend_from_env: Deno.env.get('RESEND_FROM') || null,
      sender_configured: false,
      sender_source: 'none',
      sender_domain: null,
      domain_verified: false,
      api_key_valid: false,
      errors: [] as string[],
      warnings: [] as string[]
    };

    // Get app-managed sender setting
    try {
      const { data: fromRow } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'email_from')
        .maybeSingle();
      
      if (fromRow?.setting_value) {
        config.sender_configured = true;
        config.sender_source = 'app_managed';
        const email = fromRow.setting_value as string;
        config.sender_domain = email.includes('@') ? email.split('@')[1] : null;
      }
    } catch (error) {
      config.errors.push(`Failed to check app-managed sender: ${error.message}`);
    }

    // Fall back to env var if no app setting
    if (!config.sender_configured && config.resend_from_env) {
      config.sender_configured = true;
      config.sender_source = 'environment';
      config.sender_domain = config.resend_from_env.includes('@') 
        ? config.resend_from_env.split('@')[1] 
        : null;
    }

    // Test Resend API if key is available
    if (config.resend_api_key) {
      try {
        const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
        
        // Test API key validity by checking domains
        const domainsResponse = await resend.domains.list();
        
        if (domainsResponse.error) {
          config.errors.push(`Resend API key invalid: ${domainsResponse.error.message}`);
        } else {
          config.api_key_valid = true;
          
          // Check if sender domain is verified
          if (config.sender_domain && domainsResponse.data?.data) {
            const domainsList = domainsResponse.data.data || [];
            const domain = domainsList.find(d => 
              d.name === config.sender_domain && d.status === 'verified'
            );
            config.domain_verified = !!domain;
            
            if (!domain) {
              const foundDomain = domainsList.find(d => d.name === config.sender_domain);
              if (foundDomain) {
                config.warnings.push(`Domain ${config.sender_domain} found but status is '${foundDomain.status}' (not verified)`);
              } else {
                config.warnings.push(`Domain ${config.sender_domain} not found in Resend account`);
              }
            }
          }
        }
      } catch (error) {
        config.errors.push(`Failed to verify Resend API: ${error.message}`);
      }
    } else {
      config.errors.push('RESEND_API_KEY not configured in Supabase secrets');
    }

    // Generate recommendations
    const recommendations = [];
    
    if (!config.sender_configured) {
      recommendations.push('Configure sender email address via Settings > Email System Configuration');
    }
    
    if (!config.api_key_valid) {
      recommendations.push('Set valid RESEND_API_KEY in Supabase Edge Functions > Secrets');
    }
    
    if (config.sender_domain && !config.domain_verified) {
      recommendations.push(`Verify domain ${config.sender_domain} at resend.com/domains`);
    }
    
    if (config.sender_domain === 'resend.dev') {
      recommendations.push('Using Resend sandbox domain - configure your own verified domain for production');
      recommendations.push('On Resend free plan, verify recipient emails at resend.com/verified-emails or use a verified domain');
    }

    return new Response(
      JSON.stringify({
        success: config.errors.length === 0,
        configuration: config,
        recommendations,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in verify-email-config function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to verify email configuration",
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