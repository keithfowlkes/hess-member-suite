import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
  redirectUrl?: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, redirectUrl }: PasswordResetRequest = await req.json();

    // Get user's profile including login hint
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('login_hint, first_name, last_name')
      .eq('email', email)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the password reset redirect URL from system settings
    const { data: settingData } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'password_reset_redirect_url')
      .single();

    const baseResetUrl = settingData?.setting_value || 'https://members.hessconsortium.app';

    // Generate a password reset link using Supabase Auth
    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectUrl || `${baseResetUrl}/password-reset`
      }
    });

    if (resetError) {
      console.error('Error generating reset link:', resetError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate reset link' }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extract token parameters from the Supabase reset link for our custom page
    console.log('Reset data structure:', JSON.stringify(resetData, null, 2));
    
    const resetUrl = new URL(resetData.properties.action_link);
    const token = resetUrl.searchParams.get('token');
    const type = resetUrl.searchParams.get('type');
    
    // The token_hash is actually in the properties, not the URL params
    const tokenHash = resetData.properties.hashed_token;
    
    console.log('Extracted parameters:', { token, tokenHash, type });
    console.log('Action link URL:', resetData.properties.action_link);
    
    if (!token || !tokenHash) {
      console.error('Missing required token parameters:', { token, tokenHash });
      return new Response(
        JSON.stringify({ error: 'Failed to extract token parameters' }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Build the custom reset URL using the system setting
    let customResetUrl;
    if (redirectUrl) {
      // If redirectUrl is provided and already includes the path, use it as-is with query params
      if (redirectUrl.includes('/password-reset')) {
        customResetUrl = `${redirectUrl}?token=${token}&token_hash=${tokenHash}&type=${type}`;
      } else {
        // If redirectUrl doesn't include the path, append it
        customResetUrl = `${redirectUrl}/password-reset?token=${token}&token_hash=${tokenHash}&type=${type}`;
      }
    } else {
      // Use the system setting for the base URL
      customResetUrl = `${baseResetUrl}/password-reset?token=${token}&token_hash=${tokenHash}&type=${type}`;
    }

    // Create login hint section for template
    const loginHintSection = userProfile.login_hint ? `
      <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #0369a1; margin: 0 0 10px 0;">Login Hint</h3>
        <p style="margin: 0; font-weight: bold;">${userProfile.login_hint}</p>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">This is the hint you provided to help remember your account.</p>
      </div>
    ` : '';

    // Send email using centralized email delivery system
    const { data: emailResult, error: emailError } = await supabase.functions.invoke('centralized-email-delivery', {
      body: {
        type: 'password_reset',
        to: [email],
        data: {
          user_name: userProfile.first_name || 'Member',
          reset_link: customResetUrl,
          expiry_time: '24 hours',
          login_hint_section: loginHintSection
        }
      }
    });

    if (emailError || emailResult?.error) {
      console.error("❌ Failed to send reset email via centralized delivery:", emailError || emailResult?.error);
      
      // Handle specific error messages
      const errorMessage = emailError?.message || emailResult?.error?.message || "Failed to send password reset email. Please try again or contact support.";
      let statusCode = 500;
      
      if (errorMessage.includes("restricted") || errorMessage.includes("testing mode")) {
        statusCode = 400;
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: emailError?.details || emailResult?.error?.details 
        }),
        {
          status: statusCode,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ Password reset email sent via centralized delivery:", emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Password reset email sent successfully' 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);