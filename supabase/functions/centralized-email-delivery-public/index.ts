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

    // For test emails, always use sandbox sender to avoid domain issues
    const isTest = (emailRequest.type || 'test').toString().replace(/-/g, '_') === 'test';
    const finalFrom = isTest ? 'HESS Consortium <onboarding@resend.dev>' : fromCandidate;

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

    if (!Deno.env.get('RESEND_API_KEY')) {
      console.error('[centralized-email-delivery-public] Missing RESEND_API_KEY');
      return new Response(JSON.stringify({ success: false, error: 'Resend API key is not configured.' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const emailPayload: any = {
      from: finalFrom,
      to: Array.isArray(emailRequest.to) ? emailRequest.to : [emailRequest.to],
      subject: finalSubject,
      html: finalHtml,
    };

    // Try send; on 403 (domain not verified), retry with Resend sandbox sender
    let emailResponse = await resend.emails.send(emailPayload);
    if (emailResponse?.error && emailResponse.error.statusCode === 403) {
      const sandboxFrom = 'HESS Consortium <onboarding@resend.dev>';
      const retryPayload = { ...emailPayload, from: sandboxFrom };
      const retry = await resend.emails.send(retryPayload);
      if (!retry.error) {
        return new Response(
          JSON.stringify({ success: true, message: 'Email sent (fallback sandbox sender)', emailId: retry.data?.id, timestamp: new Date().toISOString() }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      // If retry also failed, return original 403 error
      return new Response(
        JSON.stringify({ success: false, error: emailResponse.error.message, note: 'Domain likely not verified; sandbox fallback failed' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (emailResponse?.error) {
      return new Response(
        JSON.stringify({ success: false, error: emailResponse.error.message }),
        { status: emailResponse.error.statusCode || 502, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent', emailId: emailResponse.data?.id, timestamp: new Date().toISOString() }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message || 'Unknown error' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});