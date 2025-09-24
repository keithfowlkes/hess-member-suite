import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

// Initialize Supabase client for design utilities
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

export interface EmailDesignSettings {
  background_image: string;
  primary_color: string;
  accent_color: string;
  text_color: string;
  card_background: string;
}

// Helper function to convert hex to rgba for email client compatibility
export function hexToRgba(hex: string, opacity: number): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Handle 3-character hex codes
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  // Parse RGB values
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// Get email design settings from system_settings
export async function getEmailDesignSettings(): Promise<EmailDesignSettings> {
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

  return settings;
}

// Get logo URL from system settings
export async function getEmailLogoUrl(): Promise<string> {
  const { data: logoSetting } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'public_logo_url')
    .maybeSingle();
    
  return logoSetting?.setting_value || '';
}

// Replace color variables in template content with proper RGBA values
export function replaceColorVariables(content: string, colors: EmailDesignSettings): string {
  let result = content;
  
  // Replace transparency variations with proper rgba values (process variants first)
  result = result.replace(/\{\{accent_color\}\}20/g, hexToRgba(colors.accent_color, 0.2));
  result = result.replace(/\{\{accent_color\}\}50/g, hexToRgba(colors.accent_color, 0.5));
  result = result.replace(/\{\{primary_color\}\}CC/g, hexToRgba(colors.primary_color, 0.8));
  result = result.replace(/\{\{primary_color\}\}20/g, hexToRgba(colors.primary_color, 0.2));
  result = result.replace(/\{\{primary_color\}\}50/g, hexToRgba(colors.primary_color, 0.5));
  result = result.replace(/\{\{text_color\}\}20/g, hexToRgba(colors.text_color, 0.2));
  result = result.replace(/\{\{text_color\}\}50/g, hexToRgba(colors.text_color, 0.5));
  result = result.replace(/\{\{text_color\}\}CC/g, hexToRgba(colors.text_color, 0.8));
  
  // Then replace the main color variables
  result = result.replace(/\{\{primary_color\}\}/g, colors.primary_color);
  result = result.replace(/\{\{accent_color\}\}/g, colors.accent_color);
  result = result.replace(/\{\{text_color\}\}/g, colors.text_color);
  result = result.replace(/\{\{card_background\}\}/g, colors.card_background);
  
  return result;
}

// Wrap content in standardized HESS email template with design system
export async function wrapInStandardTemplate(content: string, logoUrl?: string): Promise<string> {
  console.log('[wrapInStandardTemplate] Starting template wrap process');
  console.log('[wrapInStandardTemplate] Content length:', content.length);
  console.log('[wrapInStandardTemplate] Logo URL:', logoUrl);
  
  const settings = await getEmailDesignSettings();
  
  console.log('[wrapInStandardTemplate] Final settings:', settings);

  const emailOptimizedLogo = logoUrl 
    ? `<img src="${logoUrl}" alt="HESS Consortium Logo" style="max-width: 200px; height: auto; display: block; margin: 0 auto 20px auto;" border="0">`
    : '';

  // Determine background style based on settings - match Preview Design modal exactly
  const backgroundStyle = settings.background_image 
    ? `background-image: url('${settings.background_image}'); background-size: cover; background-position: center; background-repeat: no-repeat; min-height: 100vh; background-color: ${settings.primary_color};`
    : `background: linear-gradient(135deg, ${settings.primary_color} 0%, ${settings.accent_color} 100%); min-height: 100vh;`;

  console.log('[wrapInStandardTemplate] Background style:', backgroundStyle);

  // Use exact same template structure as Preview Design modal
  const finalTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HESS Consortium - Email Design Preview</title>
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
                        <td style="background: ${hexToRgba(settings.accent_color, 0.2)}; padding: 30px 40px; border-top: 2px solid ${hexToRgba(settings.accent_color, 0.5)}; text-align: center;">
                            <p style="margin: 0; color: ${settings.primary_color}; font-size: 14px; font-weight: 500;">
                                © ${new Date().getFullYear()} HESS Consortium. All rights reserved.
                            </p>
                            <p style="margin: 8px 0 0 0; color: ${hexToRgba(settings.primary_color, 0.8)}; font-size: 12px;">
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