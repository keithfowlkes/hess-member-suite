import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
    const resetUrl = new URL(resetData.properties.action_link);
    const token = resetUrl.searchParams.get('token');
    const tokenHash = resetUrl.searchParams.get('token_hash');
    const type = resetUrl.searchParams.get('type');
    
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

    // Create custom email content with login hint
    const loginHintSection = userProfile.login_hint ? `
      <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #0369a1; margin: 0 0 10px 0;">Login Hint</h3>
        <p style="margin: 0; font-weight: bold;">${userProfile.login_hint}</p>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">This is the hint you provided to help remember your account.</p>
      </div>
    ` : '';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <center>
          <img src="http://www.hessconsortium.org/new/wp-content/uploads/2023/03/HESSlogoMasterFLAT.png" alt="HESS LOGO" style="width:230px; height:155px;">
        </center>
        
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        
        <p>Hello ${userProfile.first_name || 'Member'},</p>
        
        <p>We received a request to reset your password for your HESS Consortium account.</p>
        
        ${loginHintSection}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${customResetUrl}" 
             style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Reset Your Password
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          <strong>Important:</strong> This reset link will expire in 24 hours. If you didn't request this password reset, you can safely ignore this email.
        </p>
        
        <p style="color: #666; font-size: 14px;">
          If the button above doesn't work, you can copy and paste this link into your browser:<br>
          <a href="${customResetUrl}" style="color: #2563eb; word-break: break-all;">
            ${customResetUrl}
          </a>
        </p>
        
        <hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="color: #666; font-size: 12px; text-align: center;">
          Questions? Contact us at support@members.hessconsortium.app<br>
          HESS Consortium - Higher Education Systems & Services Consortium
        </p>
      </div>
    `;

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "HESS Consortium <support@members.hessconsortium.app>",
      to: [email],
      subject: "Reset Your HESS Consortium Password",
      html: html,
    });

    console.log("Password reset email sent successfully:", emailResponse);

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