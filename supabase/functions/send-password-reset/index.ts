import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import { getEmailDesignSettings, replaceColorVariables, hexToRgba } from '../_shared/email-design.ts';

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

    // Get user's profile including login hint (may not exist)
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, login_hint, first_name, last_name')
      .eq('email', email)
      .maybeSingle();

    if (profileError) {
      console.log('No profile found for password reset request (continuing):', email);
    }

    // Get the password reset redirect URL from system settings
    const { data: settingData, error: settingError } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'password_reset_redirect_url')
      .maybeSingle();

    if (settingError) {
      console.error('Error fetching password reset redirect URL (falling back to default):', settingError);
    }

    const baseResetUrl = settingData?.setting_value || 'https://members.hessconsortium.app';

    const redirectTo = redirectUrl || `${baseResetUrl}/password-reset`;

    // Generate a password reset link using Supabase Auth
    let resetData: any | null = null;
    let resetError: any | null = null;

    ({ data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo }
    }));

    // If email doesn't exist in auth.users but the profile is linked to an auth user,
    // retry using the auth user's current email (handles email-mismatch cases).
    if (resetError && userProfile?.user_id) {
      console.log('Primary generateLink failed; trying via profile.user_id:', userProfile.user_id);
      const { data: authUserData, error: authUserError } = await supabase.auth.admin.getUserById(userProfile.user_id);

      if (!authUserError && authUserData?.user?.email) {
        const authEmail = authUserData.user.email;
        console.log('Retrying generateLink with auth email:', authEmail);

        ({ data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: authEmail,
          options: { redirectTo }
        }));
      } else {
        console.log('Could not load auth user by profile.user_id; skipping retry');
      }
    }

    // SECURITY: Don't reveal if the email exists or not
    // Return success message regardless to prevent email enumeration
    if (resetError || !resetData) {
      console.log('Password reset requested for non-existent or invalid email:', email);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'If an account exists with this email, a password reset link will be sent.'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

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

    // Create login hint section for template with design system colors
    let loginHintSection = '';
    if (userProfile?.login_hint) {
      const designSettings = await getEmailDesignSettings();
      loginHintSection = `
        <div style="background: {{accent_color}}20; border: 1px solid {{accent_color}}; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: {{primary_color}}; margin: 0 0 10px 0;">Login Hint</h3>
          <p style="margin: 0; font-weight: bold;">${userProfile.login_hint}</p>
          <p style="margin: 5px 0 0 0; font-size: 12px; color: {{text_color}}CC;">This is the hint you provided to help remember your account.</p>
        </div>
      `;
      loginHintSection = replaceColorVariables(loginHintSection, designSettings);
    }

    // Send email using centralized email delivery system
    const { data: emailResult, error: emailError } = await supabase.functions.invoke('centralized-email-delivery', {
      body: {
        type: 'password_reset',
        to: [email],
        data: {
          user_name: userProfile?.first_name || 'Member',
          reset_link: customResetUrl,
          expiry_time: '1 hour',
          login_hint_section: loginHintSection || ''
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