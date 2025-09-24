import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

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

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  variables: string[];
}

// Function to wrap content in standardized HESS email template with design system
async function wrapInStandardTemplate(content: string, logoUrl?: string): Promise<string> {
  // Get design settings from system_settings
  const { data: designSettings } = await supabase
    .from('system_settings')
    .select('setting_key, setting_value')
    .in('setting_key', [
      'email_background_image',
      'email_design_primary_color', 
      'email_design_accent_color',
      'email_design_text_color',
      'email_design_card_background'
    ]);

  // Create settings map with defaults
  const settings = {
    background_image: '',
    primary_color: '#8B7355',
    accent_color: '#D4AF37', 
    text_color: '#4A4A4A',
    card_background: 'rgba(248, 245, 238, 0.95)'
  };

  // Apply retrieved settings
  if (designSettings) {
    designSettings.forEach(setting => {
      switch (setting.setting_key) {
        case 'email_background_image':
          settings.background_image = setting.setting_value || '';
          break;
        case 'email_design_primary_color':
          settings.primary_color = setting.setting_value || '#8B7355';
          break;
        case 'email_design_accent_color':
          settings.accent_color = setting.setting_value || '#D4AF37';
          break;
        case 'email_design_text_color':
          settings.text_color = setting.setting_value || '#4A4A4A';
          break;
        case 'email_design_card_background':
          settings.card_background = setting.setting_value || 'rgba(248, 245, 238, 0.95)';
          break;
      }
    });
  }

  const emailOptimizedLogo = logoUrl 
    ? `<img src="${logoUrl}" alt="HESS Consortium Logo" style="max-width: 200px; height: auto; display: block; margin: 0 auto 20px auto;" border="0">`
    : '';

  // Determine background style based on settings
  const backgroundStyle = settings.background_image 
    ? `background-image: url('${settings.background_image}'); background-size: cover; background-position: center; background-repeat: no-repeat; min-height: 100vh; background-color: ${settings.primary_color};`
    : `background: linear-gradient(135deg, ${settings.primary_color} 0%, ${settings.accent_color} 100%); min-height: 100vh;`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HESS Consortium</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: Georgia, 'Times New Roman', serif; line-height: 1.6; ${backgroundStyle}">
    <!-- Email Container -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="min-height: 100vh; padding: 60px 20px;">
        <tr>
            <td align="center" valign="top">
                <!-- Main Content Card with Design System Background -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background: ${settings.card_background}; border-radius: 20px; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1); overflow: hidden; backdrop-filter: blur(10px);">
                    <!-- Header with Logo -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px; text-align: center;">
                            ${emailOptimizedLogo}
                            <div style="height: 3px; background: linear-gradient(90deg, ${settings.accent_color} 0%, ${settings.primary_color} 50%, ${settings.accent_color} 100%); border-radius: 2px; margin: 15px auto 0 auto; width: 120px;"></div>
                        </td>
                    </tr>
                    
                    <!-- Content Area -->
                    <tr>
                        <td style="padding: 20px 50px 40px 50px;">
                            <div style="color: ${settings.text_color}; font-size: 16px; line-height: 1.8; text-align: left;">
                                ${content}
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer with Accent -->
                    <tr>
                        <td style="background: ${settings.accent_color}20; padding: 30px 40px; border-top: 2px solid ${settings.accent_color}50; text-align: center;">
                            <p style="margin: 0; color: ${settings.primary_color}; font-size: 14px; font-weight: 500;">
                                © ${new Date().getFullYear()} HESS Consortium. All rights reserved.
                            </p>
                            <p style="margin: 8px 0 0 0; color: ${settings.primary_color}CC; font-size: 12px;">
                                This email was sent from the HESS Consortium Member Portal
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `;
}

// Function to get and replace logo URL in template with proper email embedding
async function replaceLogoInTemplate(htmlContent: string): Promise<string> {
  try {
    // Get the uploaded logo URL from system settings
    const { data: logoSetting } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'public_logo_url')
      .maybeSingle();
    
    const logoUrl = logoSetting?.setting_value;
    
    if (logoUrl && logoUrl.trim()) {
      console.log('[centralized-email-delivery-public] Using uploaded logo:', logoUrl);
      
      // Create a properly formatted img tag for email clients
      const emailOptimizedImg = `<img src="${logoUrl}" alt="HESS Consortium Logo" style="max-width: 200px; height: auto; display: block; margin: 0 auto;" border="0">`;
      
      // Replace any existing logo image sources with the uploaded logo
      let updatedContent = htmlContent;
      
      // Replace direct image URLs that might be HESS logos
      updatedContent = updatedContent.replace(
        /src="https:\/\/9f0afb12-d741-415b-9bbb-e40cfcba281a\.lovableproject\.com\/assets\/hess-logo\.png"/g,
        `src="${logoUrl}"`
      );
      
      // Replace any other existing logo references with the email-optimized version
      updatedContent = updatedContent.replace(
        /<img[^>]*src="[^"]*hess[^"]*logo[^"]*"[^>]*>/gi,
        emailOptimizedImg
      );
      
      // Replace base64 encoded images with the email-optimized version
      updatedContent = updatedContent.replace(
        /<img[^>]*src="data:image\/[^;]*;base64,[^"]*"[^>]*>/g,
        emailOptimizedImg
      );
      
      // Also replace any generic logo placeholders
      updatedContent = updatedContent.replace(
        /\{\{logo\}\}/gi,
        emailOptimizedImg
      );
      
      return updatedContent;
    }
    
    return htmlContent;
  } catch (error) {
    console.error('[centralized-email-delivery-public] Error replacing logo:', error);
    return htmlContent;
  }
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
      
      // Replace logo in template content
      const htmlWithLogo = await replaceLogoInTemplate(settingTemplate.setting_value);
      
      return {
        id: emailType,
        name: `${emailType.charAt(0).toUpperCase() + emailType.slice(1)} Template`,
        subject: emailType === 'welcome' ? 'Welcome to HESS Consortium!' : 
                emailType === 'password_reset' ? 'Password Reset Request' :
                (emailType === 'profile_update' || emailType === 'profile_update_approved') ? 'Profile Update Approved' :
                'HESS Consortium Notification',
        html: htmlWithLogo,
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

    // Replace logo in fallback template content
    const htmlWithLogo = await replaceLogoInTemplate(messageTemplate.content || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        {{message}}
      </div>
    `);

    return {
      id: emailType,
      name: messageTemplate.title,
      subject: messageTemplate.title,
      html: htmlWithLogo,
      variables: []
    };
  } catch (error) {
    console.error(`Error fetching template for ${emailType}:`, error);
    return null;
  }
}

// Supabase client and Resend already initialized above

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
      console.error('[centralized-email-delivery-public] Send error', { correlationId, statusCode: (emailResponse.error as any)?.statusCode, name: emailResponse.error.name, message: emailResponse.error.message });
    } else {
      console.log('[centralized-email-delivery-public] Send success', { correlationId, id: emailResponse?.data?.id });
    }
    if (emailResponse?.error && (emailResponse.error as any)?.statusCode === 403) {
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
          statusCode: (emailResponse as any)?.error?.statusCode || 403,
          name: emailResponse?.error?.name,
          correlationId
        }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (emailResponse?.error) {
      return new Response(
        JSON.stringify({ success: false, error: emailResponse.error.message, statusCode: (emailResponse.error as any)?.statusCode, name: emailResponse.error.name, correlationId }),
        { status: (emailResponse as any)?.error?.statusCode || 502, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
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