import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Mail, Edit, Eye } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useSystemSetting } from '@/hooks/useSystemSettings';
import TinyMCEEditor from '@/components/TinyMCEEditor';

export const OrganizationInvitationTemplateEditor = () => {
  const { settings, updateSetting } = useSettings();
  
  const [invitationTemplate, setInvitationTemplate] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

   // Get design settings for preview
   const { data: backgroundImageSetting } = useSystemSetting('email_background_image');
   const { data: primaryColorSetting } = useSystemSetting('email_design_primary_color');
   const { data: accentColorSetting } = useSystemSetting('email_design_accent_color');
   const { data: textColorSetting } = useSystemSetting('email_design_text_color');
   const { data: cardBackgroundSetting } = useSystemSetting('email_design_card_background');

  // Initialize template from settings
  useEffect(() => {
    if (settings) {
      const templateSetting = settings.find(s => s.setting_key === 'organization_invitation_template');
      if (templateSetting?.setting_value) {
        setInvitationTemplate(templateSetting.setting_value);
      } else {
        // Set default organization invitation template with watercolor background
        const defaultTemplate = `
          <p style="color: #4A4A4A; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">Dear {{invitee_email}},</p>
          
          <p style="color: #4A4A4A; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">{{organization_name}} has been invited to become a member institution of the HESS Consortium.</p>
          
          <p style="color: #4A4A4A; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">The HESS Consortium is a collaborative network of private, non-profit higher education institutions focused on sharing technology resources, best practices, and building strategic partnerships.</p>
          
          <p style="color: #4A4A4A; font-size: 16px; line-height: 1.8; margin: 0 0 25px 0;">To accept this invitation and set up your account, please click the link below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{invitation_link}}" style="background: linear-gradient(135deg, #8B7355, #D4AF37); color: white; padding: 16px 32px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(139, 115, 85, 0.3);">Accept Invitation</a>
          </div>
          
          <p style="color: #8B7355; font-size: 16px; font-weight: bold; margin: 25px 0 15px 0;">What you'll get as a HESS member:</p>
          <ul style="margin-left: 20px; line-height: 1.8; color: #4A4A4A; font-size: 15px;">
            <li style="margin-bottom: 8px;">Access to our HESS Online Leadership Community collaboration website</li>
            <li style="margin-bottom: 8px;">Educational discount programs with our business partners</li>
            <li style="margin-bottom: 8px;">Networking opportunities with CIOs from similar institutions</li>
            <li style="margin-bottom: 8px;">Shared resources and best practices in higher education technology</li>
          </ul>
          
          <p style="color: #4A4A4A; font-size: 16px; line-height: 1.8; margin: 25px 0 20px 0;">This invitation will expire in 7 days. If you have any questions about HESS membership or this invitation, please don't hesitate to contact us.</p>
          
          <p style="color: #4A4A4A; font-size: 16px; line-height: 1.8; margin: 0 0 30px 0;">We look forward to welcoming {{organization_name}} to our growing consortium!</p>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid rgba(212, 175, 55, 0.3);">
            <p style="color: #8B7355; font-size: 16px; font-weight: bold; margin: 5px 0;">Keith Fowlkes, M.A., M.B.A.</p>
            <p style="color: #4A4A4A; font-size: 14px; margin: 5px 0;">Executive Director and Founder</p>
            <p style="color: #8B7355; font-size: 16px; font-weight: bold; margin: 5px 0;">The HESS Consortium</p>
            <p style="color: #4A4A4A; font-size: 14px; margin: 5px 0;">keith.fowlkes@hessconsortium.org | 859.516.3571</p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(139, 115, 85, 0.2);">
            <p style="font-size: 12px; color: #8B7355; text-align: center; font-style: italic;">
              If you believe you received this invitation in error, please contact us at keith.fowlkes@hessconsortium.org
            </p>
          </div>
        `;
        setInvitationTemplate(defaultTemplate);
      }
    }
  }, [settings]);

  const handleSaveTemplate = async () => {
    setSavingTemplate(true);
    try {
      await updateSetting('organization_invitation_template', invitationTemplate);
    } finally {
      setSavingTemplate(false);
    }
  };

  // Generate email preview with design settings
  const generateEmailPreview = (content: string, title: string) => {
     // Get design settings with defaults
     const settings = {
       background_image: backgroundImageSetting?.setting_value || '',
       primary_color: primaryColorSetting?.setting_value || '#8B7355',
       accent_color: accentColorSetting?.setting_value || '#D4AF37',
       text_color: textColorSetting?.setting_value || '#4A4A4A',
       card_background: cardBackgroundSetting?.setting_value || 'rgba(248, 245, 238, 0.95)'
     };

    // Determine background style based on settings
    const backgroundStyle = settings.background_image 
      ? `background-image: url('${settings.background_image}'); background-size: cover; background-position: center; background-repeat: no-repeat; min-height: 100vh; background-color: ${settings.primary_color};`
      : `background: linear-gradient(135deg, ${settings.primary_color} 0%, ${settings.accent_color} 100%); min-height: 100vh;`;

    // Replace template variables with sample data
    let processedContent = content
      .replace(/{{invitee_email}}/g, 'contact@sampleuniversity.edu')
      .replace(/{{organization_name}}/g, 'Sample University')
      .replace(/{{invitation_link}}/g, '#invitation-link');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HESS Consortium - ${title}</title>
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
                            <div style="height: 3px; background: linear-gradient(90deg, ${settings.accent_color} 0%, ${settings.primary_color} 50%, ${settings.accent_color} 100%); border-radius: 2px; margin: 15px auto 0 auto; width: 120px;"></div>
                        </td>
                    </tr>
                    
                    <!-- Content Area -->
                    <tr>
                        <td style="padding: 20px 50px 40px 50px;">
                            <div style="color: ${settings.text_color}; font-size: 16px; line-height: 1.8; text-align: left;">
                                ${processedContent}
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
  };

  const handlePreview = () => {
    const previewHtml = generateEmailPreview(invitationTemplate, 'Organization Invitation');
    setPreviewContent(previewHtml);
    setPreviewOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Organization Invitation Email Template
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invitation-template">Email Template</Label>
            <div className="text-sm text-muted-foreground mb-2">
              Available variables: <code>{'{{invitee_email}}'}</code>, <code>{'{{organization_name}}'}</code>, <code>{'{{invitation_link}}'}</code>
            </div>
            <TinyMCEEditor
              value={invitationTemplate}
              onChange={setInvitationTemplate}
              placeholder="Enter your organization invitation email template..."
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleSaveTemplate}
              disabled={savingTemplate || !invitationTemplate.trim()}
              className="flex-1"
            >
              {savingTemplate ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving Template...
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Save Template
                </>
              )}
            </Button>
            <Button 
              variant="outline"
              onClick={handlePreview}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Email Preview - Organization Invitation</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[80vh] border rounded-lg">
            <iframe
              srcDoc={previewContent}
              className="w-full h-[600px] border-0"
              title="Email Preview"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};