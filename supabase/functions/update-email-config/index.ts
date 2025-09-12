import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

    // Get the Supabase management token from environment
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseProjectRef = Deno.env.get("SUPABASE_URL")?.split("//")[1]?.split(".")[0];
    
    if (!supabaseServiceKey || !supabaseProjectRef) {
      throw new Error("Missing Supabase configuration");
    }

    const results: any[] = [];

    // Update RESEND_API_KEY if provided
    if (resendApiKey) {
      try {
        const apiKeyResponse = await fetch(`https://api.supabase.com/v1/projects/${supabaseProjectRef}/secrets`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'RESEND_API_KEY',
            value: resendApiKey,
          }),
        });

        if (!apiKeyResponse.ok) {
          const errorText = await apiKeyResponse.text();
          console.error('Failed to update RESEND_API_KEY:', errorText);
          throw new Error(`Failed to update API key: ${apiKeyResponse.statusText}`);
        }

        results.push({ secret: 'RESEND_API_KEY', status: 'updated' });
        console.log('✅ RESEND_API_KEY updated successfully');
      } catch (error) {
        console.error('Error updating RESEND_API_KEY:', error);
        results.push({ secret: 'RESEND_API_KEY', status: 'failed', error: error.message });
      }
    }

    // Update RESEND_FROM if provided
    if (resendFromEmail) {
      try {
        const fromEmailResponse = await fetch(`https://api.supabase.com/v1/projects/${supabaseProjectRef}/secrets`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'RESEND_FROM',
            value: resendFromEmail,
          }),
        });

        if (!fromEmailResponse.ok) {
          const errorText = await fromEmailResponse.text();
          console.error('Failed to update RESEND_FROM:', errorText);
          throw new Error(`Failed to update from email: ${fromEmailResponse.statusText}`);
        }

        results.push({ secret: 'RESEND_FROM', status: 'updated' });
        console.log('✅ RESEND_FROM updated successfully');
      } catch (error) {
        console.error('Error updating RESEND_FROM:', error);
        results.push({ secret: 'RESEND_FROM', status: 'failed', error: error.message });
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