import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FeedbackRequest {
  name: string;
  email: string;
  message: string;
  organization?: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  console.log('Analytics feedback function called');

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
    const { name, email, message, organization }: FeedbackRequest = await req.json();
    console.log('Feedback request:', { name, email, message: message.substring(0, 100) + '...' });

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Send email using centralized email delivery system
    const { data: emailResult, error: emailError } = await supabase.functions.invoke('centralized-email-delivery', {
      body: {
        type: 'analytics_feedback',
        to: ['keith.fowlkes@hessconsortium.org'],
        data: {
          member_name: name,
          member_email: email,
          organization_name: organization || '',
          timestamp: new Date().toLocaleString(),
          feedback_message: message
        }
      }
    });

    if (emailError || emailResult?.error) {
      console.error("❌ Failed to send analytics feedback email via centralized delivery:", emailError || emailResult?.error);
      return new Response(
        JSON.stringify({ 
          error: "Failed to send feedback email",
          details: emailError?.message || emailResult?.error?.message 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("✅ Analytics feedback email sent via centralized delivery:", emailResult);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Feedback sent successfully"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("Error in send-analytics-feedback function:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", JSON.stringify(error, null, 2));
    
    // Handle specific Resend errors with more detailed logging
    if (error.message?.includes('API key')) {
      console.error("Resend API key error - check if RESEND_API_KEY is properly configured");
      return new Response(
        JSON.stringify({ error: "Email service configuration error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (error.message?.includes('rate limit')) {
      console.error("Resend rate limit reached");
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: "Failed to send feedback",
        details: error.message,
        type: error.constructor.name
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);