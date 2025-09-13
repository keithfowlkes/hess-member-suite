import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { Resend } from "npm:resend@2.0.0";

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

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  variables: string[];
}

const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  test: {
    id: 'test',
    name: 'System Test Email',
    subject: 'HESS Consortium - Email System Test',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; text-align: center;">HESS Consortium Email Test</h1>
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #666; margin-top: 0;">Test Message</h2>
          <p style="color: #333; line-height: 1.6;">{{message}}</p>
        </div>
        <div style="background-color: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">System Information</h3>
          <ul style="color: #666; line-height: 1.6;">
            <li><strong>Sent from:</strong> {{from_email}}</li>
            <li><strong>Email service:</strong> Resend</li>
            <li><strong>Timestamp:</strong> {{timestamp}}</li>
            <li><strong>Test ID:</strong> {{test_id}}</li>
          </ul>
        </div>
        <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
          If you received this email, the HESS Consortium email system is working correctly.
        </p>
      </div>
    `,
    variables: ['message', 'from_email', 'timestamp', 'test_id']
  },
  
  welcome: {
    id: 'welcome',
    name: 'Welcome Email',
    subject: 'Welcome to HESS Consortium - {{organization_name}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <center>
          <img src="http://www.hessconsortium.org/new/wp-content/uploads/2023/03/HESSlogoMasterFLAT.png" alt="HESS LOGO" style="width:230px; height:155px;">
        </center>
        <p>{{primary_contact_name}},</p>
        <p>Thank you for your registration for HESS Consortium membership. I want to welcome you and {{organization_name}} personally to membership in the HESS Consortium!</p>
        <p>{{custom_message}}</p>
        <p>Best regards,<br>HESS Consortium Team</p>
      </div>
    `,
    variables: ['organization_name', 'primary_contact_name', 'custom_message']
  },

  invoice: {
    id: 'invoice',
    name: 'Invoice Email',
    subject: 'HESS Consortium Membership Invoice - {{organization_name}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">HESS Consortium Invoice</h1>
        <p>Dear {{organization_name}},</p>
        <p>Please find your membership invoice attached.</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Invoice Details:</h3>
          <p><strong>Invoice Number:</strong> {{invoice_number}}</p>
          <p><strong>Amount:</strong> $" + "{{amount}}</p>
          <p><strong>Due Date:</strong> {{due_date}}</p>
        </div>
        <p>Payment instructions and invoice are attached.</p>
        <p>Best regards,<br>HESS Consortium Billing</p>
      </div>
    `,
    variables: ['organization_name', 'invoice_number', 'amount', 'due_date']
  },

  overdue_reminder: {
    id: 'overdue_reminder',
    name: 'Payment Overdue Reminder',
    subject: 'Payment Reminder - {{organization_name}} Membership Fee Overdue',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #dc2626; padding-bottom: 20px;">
          <h1 style="color: #dc2626; margin: 0; font-size: 2rem;">PAYMENT REMINDER</h1>
          <p style="color: #666; margin: 10px 0;">HESS Consortium Membership Fee</p>
        </div>
        <p>Dear {{organization_name}} Team,</p>
        <p>This is a friendly reminder that your HESS Consortium membership fee is currently <strong style="color: #dc2626;">overdue</strong>.</p>
        <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #dc2626; margin: 0 0 10px 0;">Outstanding Invoice Details</h3>
          <p><strong>Invoice Number:</strong> {{invoice_number}}</p>
          <p><strong>Amount Due:</strong> $" + "{{amount}}</p>
          <p><strong>Original Due Date:</strong> {{due_date}}</p>
        </div>
        <p>Please contact us if you have any questions: billing@hessconsortium.org</p>
        <p>Best regards,<br>HESS Consortium Team</p>
      </div>
    `,
    variables: ['organization_name', 'invoice_number', 'amount', 'due_date']
  },

  password_reset: {
    id: 'password_reset',
    name: 'Password Reset',
    subject: 'HESS Consortium - Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <center>
          <img src="http://www.hessconsortium.org/new/wp-content/uploads/2023/03/HESSlogoMasterFLAT.png" alt="HESS LOGO" style="width:230px; height:155px;">
        </center>
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        <p>Hello {{user_name}},</p>
        <p>We received a request to reset your password for your HESS Consortium account.</p>
        {{login_hint_section}}
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{reset_link}}" 
             style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Reset Your Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          <strong>Important:</strong> This reset link will expire in 24 hours. If you didn't request this password reset, you can safely ignore this email.
        </p>
        <hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px; text-align: center;">
          Questions? Contact us at support@members.hessconsortium.app<br>
          HESS Consortium - Higher Education Systems & Services Consortium
        </p>
      </div>
    `,
    variables: ['user_name', 'reset_link', 'expiry_time', 'login_hint_section']
  },

  welcome_approved: {
    id: 'welcome_approved',
    name: 'New Member Welcome (Approved)',
    subject: 'Welcome to HESS Consortium - {{organization_name}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <center>
          <img src="http://www.hessconsortium.org/new/wp-content/uploads/2023/03/HESSlogoMasterFLAT.png" alt="HESS LOGO" style="width:230px; height:155px;">
        </center>
        <p>{{primary_contact_name}},</p>
        <p>Thank you for your registration for HESS Consortium membership. I want to welcome you and {{organization_name}} personally to membership in the HESS Consortium!</p>
        <p>{{custom_message}}</p>
        <p>Best regards,<br>HESS Consortium Team</p>
      </div>
    `,
    variables: ['organization_name', 'primary_contact_name', 'custom_message']
  },

  member_registration: {
    id: 'member_registration',
    name: 'New Member Registration',
    subject: 'New Member Registration - {{organization_name}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <center>
          <img src="http://www.hessconsortium.org/new/wp-content/uploads/2023/03/HESSlogoMasterFLAT.png" alt="HESS LOGO" style="width:230px; height:155px;">
        </center>
        <h2 style="color: #2563eb;">New Member Registration</h2>
        <p>A new member registration has been submitted:</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Organization Details:</h3>
          <p><strong>Organization:</strong> {{organization_name}}</p>
          <p><strong>Contact:</strong> {{primary_contact_name}}</p>
          <p><strong>Email:</strong> {{contact_email}}</p>
        </div>
        <p>Please review and approve this registration in the admin dashboard.</p>
      </div>
    `,
    variables: ['organization_name', 'primary_contact_name', 'contact_email']
  },

  profile_update_approved: {
    id: 'profile_update_approved',
    name: 'Profile Update Request Approved',
    subject: 'Profile Update Approved - {{organization_name}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <center>
          <img src="http://www.hessconsortium.org/new/wp-content/uploads/2023/03/HESSlogoMasterFLAT.png" alt="HESS LOGO" style="width:230px; height:155px;">
        </center>
        <h2 style="color: #2563eb;">Profile Update Request Approved</h2>
        <p>Dear {{primary_contact_name}},</p>
        <p>Your profile update request for {{organization_name}} has been approved and processed.</p>
        <p>{{custom_message}}</p>
        <p>Thank you for keeping your organization information up to date.</p>
        <p>Best regards,<br>HESS Consortium Team</p>
      </div>
    `,
    variables: ['organization_name', 'primary_contact_name', 'custom_message']
  },

  member_info_update: {
    id: 'member_info_update',
    name: 'Member Information Update Request',
    subject: 'Member Information Update Request - {{organization_name}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <center>
          <img src="http://www.hessconsortium.org/new/wp-content/uploads/2023/03/HESSlogoMasterFLAT.png" alt="HESS LOGO" style="width:230px; height:155px;">
        </center>
        <h2 style="color: #2563eb;">Member Information Update Request</h2>
        <p>A member information update request has been submitted:</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Update Details:</h3>
          <p><strong>Organization:</strong> {{organization_name}}</p>
          <p><strong>Requested by:</strong> {{primary_contact_name}}</p>
          <p><strong>Request Date:</strong> {{request_date}}</p>
        </div>
        <p>Please review this update request in the admin dashboard.</p>
      </div>
    `,
    variables: ['organization_name', 'primary_contact_name', 'request_date']
  },

  analytics_feedback: {
    id: 'analytics_feedback',
    name: 'Analytics Dashboard Feedback',
    subject: 'Member Analytics Feedback from {{member_name}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
          Member Analytics Dashboard Feedback
        </h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #495057; margin: 0 0 15px 0;">Feedback Details</h3>
          <p><strong>Name:</strong> {{member_name}}</p>
          <p><strong>Email:</strong> {{member_email}}</p>
          <p><strong>Organization:</strong> {{organization_name}}</p>
          <p><strong>Submitted:</strong> {{timestamp}}</p>
        </div>
        <div style="background-color: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #495057; margin: 0 0 15px 0;">Analytics Request</h3>
          <div style="white-space: pre-wrap; color: #212529; line-height: 1.6;">{{feedback_message}}</div>
        </div>
        <div style="background-color: #e7f3ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #004085;">
            <strong>Note:</strong> This feedback was submitted through the Member Analytics dashboard.
          </p>
        </div>
      </div>
    `,
    variables: ['member_name', 'member_email', 'organization_name', 'timestamp', 'feedback_message']
  }
};

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

