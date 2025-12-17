import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { getEmailTemplate, replaceTemplateVariables, EmailTemplate } from '../_shared/email-templates.ts';
import { getEmailDesignSettings, replaceColorVariables } from '../_shared/email-design.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type:
    | 'test'
    | 'invoice'
    | 'welcome'
    | 'welcome_approved'
    | 'member_registration'
    | 'profile_update_approved'
    | 'member_info_update'
    | 'analytics_feedback'
    | 'organization'
    | 'password_reset'
    | 'password-reset'
    | 'overdue_reminder'
    | 'overdue-reminder'
    | 'organization_update_alert'
    | 'contact_transfer'
    | 'contact_transfer_complete'
    | 'custom';
  to: string | string[];
  subject?: string;
  template?: string;
  data?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
 );
 
 const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
 
 console.log('[centralized-email-delivery] Initialized', {
   hasApiKey: !!Deno.env.get('RESEND_API_KEY'),
   supabaseUrlSet: !!Deno.env.get('SUPABASE_URL')
 });

async function validateEmailDelivery(emailData: EmailRequest): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  if (!emailData.to || (Array.isArray(emailData.to) && emailData.to.length === 0)) {
    errors.push('Recipient email address is required');
  }
  
  if (Array.isArray(emailData.to)) {
    emailData.to.forEach(email => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`Invalid email format: ${email}`);
      }
    });
  } else {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailData.to)) {
      errors.push(`Invalid email format: ${emailData.to}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

async function logEmailActivity(emailData: EmailRequest, success: boolean, result: any) {
  try {
    const recipients = Array.isArray(emailData.to) ? emailData.to : [emailData.to];
    
    for (const recipient of recipients) {
      await supabase
        .from('email_logs')
        .insert({
          email_type: emailData.type || 'unknown',
          recipient: recipient,
          subject: emailData.subject || 'No Subject',
          success: success,
          result_data: result
        });
    }
  } catch (error) {
    console.error('Failed to log email activity:', error);
  }
}

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
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }

  try {
    const emailRequest: EmailRequest = await req.json();
    
    console.log('[centralized-email-delivery] Incoming request:', {
      type: emailRequest.type,
      to: Array.isArray(emailRequest.to) ? emailRequest.to : [emailRequest.to],
      hasSubject: !!emailRequest.subject,
      hasTemplate: !!emailRequest.template,
      hasData: !!emailRequest.data
    });

    // Validate email request
    const validation = await validateEmailDelivery(emailRequest);
    if (!validation.valid) {
      console.error('[centralized-email-delivery] Validation failed:', validation.errors);
      return new Response(
        JSON.stringify({ 
          error: "Email validation failed", 
          details: validation.errors 
        }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    // Get configured sender email
    const { data: fromSetting } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'email_from')
      .maybeSingle();

    const fromEmail = fromSetting?.setting_value || 'HESS Consortium <support@members.hessconsortium.app>';

    // Check domain verification for Resend
    const senderDomain = fromEmail.includes('<') 
      ? fromEmail.match(/<(.+?)>/)?.[1]?.split('@')[1] 
      : fromEmail.split('@')[1];

    let finalFromEmail = fromEmail;
    
    // For unverified domains or sandbox mode, use resend sandbox
    const knownVerifiedDomains = ['members.hessconsortium.app'];
    if (!senderDomain || !knownVerifiedDomains.includes(senderDomain)) {
      finalFromEmail = 'HESS Consortium <onboarding@resend.dev>';
    }

    console.log('[centralized-email-delivery] From check', {
      fromCandidate: fromEmail,
      candidateEmail: finalFromEmail,
      domain: senderDomain,
      verified: knownVerifiedDomains.includes(senderDomain || '')
    });

    // Prepare template data with defaults
    const templateData = {
      timestamp: new Date().toISOString(),
      user_name: 'Member',
      organization_name: 'Your Organization',
      from_email: finalFromEmail,
      message: 'This is a notification from the HESS Consortium.',
      ...emailRequest.data
    } as Record<string, string>;

    // Get template based on email type
    let template: EmailTemplate | null = null;
    let finalSubject = emailRequest.subject || 'HESS Consortium Notification';
    let finalHtml = '';

    if (emailRequest.type === 'custom' && emailRequest.template) {
      // For custom emails with template provided
      finalHtml = replaceTemplateVariables(emailRequest.template, templateData);
    } else if (emailRequest.type === 'contact_transfer') {
      // Contact transfer request email
      finalSubject = `Primary Contact Transfer Request - ${templateData.organization_name}`;
      const designSettings = await getEmailDesignSettings();
      let transferTemplate = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: {{text_color}};">
          <h2 style="color: {{primary_color}};">Primary Contact Transfer Request</h2>
          <p>You have been invited to become the primary contact for <strong>${templateData.organization_name}</strong> in the HESS Consortium Member Portal.</p>
          <p><strong>${templateData.current_contact_name}</strong> (${templateData.current_contact_email}) has initiated this transfer.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${templateData.transfer_link}" style="background-color: {{primary_color}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Accept Transfer</a>
          </div>
          <p style="color: #666; font-size: 14px;">This transfer request will expire on ${templateData.expires_at}.</p>
          <p>If you did not expect this transfer request or have questions, please contact the HESS Consortium.</p>
          <p>Best regards,<br><span style="color: {{primary_color}};">HESS Consortium Team</span></p>
        </div>
      `;
      finalHtml = replaceColorVariables(transferTemplate, designSettings);
    } else if (emailRequest.type === 'contact_transfer_complete') {
      // Contact transfer completion email
      const isNewContact = templateData.is_new_contact === 'true' || templateData.is_new_contact === true;
      finalSubject = `Primary Contact Transfer ${isNewContact ? 'Accepted' : 'Completed'} - ${templateData.organization_name}`;
      const designSettings = await getEmailDesignSettings();
      let completeTemplate = isNewContact ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: {{text_color}};">
          <h2 style="color: {{primary_color}};">You Are Now the Primary Contact</h2>
          <p>Congratulations! You are now the primary contact for <strong>${templateData.organization_name}</strong> in the HESS Consortium Member Portal.</p>
          <p>As the primary contact, you can:</p>
          <ul>
            <li>Update your organization's profile information</li>
            <li>Manage software system information</li>
            <li>Transfer primary contact to another person if needed</li>
          </ul>
          <div style="margin: 30px 0; text-align: center;">
            <a href="https://members.hessconsortium.app/profile" style="background-color: {{primary_color}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Your Profile</a>
          </div>
          <p>Best regards,<br><span style="color: {{primary_color}};">HESS Consortium Team</span></p>
        </div>
      ` : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: {{text_color}};">
          <h2 style="color: {{primary_color}};">Primary Contact Transfer Complete</h2>
          <p>The primary contact role for <strong>${templateData.organization_name}</strong> has been successfully transferred to ${templateData.new_contact_email}.</p>
          <p>You are no longer the primary contact for this organization. If you believe this was done in error, please contact the HESS Consortium.</p>
          <p>Best regards,<br><span style="color: {{primary_color}};">HESS Consortium Team</span></p>
        </div>
      `;
      finalHtml = replaceColorVariables(completeTemplate, designSettings);
    } else {
      // Get template from database
      const emailType = emailRequest.type?.replace(/-/g, '_') || 'test';
      template = await getEmailTemplate(emailType, true); // Include recipients for welcome emails
      
      if (template) {
        finalSubject = replaceTemplateVariables(emailRequest.subject || template.subject, templateData);
        finalHtml = replaceTemplateVariables(template.html, templateData);
      } else {
        // Fallback template with design system integration
        const designSettings = await getEmailDesignSettings();
        let fallbackTemplate = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: {{text_color}};">
            <h2 style="color: {{primary_color}};">HESS Consortium</h2>
            <p>${templateData.message}</p>
            <p>Best regards,<br><span style="color: {{primary_color}};">HESS Consortium Team</span></p>
          </div>
        `;
        finalHtml = replaceColorVariables(fallbackTemplate, designSettings);
      }
    }

    console.log('[centralized-email-delivery] Final email details:');
    console.log('[centralized-email-delivery] Subject:', finalSubject);
    console.log('[centralized-email-delivery] HTML length:', finalHtml.length);
    console.log('[centralized-email-delivery] HTML preview:', finalHtml.substring(0, 300) + '...');

    // Prepare email payload
    const emailPayload: any = {
      from: finalFromEmail,
      to: Array.isArray(emailRequest.to) ? emailRequest.to : [emailRequest.to],
      subject: finalSubject,
      html: finalHtml,
    };

    // Add CC recipients for welcome emails
    if ((emailRequest.type === 'welcome' || emailRequest.type === 'welcome_approved') && (template as any)?.ccRecipients) {
      const ccRecipients = (template as any).ccRecipients as string[];
      if (ccRecipients.length > 0) {
        emailPayload.cc = ccRecipients;
        console.log(`[centralized-email-delivery] Adding CC recipients for ${emailRequest.type}:`, ccRecipients);
      }
    }

    // Add attachments if provided
    if (emailRequest.attachments && emailRequest.attachments.length > 0) {
      emailPayload.attachments = emailRequest.attachments.map(attachment => ({
        filename: attachment.filename,
        content: attachment.content,
        content_type: attachment.contentType
      }));
    }

    // Send email via Resend
    const emailResponse = await resend.emails.send(emailPayload);

    if (emailResponse.error) {
      console.error('❌ Email send failed:', emailResponse.error);
      await logEmailActivity(emailRequest, false, emailResponse.error);
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to send email", 
          details: emailResponse.error 
        }),
        { 
          status: 500, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    console.log('✅ Email sent successfully:', emailResponse.data);
    await logEmailActivity(emailRequest, true, emailResponse.data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResponse.data?.id,
        message: "Email sent successfully" 
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error('❌ Email delivery error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
};

serve(handler);