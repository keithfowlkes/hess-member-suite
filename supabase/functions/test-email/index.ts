import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TestEmailRequest {
  to: string;
  subject?: string;
  message?: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  try {
    const { to, subject = "HESS Consortium - Email System Test", message = "This is a test email from the HESS Consortium email system." }: TestEmailRequest = await req.json();

    if (!to) {
      return new Response(
        JSON.stringify({ error: "Email address is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Attempting to send test email to: ${to}`);

    // Use centralized email delivery system with watercolor template
    const { data: emailResult, error: emailError } = await supabase.functions.invoke('centralized-email-delivery', {
      body: {
        type: 'test',
        to: [to],
        subject: subject,
        data: {
          test_message: message,
          timestamp: new Date().toISOString(),
          test_id: crypto.randomUUID(),
          system_info: `Email service: Resend | Sent from: HESS Consortium System`
        }
      }
    });

    if (emailError || emailResult?.error) {
      console.error("❌ Failed to send test email via centralized delivery:", emailError || emailResult?.error);
      
      const errorMessage = emailError?.message || emailResult?.error?.message || "Failed to send test email";
      let statusCode = 500;
      
      if (errorMessage.includes("domain")) {
        statusCode = 400;
      } else if (errorMessage.includes("API key")) {
        statusCode = 401;
      } else if (errorMessage.includes("rate limit")) {
        statusCode = 429;
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          details: emailError?.details || emailResult?.error?.details 
        }),
        {
          status: statusCode,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log('✅ Test email sent via centralized delivery:', emailResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test email sent successfully',
        emailId: emailResult?.emailId,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in test-email function:", error);
    
    let errorMessage = "Unknown error occurred";
    let statusCode = 500;
    
    if (error.message) {
      errorMessage = error.message;
    }
    
    // Handle specific Resend errors
    if (error.message?.includes("domain")) {
      errorMessage = "Domain verification required. Please verify the hessconsortium.app domain in your Resend account.";
      statusCode = 400;
    } else if (error.message?.includes("API key")) {
      errorMessage = "Invalid API key. Please check your Resend API key configuration.";
      statusCode = 401;
    } else if (error.message?.includes("rate limit")) {
      errorMessage = "Rate limit exceeded. Please wait before sending another test email.";
      statusCode = 429;
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
        details: error.name || "EmailError"
      }),
      {
        status: statusCode,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);