function replaceTemplateVariables(content: string, data: Record<string, string>): string {
  let result = content;
  Object.entries(data).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value || '');
  });
  return result;
}

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
  
  return { valid: errors.length === 0, errors };
}

async function logEmailActivity(emailData: EmailRequest, result: any, success: boolean) {
  try {
    const typeKey = (emailData.type as string).replace(/-/g, '_').replace('organization', 'welcome');
    await supabase.from('email_logs').insert({
      email_type: emailData.type,
      recipient: Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
      subject: emailData.subject || EMAIL_TEMPLATES[typeKey]?.subject || 'No Subject',
      success,
      result_data: result,
      sent_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log email activity:', error);
  }
}

const handler = async (req: Request): Promise<Response> => {
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
    const emailRequest: EmailRequest = await req.json();
    console.log('Centralized email request:', { type: emailRequest.type, to: emailRequest.to });

    // Validate email request
    const validation = await validateEmailDelivery(emailRequest);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, errors: validation.errors }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Normalize type and get email template
    const typeKeyBase = (emailRequest.type || 'test').toString().replace(/-/g, '_');
    const typeKey = typeKeyBase === 'organization' ? 'welcome' : typeKeyBase;

    let template = EMAIL_TEMPLATES[typeKey];
    if (!template && emailRequest.template) {
      // Custom template provided
      template = {
        id: 'custom',
        name: 'Custom Template',
        subject: emailRequest.subject || 'HESS Consortium Email',
        html: emailRequest.template,
        variables: []
      };
    }


    if (!template) {
      throw new Error(`No template found for email type: ${emailRequest.type}`);
    }

    // Prepare template data with defaults for ALL possible variables
    const templateData = {
      timestamp: new Date().toISOString(),
      test_id: crypto.randomUUID(),
      from_email: Deno.env.get('RESEND_FROM') || 'HESS Consortium <onboarding@resend.dev>',
      message: 'This is a test email from the HESS Consortium email system.',
      organization_name: 'Test Organization',
      primary_contact_name: 'Test Contact',
      custom_message: 'This is a test message.',
      invoice_number: 'INV-TEST-001',
      amount: '299.00',
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      ...emailRequest.data
    };

    // Replace variables in subject and HTML
    const finalSubject = replaceTemplateVariables(emailRequest.subject || template.subject, templateData);
    const finalHtml = replaceTemplateVariables(template.html, templateData);

    // Determine sender: prefer DB setting, fallback to env, then sandbox
    let configuredFrom = '';
    try {
      const { data: fromRow } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'email_from')
        .maybeSingle();
      configuredFrom = (fromRow?.setting_value as string) || '';
    } catch (_) {}
    const fromEnv = Deno.env.get('RESEND_FROM') || '';
    const fromCandidate = configuredFrom || fromEnv;

    // Validate basic format (supports "Name <email@domain>")
    const emailMatch = fromCandidate.match(/<?([^<>@\s]+@[^<>@\s]+\.[^<>@\s]+)>?$/);
    const candidateEmail = emailMatch ? emailMatch[1] : fromCandidate;
    const hasValidFormat = /^(?:[^<>@\s]+@[^<>@\s]+\.[^<>@\s]+|.+\s<[^<>@\s]+@[^<>@\s]+\.[^<>@\s]+>)$/.test(fromCandidate);

    // If domain is not verified in Resend, fall back to sandbox sender to avoid 403
    let finalFrom = hasValidFormat ? fromCandidate : 'HESS Consortium <onboarding@resend.dev>';
    try {
      const apiKeyPresent = !!Deno.env.get('RESEND_API_KEY');
      if (apiKeyPresent && candidateEmail.includes('@')) {
        const domain = candidateEmail.split('@')[1];
        const domainsResponse = await resend.domains.list();
        const verified = Array.isArray(domainsResponse?.data?.data)
          ? domainsResponse.data.data.some((d: any) => d.name === domain && d.status === 'verified')
          : false;
        console.log('[centralized-email-delivery] From check', { fromCandidate, candidateEmail, domain, verified });
        if (!verified) {
          finalFrom = 'HESS Consortium <onboarding@resend.dev>';
        }
      }
    } catch (e) {
      console.log('[centralized-email-delivery] Domain verification check failed, using candidate', { error: e?.message });
    }


    // Ensure API key is configured
    if (!Deno.env.get('RESEND_API_KEY')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Resend API key is not configured. Please set RESEND_API_KEY secret.' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    // Prepare email payload
    const emailPayload: any = {
      from: finalFrom,
      to: Array.isArray(emailRequest.to) ? emailRequest.to : [emailRequest.to],
      subject: finalSubject,
      html: finalHtml,
    };

    // Add attachments if provided
    if (emailRequest.attachments && emailRequest.attachments.length > 0) {
      emailPayload.attachments = emailRequest.attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType
      }));
    }

    // Send email
    const emailResponse = await resend.emails.send(emailPayload);

    if (emailResponse?.error) {
      console.error('❌ Resend rejected email:', emailResponse.error);
      await logEmailActivity(emailRequest, emailResponse.error, false);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: emailResponse.error.message,
          code: emailResponse.error.statusCode || 502
        }),
        { 
          status: emailResponse.error.statusCode || 502, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    console.log('✅ Email sent successfully:', emailResponse.data);
    await logEmailActivity(emailRequest, emailResponse.data, true);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email sent successfully to ${Array.isArray(emailRequest.to) ? emailRequest.to.length : 1} recipient(s)`,
        emailId: emailResponse.data?.id,
        timestamp: new Date().toISOString(),
        template: template.name,
        recipients: Array.isArray(emailRequest.to) ? emailRequest.to : [emailRequest.to]
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in centralized-email-delivery function:", error);
    
    let errorMessage = "Unknown error occurred";
    let statusCode = 500;
    
    if (error.message) {
      errorMessage = error.message;
    }
    
    // Handle specific Resend errors
    if (error.message?.includes("domain")) {
      errorMessage = "Domain verification required. Please verify your domain in Resend account.";
      statusCode = 400;
    } else if (error.message?.includes("API key")) {
      errorMessage = "Invalid API key. Please check your Resend API key configuration.";
      statusCode = 401;
    } else if (error.message?.includes("rate limit")) {
      errorMessage = "Rate limit exceeded. Please wait before sending another email.";
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