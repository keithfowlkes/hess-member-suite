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
  // Optional flags
  forceSandbox?: boolean;
  debug?: boolean;
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
        settingKey = 'welcome_message_template';
        break;
      case 'password_reset':
        settingKey = 'password_reset_message';
        break;
      case 'profile_update':
      case 'profile_update_approved':
        settingKey = 'profile_update_message_template';
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
        subject: emailType === 'welcome' ? 'Welcome to HESS Consortium!' : 
                emailType === 'password_reset' ? 'Password Reset Request' :
                (emailType === 'profile_update' || emailType === 'profile_update_approved') ? 'Profile Update Approved' :
                'HESS Consortium Notification',
        html: settingTemplate.setting_value || `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            {{message}}
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
      html: messageTemplate.content || `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          {{message}}
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

function replaceTemplateVariables(content: string, data: Record<string, string>): string {
  let result = content;
  Object.entries(data).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value || '');
  });
  return result;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } });

  try {
    const emailRequest: EmailRequest = await req.json();
    const correlationId = crypto.randomUUID();
    const startTs = new Date().toISOString();
    console.log('[centralized-email-delivery-public] Incoming request', {
      correlationId,
      type: emailRequest.type,
      toCount: Array.isArray(emailRequest.to) ? emailRequest.to.length : 1,
      debug: emailRequest.debug ?? false,
      startTs,
    });

    // Determine sender
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
    const fromCandidate = configuredFrom || fromEnv || 'HESS Consortium <onboarding@resend.dev>';

    // For test or forced sandbox emails, use sandbox sender; otherwise enforce verified domain
    const isTest = (emailRequest.type || 'test').toString().replace(/-/g, '_') === 'test';
    const forceSandbox = emailRequest.forceSandbox === true;
    const verifiedDomain = 'members.hessconsortium.app';

    const extractEmail = (fromStr: string) => {
      const match = fromStr.match(/<(.*?)>/);
      return (match ? match[1] : fromStr).trim();
    };
    const ensureDomain = (fromStr: string) => {
      try {
        const email = extractEmail(fromStr);
        const domain = email.split('@')[1]?.toLowerCase();
        if (domain === verifiedDomain) return fromStr;
        const nameMatch = fromStr.match(/^(.*?)</);
        const display = nameMatch ? nameMatch[1].trim() : 'HESS Consortium';
        return `${display} <no-reply@${verifiedDomain}>`;
      } catch {
        return `HESS Consortium <no-reply@${verifiedDomain}>`;
      }
    };
    
    let domainVerified = false;

    let finalFrom = (isTest || forceSandbox)
      ? 'HESS Consortium <onboarding@resend.dev>'
      : ensureDomain(fromCandidate);

    console.log('[centralized-email-delivery-public] Sender selection', {
      correlationId,
      configuredFrom,
      fromEnv,
      fromCandidate,
      finalFrom,
      isTest,
      forceSandbox,
    });

    // Prepare template data
    const templateData = {
      timestamp: new Date().toISOString(),
      test_id: crypto.randomUUID(),
      from_email: finalFrom,
      message: 'This is a test email from the HESS Consortium email system.',
      organization_name: 'Test Organization',
      primary_contact_name: 'Test Contact',
      custom_message: 'This is a test message.',
      ...emailRequest.data,
    } as Record<string, string>;

    const typeKeyBase = (emailRequest.type || 'test').toString().replace(/-/g, '_');
    const typeKey = typeKeyBase === 'organization' ? 'welcome' : typeKeyBase;

    let template = null;
    if (emailRequest.type !== 'custom') {
      template = await getEmailTemplate(typeKey);
      if (!template && emailRequest.type !== 'test') {
        throw new Error(`No template found for email type: ${emailRequest.type}`);
      }
    }
    
    // For custom types without template, create a minimal template
    if (!template && emailRequest.type !== 'custom') {
      template = {
        id: typeKey,
        name: 'Default Template',
        subject: emailRequest.subject || 'HESS Consortium Notification',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            {{message}}
          </div>
        `,
        variables: []
      };
    }
    
    const finalSubject = replaceTemplateVariables(emailRequest.subject || (template?.subject ?? 'HESS Consortium Notification'), templateData);
    
    // For custom template types, use the provided template directly
    // For invoice type with invoice_content, enhance the template
    let finalHtml;
    if (emailRequest.type === 'custom' && emailRequest.template) {
      finalHtml = emailRequest.template;
    } else if (emailRequest.type === 'invoice' && templateData.invoice_content) {
      // Enhanced invoice template that includes the full invoice HTML
      const enhancedTemplate = `
        <div style="margin: 20px 0;">
          ${template.html}
        </div>
        <div style="margin-top: 30px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          ${templateData.invoice_content}
        </div>
      `;
      finalHtml = replaceTemplateVariables(enhancedTemplate, templateData);
    } else if (template) {
      finalHtml = replaceTemplateVariables(template.html, templateData);
    } else {
      // Fallback for custom emails without template
      finalHtml = emailRequest.template || templateData.message || 'No content provided';
    }

    // Preflight: verify API key with domains.list()
    try {
      const domainsCheck = await resend.domains.list();
      if ((domainsCheck as any)?.error) {
        console.error('[centralized-email-delivery-public] Resend domains.list error', { correlationId, error: (domainsCheck as any).error });
        return new Response(
          JSON.stringify({ success: false, error: 'Resend API key rejected by Resend (domains.list)', details: (domainsCheck as any).error, correlationId }),
          { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      const domains = (domainsCheck as any)?.data?.data ?? [];
      try {
        const candidateFromVerified = ensureDomain(fromCandidate);
        const candidateEmail = extractEmail(candidateFromVerified);
        const candidateDomain = candidateEmail.split('@')[1]?.toLowerCase();
        const domainEntry = domains.find((d: any) => (d.name || d.domain || '').toLowerCase() === candidateDomain);
        domainVerified = (domainEntry?.status || domainEntry?.verification?.status) === 'verified';
        console.log('[centralized-email-delivery-public] Preflight domains', {
          correlationId,
          candidateDomain,
          checkingFrom: candidateFromVerified,
          domainFound: !!domainEntry,
          status: domainEntry?.status || domainEntry?.verification?.status,
          domainVerified,
          domainsCount: Array.isArray(domains) ? domains.length : 0,
        });
      } catch (e) {
        console.warn('[centralized-email-delivery-public] Preflight domain parse failed', { correlationId, error: String(e) });
      }
    } catch (e: any) {
      console.error('[centralized-email-delivery-public] Failed to verify Resend API key', { correlationId, error: e?.message || e });
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to verify Resend API key', details: e?.message || e, correlationId }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // If this is a test email and the domain is verified (and not forcing sandbox), use the verified domain sender
    if (isTest && !forceSandbox && domainVerified) {
      const adjustedFrom = ensureDomain(fromCandidate);
      if (adjustedFrom !== finalFrom) {
        console.log('[centralized-email-delivery-public] Adjusting sender to verified domain for test', { correlationId, from: adjustedFrom });
      }
      finalFrom = adjustedFrom;
      // Keep template data accurate after adjusting sender
      try { templateData.from_email = finalFrom; } catch(_) {}
    }

    if (!Deno.env.get('RESEND_API_KEY')) {
      console.error('[centralized-email-delivery-public] Missing RESEND_API_KEY', { correlationId });
      return new Response(
        JSON.stringify({ success: false, error: 'Resend API key is not configured.', correlationId }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const emailPayload: any = {
      from: finalFrom,
      to: Array.isArray(emailRequest.to) ? emailRequest.to : [emailRequest.to],
      subject: finalSubject,
      html: finalHtml,
    };

    // Try send; on 403 (domain not verified), retry with Resend sandbox sender
    console.log('[centralized-email-delivery-public] Send attempt', { correlationId, from: emailPayload.from, toCount: emailPayload.to?.length, subject: emailPayload.subject });
    let emailResponse = await resend.emails.send(emailPayload);
    if (emailResponse?.error) {
      console.error('[centralized-email-delivery-public] Send error', { correlationId, statusCode: emailResponse.error.statusCode, name: emailResponse.error.name, message: emailResponse.error.message });
    } else {
      console.log('[centralized-email-delivery-public] Send success', { correlationId, id: emailResponse?.data?.id });
    }
    if (emailResponse?.error && emailResponse.error.statusCode === 403) {
      const sandboxFrom = 'HESS Consortium <onboarding@resend.dev>';
      const retryPayload = { ...emailPayload, from: sandboxFrom };
      const retry = await resend.emails.send(retryPayload);
      if (!retry.error) {
        return new Response(
          JSON.stringify({ success: true, message: 'Email sent (fallback sandbox sender)', emailId: retry.data?.id, timestamp: new Date().toISOString(), correlationId }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      // If retry also failed, return original 403 error
      return new Response(
        JSON.stringify({
          success: false,
          error: emailResponse?.error?.message || (typeof emailResponse?.error === 'string' ? emailResponse.error : 'Forbidden'),
          note: 'Sending failed. If you are on the Resend free plan, you must verify recipient emails at https://resend.com/verified-emails or use a verified domain.',
          statusCode: emailResponse?.error?.statusCode || 403,
          name: emailResponse?.error?.name,
          correlationId
        }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (emailResponse?.error) {
      return new Response(
        JSON.stringify({ success: false, error: emailResponse.error.message, statusCode: emailResponse.error.statusCode, name: emailResponse.error.name, correlationId }),
        { status: emailResponse.error.statusCode || 502, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent', emailId: emailResponse.data?.id, timestamp: new Date().toISOString(), correlationId }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message || 'Unknown error' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});