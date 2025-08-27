import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: 'invitation' | 'approval' | 'rejection' | 'transfer' | 'welcome' | 'member_approval';
  to: string;
  organizationName: string;
  token?: string;
  adminMessage?: string;
  memberName?: string;
  transferDetails?: {
    currentContact: string;
    newContact: string;
  };
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  console.log('Organization emails function called');

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, to, organizationName, token, adminMessage, memberName, transferDetails }: EmailRequest = await req.json();
    console.log('Email request:', { type, to, organizationName });

    const appUrl = Deno.env.get('SUPABASE_URL')?.replace('//', '//app.');

    let subject: string;
    let html: string;

    switch (type) {
      case 'invitation':
        subject = `Invitation to manage ${organizationName} - HESS Consortium`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">HESS Consortium</h1>
            <h2>Organization Account Invitation</h2>
            <p>Hello,</p>
            <p>You have been invited to manage the account for <strong>${organizationName}</strong> on the HESS Consortium member portal.</p>
            <p>Click the link below to accept this invitation and create your account:</p>
            <a href="${appUrl}/invite?token=${token}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
              Accept Invitation
            </a>
            <p>This invitation will expire in 7 days.</p>
            <p>If you have any questions, please contact us at support@hessconsortium.org.</p>
            <p>Best regards,<br>HESS Consortium Team</p>
          </div>
        `;
        break;

      case 'approval':
        subject = `Welcome to HESS Consortium - ${organizationName} Approved!`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #16a34a;">Welcome to HESS Consortium!</h1>
            <p>Congratulations! Your organization <strong>${organizationName}</strong> has been approved for membership.</p>
            <p>You can now access the full member portal with all features and resources.</p>
            <a href="${appUrl}" 
               style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
              Access Member Portal
            </a>
            ${adminMessage ? `<p><strong>Message from admin:</strong><br>${adminMessage}</p>` : ''}
            <p>Welcome to the consortium!</p>
            <p>Best regards,<br>HESS Consortium Team</p>
          </div>
        `;
        break;

      case 'rejection':
        subject = `HESS Consortium Application Update - ${organizationName}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">HESS Consortium</h1>
            <p>Thank you for your interest in joining HESS Consortium.</p>
            <p>After careful review, we are unable to approve the application for <strong>${organizationName}</strong> at this time.</p>
            ${adminMessage ? `<p><strong>Reason:</strong><br>${adminMessage}</p>` : ''}
            <p>If you have questions about this decision, please contact us at support@hessconsortium.org.</p>
            <p>Best regards,<br>HESS Consortium Team</p>
          </div>
        `;
        break;

      case 'transfer':
        subject = `Organization Transfer Request - ${organizationName}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">HESS Consortium</h1>
            <h2>Organization Transfer Request</h2>
            <p>Hello,</p>
            <p>You have been selected as the new primary contact for <strong>${organizationName}</strong>.</p>
            ${transferDetails ? `<p>Current contact: ${transferDetails.currentContact}<br>New contact: ${transferDetails.newContact}</p>` : ''}
            <p>Click the link below to accept this transfer and create/link your account:</p>
            <a href="${appUrl}/transfer?token=${token}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
              Accept Transfer
            </a>
            <p>This transfer request will expire in 7 days.</p>
            <p>If you have questions, please contact us at support@hessconsortium.org.</p>
            <p>Best regards,<br>HESS Consortium Team</p>
          </div>
        `;
        break;

      case 'member_approval':
        subject = `Welcome to HESS Consortium - ${organizationName} Approved!`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #16a34a;">Welcome to HESS Consortium!</h1>
            <p>Dear ${memberName || 'Member'},</p>
            <p>Great news! Your organization <strong>${organizationName}</strong> has been approved for membership in the HESS Consortium.</p>
            <p>You can now access the full member portal with all available features and resources.</p>
            <a href="${appUrl}" 
               style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
              Access Member Portal
            </a>
            ${adminMessage ? `<p><strong>Message from admin:</strong><br>${adminMessage}</p>` : ''}
            <p>We're excited to have you as part of our consortium!</p>
            <p>Best regards,<br>HESS Consortium Team</p>
          </div>
        `;
        break;

      case 'welcome':
        subject = `Welcome to HESS Consortium - ${organizationName}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Welcome to HESS Consortium!</h1>
            <p>Thank you for registering <strong>${organizationName}</strong> with HESS Consortium.</p>
            <p>Your application is currently under review. We will notify you once it has been processed.</p>
            <p>You can check your application status by logging into the member portal:</p>
            <a href="${appUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
              Member Portal
            </a>
            <p>If you have questions, please contact us at support@hessconsortium.org.</p>
            <p>Best regards,<br>HESS Consortium Team</p>
          </div>
        `;
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    const emailResponse = await resend.emails.send({
      from: "HESS Consortium <noreply@hessconsortium.org>",
      to: [to],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log the email action in audit log
    await supabase.from('audit_log').insert({
      action: `email_sent_${type}`,
      entity_type: 'email',
      details: { to, organizationName, type }
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in organization-emails function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);