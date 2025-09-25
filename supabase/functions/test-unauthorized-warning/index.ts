import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🧪 MANUAL TEST: Sending unauthorized update warning for Fowlkes University');

    // Send the notification email using centralized email delivery
    const { data: emailResult, error: emailError } = await supabaseClient.functions.invoke('centralized-email-delivery', {
      body: {
        type: 'unauthorized_update_warning',
        to: 'keith@hessconsortium.org',
        subject: 'URGENT: Unauthorized Organization Update Alert - Action Required',
        data: {
          organization_name: 'Fowlkes University',
          submitted_email: 'keith.fowlkes@deuslogic.com',
          primary_contact_name: 'Keith Fowlkes',
          contact_email: 'info@hessconsortium.org'
        }
      }
    });

    if (emailError) {
      console.error('❌ MANUAL TEST: Failed to send notification email:', emailError);
      throw emailError;
    }

    console.log('✅ MANUAL TEST: Notification email sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Unauthorized update warning email sent successfully to keith@hessconsortium.org',
        emailResult 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('❌ MANUAL TEST: Error in test function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);