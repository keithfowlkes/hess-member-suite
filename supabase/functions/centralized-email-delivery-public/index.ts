import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { getEmailTemplate, replaceTemplateVariables, EmailTemplate, replaceLogoInTemplate } from '../_shared/email-templates.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
    
    // For custom template types, use the provided template directly (with logo replacement)
    // For invoice type with invoice_content, enhance the template
    let finalHtml;
    if (emailRequest.type === 'custom' && emailRequest.template) {
      finalHtml = await replaceLogoInTemplate(emailRequest.template);
    } else if (emailRequest.type === 'invoice' && templateData.invoice_content) {
      // Enhanced invoice template that includes the full invoice HTML
      const enhancedTemplate = `
        <div style="margin: 20px 0;">
          ${template?.html || ''}
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
      const fallbackContent = emailRequest.template || templateData.message || 'No content provided';
      finalHtml = await replaceLogoInTemplate(fallbackContent);
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
        domainVerified = domains.some((d: any) => d.name?.toLowerCase() === candidateDomain && d.status === 'verified');
        console.log('[centralized-email-delivery-public] Domain verification', {
          correlationId,
          candidateDomain,
          domainVerified,
          availableDomains: domains.map((d: any) => ({ name: d.name, status: d.status })),
        });
      } catch (e: any) {
        console.warn('[centralized-email-delivery-public] Could not check domain verification', { correlationId, error: e?.message });
      }
    } catch (e: any) {
      console.error('[centralized-email-delivery-public] Failed to verify Resend API key', { correlationId, error: e?.message || e });
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to verify Resend API key', details: e?.message || e, correlationId }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // If this is a test email and the domain is verified (and not forcing sandbox), use the verified domain sender
    if (isTest && domainVerified && !forceSandbox) {
      const adjustedFrom = ensureDomain(fromCandidate);
      if (adjustedFrom !== finalFrom) {
        finalFrom = adjustedFrom;
        console.log('[centralized-email-delivery-public] Adjusting sender to verified domain for test', { correlationId, from: adjustedFrom });
      }
    }

    // Validate required environment
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

    if (emailRequest.attachments?.length) {
      emailPayload.attachments = emailRequest.attachments;
    }

    // Try send; on 403 (domain not verified), retry with Resend sandbox sender
    console.log('[centralized-email-delivery-public] Send attempt', { correlationId, from: emailPayload.from, toCount: emailPayload.to?.length, subject: emailPayload.subject });
    let emailResponse = await resend.emails.send(emailPayload);
    if (emailResponse.error) {
      console.error('[centralized-email-delivery-public] Send error', { correlationId, statusCode: (emailResponse.error as any)?.statusCode, name: emailResponse.error.name, message: emailResponse.error.message });
    } else {
      console.log('[centralized-email-delivery-public] Send success', { correlationId, id: emailResponse?.data?.id });
    }

    if (emailResponse.error && (emailResponse.error as any)?.statusCode === 403) {
      const sandboxFrom = 'HESS Consortium <onboarding@resend.dev>';
      const retryPayload = { ...emailPayload, from: sandboxFrom };
      const retry = await resend.emails.send(retryPayload);
      if (!retry.error) {
        return new Response(
          JSON.stringify({ success: true, message: 'Email sent (fallback sandbox sender)', emailId: retry.data?.id, timestamp: new Date().toISOString(), correlationId }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Email sending failed',
            details: retry.error,
            note: 'Sending failed. If you are on the Resend free plan, you must verify recipient emails at https://resend.com/verified-emails or use a verified domain.',
            correlationId,
          }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    if (emailResponse.error) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email sending failed', details: emailResponse.error, correlationId }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully', emailId: emailResponse.data?.id, timestamp: new Date().toISOString(), correlationId }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error: any) {
    console.error('[centralized-email-delivery-public] Unexpected error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message || 'Unknown error' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});