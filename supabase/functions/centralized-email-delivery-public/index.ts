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

const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  test: {
    id: 'test',
    name: 'System Test Email',
    subject: 'HESS Consortium - Email System Test',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; text-align: center;">HESS Consortium Email Test</h1>
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px  0;">
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
};

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

    const template = EMAIL_TEMPLATES[typeKey] ?? EMAIL_TEMPLATES['test'];
    const finalSubject = replaceTemplateVariables(emailRequest.subject || template.subject, templateData);
    const finalHtml = replaceTemplateVariables(template.html, templateData);

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
      const domains = (domainsCheck as any)?.data ?? [];
      try {
        const fromEmail = extractEmail(finalFrom);
        const fromDomain = fromEmail.split('@')[1]?.toLowerCase();
        const domainEntry = domains.find((d: any) => (d.name || d.domain || '').toLowerCase() === fromDomain);
        console.log('[centralized-email-delivery-public] Preflight domains', {
          correlationId,
          fromDomain,
          domainFound: !!domainEntry,
          status: domainEntry?.status || domainEntry?.verification?.status,
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
        JSON.stringify({ success: false, error: emailResponse.error.message, note: 'Domain likely not verified; sandbox fallback failed', statusCode: emailResponse.error.statusCode, name: emailResponse.error.name, correlationId }),
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