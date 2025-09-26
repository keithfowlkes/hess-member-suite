import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { getEmailDesignSettings, getEmailLogoUrl, replaceColorVariables, wrapInStandardTemplate } from './email-design.ts';

// Initialize Supabase client for template utilities
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  variables: string[];
}

// Function to get and replace logo URL in template with proper email embedding
export async function replaceLogoInTemplate(htmlContent: string): Promise<string> {
  try {
    console.log('[replaceLogoInTemplate] Starting logo replacement process');
    console.log('[replaceLogoInTemplate] Input content length:', htmlContent.length);
    
    // Get the uploaded logo URL from system settings
    const logoUrl = await getEmailLogoUrl();
    console.log('[replaceLogoInTemplate] Logo URL from settings:', logoUrl);
    
    // Clean the content first - remove any existing HTML, HEAD, BODY tags since we'll wrap it
    let cleanContent = htmlContent;
    cleanContent = cleanContent.replace(/<!DOCTYPE[^>]*>/gi, '');
    cleanContent = cleanContent.replace(/<\/?html[^>]*>/gi, '');
    cleanContent = cleanContent.replace(/<\/?head[^>]*>/gi, '');
    cleanContent = cleanContent.replace(/<\/?body[^>]*>/gi, '');
    cleanContent = cleanContent.replace(/<meta[^>]*>/gi, '');
    cleanContent = cleanContent.replace(/<title[^>]*>.*?<\/title>/gi, '');
    
    // Replace old logo references
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
    
    // If we have a logo URL and this is for the public function, also replace direct image URLs
    if (logoUrl && logoUrl.trim()) {
      cleanContent = cleanContent.replace(
        /src="https:\/\/9f0afb12-d741-415b-9bbb-e40cfcba281a\.lovableproject\.com\/assets\/hess-logo\.png"/g,
        `src="${logoUrl}"`
      );
      
      const emailOptimizedImg = `<img src="${logoUrl}" alt="HESS Consortium Logo" style="max-width: 200px; height: auto; display: block; margin: 0 auto;" border="0">`;
      
      cleanContent = cleanContent.replace(
        /<img[^>]*src="[^"]*hess[^"]*logo[^"]*"[^>]*>/gi,
        emailOptimizedImg
      );
      
      cleanContent = cleanContent.replace(
        /<img[^>]*src="data:image\/[^;]*;base64,[^"]*"[^>]*>/g,
        emailOptimizedImg
      );
      
      cleanContent = cleanContent.replace(
        /\{\{logo\}\}/gi,
        emailOptimizedImg
      );
    }
    
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
export async function getEmailTemplate(emailType: string, includeRecipients: boolean = false): Promise<EmailTemplate & { ccRecipients?: string[], defaultRecipients?: Record<string, boolean> } | null> {
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
      case 'overdue_reminder':
        settingKey = 'overdue_reminder_email_template';
        break;
      case 'organization_invitation':
        settingKey = 'organization_invitation_template';
        break;
      case 'organization_update_alert':
        settingKey = 'organization_update_alert_template';
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
      
      // Get design settings and replace color variables in template content
      const colorSettings = await getEmailDesignSettings();
      console.log(`[getEmailTemplate] Applying colors from design settings to template content`);
      
      // Replace color placeholders in template content before wrapping
      let templateContent = replaceColorVariables(settingTemplate.setting_value, colorSettings);

      console.log(`Template content after color replacement: ${templateContent.substring(0, 500)}...`);
      console.log(`[DEBUG] Applied colors:`, {
        primary: colorSettings.primary_color,
        accent: colorSettings.accent_color,
        text: colorSettings.text_color,
        card: colorSettings.card_background
      });
      
      // Replace logo and wrap in standard template
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
    // Add email templates for admin notifications
    case 'admin_new_registration':
      subject = 'New Member Registration Pending Review';
      template = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: {{text_color}};">
          <h2 style="color: {{primary_color}}; margin-bottom: 20px;">New Registration Pending Review</h2>
          
          <p>Dear {{user_name}},</p>
          
          <p>A new member registration has been submitted and is waiting for your review in the HESS Consortium admin panel.</p>
          
          <div style="background-color: {{card_background}}; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid {{primary_color}};">
            <p><strong>Organization:</strong> {{organization_name}}</p>
            <p><strong>Contact Email:</strong> {{submitted_email}}</p>
            <p><strong>Type:</strong> {{registration_type}}</p>
            <p><strong>Status:</strong> Pending Review</p>
          </div>
          
          <p>Please log in to the admin panel to review and approve this registration.</p>
          
          <p>Best regards,<br>
          <span style="color: {{primary_color}};">HESS Consortium System</span></p>
        </div>
      `;
      break;

    case 'admin_member_update':
      subject = 'Member Profile Update Pending Review';
      template = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: {{text_color}};">
          <h2 style="color: {{primary_color}}; margin-bottom: 20px;">Member Update Pending Review</h2>
          
          <p>Dear {{user_name}},</p>
          
          <p>A member profile update has been submitted and is waiting for your review in the HESS Consortium admin panel.</p>
          
          <div style="background-color: {{card_background}}; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid {{primary_color}};">
            <p><strong>Organization:</strong> {{organization_name}}</p>
            <p><strong>Submitted by:</strong> {{submitted_email}}</p>
            <p><strong>Type:</strong> {{update_type}}</p>
            <p><strong>Status:</strong> Pending Review</p>
          </div>
          
          <p>Please log in to the admin panel to review and approve this update.</p>
          
          <p>Best regards,<br>
          <span style="color: {{primary_color}};">HESS Consortium System</span></p>
        </div>
      `;
      break;

    case 'admin_contact_transfer':
      subject = 'Contact Transfer Request Pending Review';
      template = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: {{text_color}};">
          <h2 style="color: {{primary_color}}; margin-bottom: 20px;">Contact Transfer Pending Review</h2>
          
          <p>Dear {{user_name}},</p>
          
          <p>An organization contact transfer request has been submitted and is waiting for your review in the HESS Consortium admin panel.</p>
          
          <div style="background-color: {{card_background}}; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid {{primary_color}};">
            <p><strong>Organization:</strong> {{organization_name}}</p>
            <p><strong>New Contact:</strong> {{submitted_email}}</p>
            <p><strong>Type:</strong> {{transfer_type}}</p>
            <p><strong>Status:</strong> Pending Review</p>
          </div>
          
          <p>Please log in to the admin panel to review and approve this transfer request.</p>
          
          <p>Best regards,<br>
          <span style="color: {{primary_color}};">HESS Consortium System</span></p>
        </div>
      `;
      break;

    case 'admin_test_notification':
      subject = 'HESS Consortium - Notification System Test';
      template = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: {{text_color}};">
          <h2 style="color: {{primary_color}}; margin-bottom: 20px;">Notification System Test</h2>
          
          <p>Dear {{user_name}},</p>
          
          <p>{{test_message}}</p>
          
          <div style="background-color: {{card_background}}; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid {{primary_color}};">
            <p><strong>Test Status:</strong> ✅ Successfully delivered</p>
            <p><strong>System:</strong> HESS Consortium Registration Notifications</p>
            <p><strong>Time:</strong> {{current_timestamp}}</p>
          </div>
          
          <p>If you received this message, the notification system is working correctly.</p>
          
          <p>Best regards,<br>
          <span style="color: {{primary_color}};">HESS Consortium System</span></p>
        </div>
      `;
      break;
          templateSubject = 'Organization Update Alert - Action Required';
          break;
        default:
          templateSubject = 'HESS Consortium Notification';
      }

      console.log(`[getEmailTemplate] Using subject: ${templateSubject} for type: ${emailType}`);
      
      let result: any = {
        id: emailType,
        name: `${emailType.charAt(0).toUpperCase() + emailType.slice(1)} Template`,
        subject: templateSubject,
        html: htmlWithLogo,
        variables: []
      };

      // Add recipient configuration for welcome emails
      if (includeRecipients && (emailType === 'welcome' || emailType === 'welcome_approved')) {
        try {
          // Get CC recipients
          const { data: ccSetting } = await supabase
            .from('system_settings')
            .select('setting_value')
            .eq('setting_key', 'welcome_message_cc_recipients')
            .maybeSingle();
          
          // Get default recipients  
          const { data: defaultSetting } = await supabase
            .from('system_settings')
            .select('setting_value')
            .eq('setting_key', 'welcome_message_default_recipients')
            .maybeSingle();

          if (ccSetting?.setting_value) {
            try {
              result.ccRecipients = JSON.parse(ccSetting.setting_value);
            } catch (e) {
              console.error('[getEmailTemplate] Error parsing CC recipients:', e);
              result.ccRecipients = [];
            }
          }

          if (defaultSetting?.setting_value) {
            try {
              result.defaultRecipients = JSON.parse(defaultSetting.setting_value);
            } catch (e) {
              console.error('[getEmailTemplate] Error parsing default recipients:', e);
              result.defaultRecipients = {};
            }
          }
        } catch (error) {
          console.error('[getEmailTemplate] Error fetching recipient settings:', error);
        }
      }
      
      return result;
    }

    // Special handling for public function template types that may not be wrapped
    if (emailType === 'welcome' || emailType === 'password_reset' || emailType === 'profile_update') {
      const publicTemplate = settingTemplate?.setting_value;
      if (publicTemplate) {
        const colorSettings = await getEmailDesignSettings();
        let templateContent = replaceColorVariables(publicTemplate, colorSettings);
        
        // For public function, just apply logo replacement without full wrapping
        const logoUrl = await getEmailLogoUrl();
        if (logoUrl && logoUrl.trim()) {
          templateContent = templateContent.replace(
            /src="https:\/\/9f0afb12-d741-415b-9bbb-e40cfcba281a\.lovableproject\.com\/assets\/hess-logo\.png"/g,
            `src="${logoUrl}"`
          );
          
          const emailOptimizedImg = `<img src="${logoUrl}" alt="HESS Consortium Logo" style="max-width: 200px; height: auto; display: block; margin: 0 auto;" border="0">`;
          templateContent = templateContent.replace(
            /<img[^>]*src="[^"]*hess[^"]*logo[^"]*"[^>]*>/gi,
            emailOptimizedImg
          );
        }
        
        return {
          id: emailType,
          name: `${emailType.charAt(0).toUpperCase() + emailType.slice(1)} Template`,
          subject: emailType === 'welcome' ? 'Welcome to HESS Consortium!' : 
                  emailType === 'password_reset' ? 'Password Reset Request' :
                  emailType === 'profile_update' ? 'Profile Update Approved' :
                  'HESS Consortium Notification',
          html: templateContent,
          variables: []
        };
      }
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

// Replace template variables in content with provided data
export function replaceTemplateVariables(content: string, data: Record<string, string>): string {
  let result = content;
  Object.entries(data).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value || '');
  });
  return result;
}