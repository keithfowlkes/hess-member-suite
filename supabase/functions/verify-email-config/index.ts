import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Check environment variables
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFrom = Deno.env.get("RESEND_FROM");
    
    console.log("RESEND_API_KEY exists:", !!resendApiKey);
    console.log("RESEND_FROM:", resendFrom);

    // Get from database
    const { data: emailFromSetting } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'email_from')
      .single();

    const fromEmail = emailFromSetting?.setting_value || resendFrom;
    console.log("Email sender from DB:", fromEmail);

    let verificationResults = {
      hasApiKey: !!resendApiKey,
      hasFromAddress: !!fromEmail,
      fromAddress: fromEmail,
      domainStatus: null,
      domains: [],
      recommendations: []
    };

    if (!resendApiKey) {
      verificationResults.recommendations.push("RESEND_API_KEY environment variable is missing");
    }

    if (!fromEmail) {
      verificationResults.recommendations.push("No sender email address configured");
    }

    if (resendApiKey && fromEmail) {
      try {
        // Test if we can actually send with this configuration
        // by making a simple API call to list domains
        const domainsResponse = await resend.domains.list();
        
        console.log("✅ Resend API call successful");
        console.log("Raw domains response:", JSON.stringify(domainsResponse, null, 2));
        
        // Safely handle the domains response - Resend API might have different response structures
        let domainsList = [];
        if (domainsResponse) {
          // Handle different possible response structures
          if (Array.isArray(domainsResponse.data)) {
            domainsList = domainsResponse.data;
          } else if (domainsResponse.data && Array.isArray(domainsResponse.data.data)) {
            domainsList = domainsResponse.data.data;
          } else if (Array.isArray(domainsResponse)) {
            domainsList = domainsResponse;
          }
        }
        
        console.log("Processed domains list:", JSON.stringify(domainsList, null, 2));
        verificationResults.domains = domainsList;
        
        // Check domain verification
        const domain = fromEmail.split('@')[1];
        console.log(`Looking for domain '${domain}' in ${domainsList.length} domains`);
        
        const domainInfo = domainsList.find(d => d && d.name === domain);
        
        if (domainInfo) {
          console.log("Found domain info:", JSON.stringify(domainInfo, null, 2));
          verificationResults.domainStatus = domainInfo.status;
          
          // Check if domain is verified - be explicit about what we're checking
          if (domainInfo.status === 'verified') {
            console.log(`✅ Domain ${domain} is verified!`);
            // Don't add any recommendations - domain is good
          } else {
            console.log(`⚠️ Domain ${domain} status: ${domainInfo.status}`);
            verificationResults.recommendations.push(`Domain ${domain} verification status: ${domainInfo.status}. Please verify your domain in Resend.`);
          }
        } else {
          console.log(`❌ Domain ${domain} not found in Resend account`);
          console.log("Available domains:", domainsList.map(d => d?.name || 'unknown').join(', '));
          verificationResults.recommendations.push(`Domain ${domain} is not added to your Resend account. Please add and verify it at resend.com/domains`);
        }

        console.log("Final verification results:", JSON.stringify({
          hasRecommendations: verificationResults.recommendations.length > 0,
          recommendationCount: verificationResults.recommendations.length,
          recommendations: verificationResults.recommendations
        }, null, 2));
        
      } catch (resendError) {
        console.error("❌ Resend API error:", resendError);
        verificationResults.recommendations.push(`Resend API connection failed: ${resendError.message}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        configuration: verificationResults,
        message: verificationResults.recommendations.length === 0 ? 
          "Email configuration looks good!" : 
          "Configuration issues found - see recommendations"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error verifying email config:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);