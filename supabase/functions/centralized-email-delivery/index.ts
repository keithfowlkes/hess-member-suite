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

// Function to wrap content in standardized HESS email template with design system
async function wrapInStandardTemplate(content: string, logoUrl?: string): Promise<string> {
  console.log('[wrapInStandardTemplate] Starting template wrap process');
  console.log('[wrapInStandardTemplate] Content length:', content.length);
  console.log('[wrapInStandardTemplate] Logo URL:', logoUrl);
  
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

  console.log('[wrapInStandardTemplate] Retrieved design settings:', designSettings);

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

  console.log('[wrapInStandardTemplate] Final settings:', settings);
  console.log('[wrapInStandardTemplate] Background style:', backgroundStyle);

  const finalTemplate = `
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
  
  console.log('[wrapInStandardTemplate] Template generation complete, length:', finalTemplate.length);
  return finalTemplate;
}

// Function to get and replace logo URL in template with proper email embedding
async function replaceLogoInTemplate(htmlContent: string): Promise<string> {
  try {
    console.log('[replaceLogoInTemplate] Starting logo replacement process');
    console.log('[replaceLogoInTemplate] Input content length:', htmlContent.length);
    
    // Get the uploaded logo URL from system settings
    const { data: logoSetting } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'public_logo_url')
      .maybeSingle();
    
    const logoUrl = logoSetting?.setting_value;
    console.log('[replaceLogoInTemplate] Logo URL from settings:', logoUrl);
    
    // Clean the content first - remove any existing HTML, HEAD, BODY tags since we'll wrap it
    let cleanContent = htmlContent;
    cleanContent = cleanContent.replace(/<!DOCTYPE[^>]*>/gi, '');
    cleanContent = cleanContent.replace(/<\/?html[^>]*>/gi, '');
    cleanContent = cleanContent.replace(/<\/?head[^>]*>/gi, '');
    cleanContent = cleanContent.replace(/<\/?body[^>]*>/gi, '');
    cleanContent = cleanContent.replace(/<meta[^>]*>/gi, '');
    cleanContent = cleanContent.replace(/<title[^>]*>.*?<\/title>/gi, '');
    
    // Replace old logo references with placeholder for now (will be handled by template)
    cleanContent = cleanContent.replace(
      /src="https:\/\/9f0afb12-d741-415b-9bbb-e40cfcba281a\.lovableproject\.com\/assets\/hess-logo\.png"/g,
      'src="LOGO_PLACEHOLDER"'
    );
    
    cleanContent = cleanContent.replace(
      /<img[^>]*src="[^"]*hess[^"]*logo[^"]*"[^>]*>/gi,
      ''
    );
    
    cleanContent = cleanContent.replace(
      /<img[^>]*src="data:image\/[^;]*;base64,[^"]*"[^>]*>/g,
      ''
    );
    
    cleanContent = cleanContent.replace(/\{\{logo\}\}/gi, '');
    
    // Remove any standalone logo images at the top
    cleanContent = cleanContent.replace(/^[\s]*<p[^>]*>[\s]*<img[^>]*>[\s]*<\/p>[\s]*/gi, '');
    cleanContent = cleanContent.replace(/^[\s]*<img[^>]*>[\s]*/gi, '');
    
    console.log('[replaceLogoInTemplate] Content after cleaning:', cleanContent.substring(0, 200) + '...');
    
    // Wrap the cleaned content in the standard template
    const wrappedContent = await wrapInStandardTemplate(cleanContent.trim(), logoUrl);
    console.log('[replaceLogoInTemplate] Final wrapped content length:', wrappedContent.length);
    
    return wrappedContent;
    
  } catch (error) {
    console.error('[replaceLogoInTemplate] Error in logo replacement process:', error);
    // Still try to wrap in standard template even if logo replacement fails
    try {
      return await wrapInStandardTemplate(htmlContent);
    } catch (wrapError) {
      console.error('[replaceLogoInTemplate] Error in fallback template wrapping:', wrapError);
      // Last resort - return original content
      return htmlContent;
    }
  }
}

// Function to get email template from system_settings table (primary) or system_messages (fallback)
async function getEmailTemplate(emailType: string): Promise<EmailTemplate | null> {
  try {
    console.log(`[getEmailTemplate] Looking for template for type: ${emailType}`);
    
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
      case 'profile_update_message_template':
        settingKey = 'profile_update_message_template';
        break;
      case 'member_info_update':
        settingKey = 'email_member_info_update_template';
        break;
      default:
        settingKey = `${emailType}_message_template`;
    }

    console.log(`[getEmailTemplate] Using setting key: ${settingKey} for email type: ${emailType}`);

    // Try to get from system_settings first
    const { data: settingTemplate, error: settingError } = await supabase
      .from('system_settings')
      .select('setting_value, setting_key')
      .eq('setting_key', settingKey)
      .maybeSingle();

    console.log(`[getEmailTemplate] System settings query result:`, { settingTemplate, settingError });

    if (!settingError && settingTemplate?.setting_value) {
      console.log(`Found template in system_settings for: ${emailType}`);
      console.log(`Template content preview: ${settingTemplate.setting_value.substring(0, 200)}...`);
      
      // FIRST: Replace color variables in template content before wrapping
      let templateContent = settingTemplate.setting_value;
      
      // Get design settings for color replacement
      const { data: designSettings } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'email_design_primary_color', 
          'email_design_accent_color',
          'email_design_text_color',
          'email_design_card_background'
        ]);

      // Create color variables map with defaults
      const colorVars = {
        primary_color: '#8B7355',
        accent_color: '#D4AF37', 
        text_color: '#4A4A4A',
        card_background: 'rgba(248, 245, 238, 0.95)'
      };

      if (designSettings) {
        designSettings.forEach(setting => {
          switch (setting.setting_key) {
            case 'email_design_primary_color':
              colorVars.primary_color = setting.setting_value || '#8B7355';
              break;
            case 'email_design_accent_color':
              colorVars.accent_color = setting.setting_value || '#D4AF37';
              break;
            case 'email_design_text_color':
              colorVars.text_color = setting.setting_value || '#4A4A4A';
              break;
            case 'email_design_card_background':
              colorVars.card_background = setting.setting_value || 'rgba(248, 245, 238, 0.95)';
              break;
          }
        });
      }

      console.log(`[getEmailTemplate] Replacing colors in template:`, colorVars);

      // Replace color variables in template content
      Object.entries(colorVars).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        templateContent = templateContent.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value || '');
      });

      console.log(`Template content after color replacement: ${templateContent.substring(0, 200)}...`);
      
      // THEN: Replace logo and wrap in standard template
      const htmlWithLogo = await replaceLogoInTemplate(templateContent);
      console.log(`Template after logo replacement - length: ${htmlWithLogo.length}`);

      // Create proper subject based on email type
      let templateSubject = 'HESS Consortium Notification';
      switch (emailType) {
        case 'welcome':
        case 'welcome_approved':
          templateSubject = 'Welcome to HESS Consortium!';
          break;
        case 'password_reset':
          templateSubject = 'Password Reset Request';
          break;
        case 'profile_update':
        case 'profile_update_approved':
        case 'member_info_update':
          templateSubject = 'Profile Update Approved';
          break;
        default:
          templateSubject = 'HESS Consortium Notification';
      }

      console.log(`[getEmailTemplate] Using subject: ${templateSubject} for type: ${emailType}`);
      
      return {
        id: emailType,
        name: `${emailType.charAt(0).toUpperCase() + emailType.slice(1)} Template`,
        subject: templateSubject,
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
    console.log('[centralized-email-delivery] Incoming request:', { 
      type: emailRequest.type, 
      to: emailRequest.to,
      hasSubject: !!emailRequest.subject,
      hasTemplate: !!emailRequest.template,
      hasData: !!emailRequest.data
    });

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
      // Custom template provided - replace logo here too
      const htmlWithLogo = await replaceLogoInTemplate(emailRequest.template);
      template = {
        id: 'custom',
        name: 'Custom Template',
        subject: emailRequest.subject || 'HESS Consortium Email',
        html: htmlWithLogo,
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
    
    console.log('[centralized-email-delivery] Final email details:');
    console.log('[centralized-email-delivery] Subject:', finalSubject);
    console.log('[centralized-email-delivery] HTML length:', finalHtml.length);
    console.log('[centralized-email-delivery] HTML preview:', finalHtml.substring(0, 500) + '...');

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