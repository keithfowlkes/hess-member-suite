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

// Function to get email template from system_settings table (primary) or system_messages (fallback)
async function getEmailTemplate(emailType: string): Promise<EmailTemplate | null> {
  try {
    // First, try to get template from system_settings (where UI saves templates)
    let settingKey = '';
    switch (emailType) {
      case 'welcome':
      case 'welcome_approved':
        settingKey = 'welcome_message_template';
        break;
      case 'password_reset':
        settingKey = 'password_reset_message';
        break;
      case 'profile_update':
      case 'profile_update_approved':
        settingKey = 'profile_update_message_template';
        break;
      case 'member_info_update':
        settingKey = 'email_member_info_update_template';
        break;
      default:
        settingKey = `${emailType}_message_template`;
    }

    // Try to get from system_settings first
    const { data: settingTemplate, error: settingError } = await supabase
      .from('system_settings')
      .select('setting_value, setting_key')
      .eq('setting_key', settingKey)
      .maybeSingle();

    if (!settingError && settingTemplate?.setting_value) {
      console.log(`Found template in system_settings for: ${emailType}`);
      return {
        id: emailType,
        name: `${emailType.charAt(0).toUpperCase() + emailType.slice(1)} Template`,
        subject: (emailType === 'welcome' || emailType === 'welcome_approved') ? 'Welcome to HESS Consortium!' : 
                emailType === 'password_reset' ? 'Password Reset Request' :
                (emailType === 'profile_update' || emailType === 'profile_update_approved' || emailType === 'member_info_update') ? 'Profile Update Approved' :
                'HESS Consortium Notification',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
            <center>
              <img src="http://www.hessconsortium.org/new/wp-content/uploads/2023/03/HESSlogoMasterFLAT.png" alt="HESS LOGO" style="width:230px; height:155px;">
            </center>
            <div style="margin-top: 20px;">
              ${settingTemplate.setting_value}
            </div>
          </div>
        `,
        variables: []
      };
    }

    // Fallback to system_messages table
    console.log(`No template found in system_settings for ${emailType}, trying system_messages`);
    const { data: messageTemplate, error } = await supabase
      .from('system_messages')
      .select('title, content, email_type')
      .eq('email_type', emailType)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !messageTemplate) {
      console.log(`No template found for email type: ${emailType}`, error);
      return null;
    }

    return {
      id: emailType,
      name: messageTemplate.title,
      subject: messageTemplate.title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <center>
            <img src="http://www.hessconsortium.org/new/wp-content/uploads/2023/03/HESSlogoMasterFLAT.png" alt="HESS LOGO" style="width:230px; height:155px;">
          </center>
          ${messageTemplate.content}
        </div>
      `,
      variables: []
    };
  } catch (error) {
    console.error(`Error fetching template for ${emailType}:`, error);
    return null;
  }
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
      subject: emailData.subject || 'Profile Update Notification',
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

    // Normalize type and get email template from system_messages
    const typeKeyBase = (emailRequest.type || 'test').toString().replace(/-/g, '_');
    const typeKey = typeKeyBase === 'organization' ? 'welcome' : typeKeyBase;

    let template = await getEmailTemplate(typeKey);
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