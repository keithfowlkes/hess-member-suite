import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Mail, Edit, MessageSquare, Eye } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useSystemMessages, useCreateSystemMessage, useUpdateSystemMessage } from '@/hooks/useSystemMessages';
import { useSystemSetting } from '@/hooks/useSystemSettings';
import TinyMCEEditor from '@/components/TinyMCEEditor';
import { OrganizationInvitationTemplateEditor } from '@/components/OrganizationInvitationTemplateEditor';

export const MessageTextContent = () => {
  const { settings, updateSetting } = useSettings();
  const { data: systemMessages = [], isLoading: messagesLoading } = useSystemMessages();
  const createSystemMessage = useCreateSystemMessage();
  const updateSystemMessage = useUpdateSystemMessage();

  // Message states
  const [passwordResetMessage, setPasswordResetMessage] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [profileUpdateMessage, setProfileUpdateMessage] = useState('');
  const [memberInfoUpdateMessage, setMemberInfoUpdateMessage] = useState('');
  const [savingMessage, setSavingMessage] = useState(false);
  const [savingWelcomeMessage, setSavingWelcomeMessage] = useState(false);
  const [savingProfileUpdateMessage, setSavingProfileUpdateMessage] = useState(false);
  const [savingMemberInfoUpdateMessage, setSavingMemberInfoUpdateMessage] = useState(false);

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  // Get design settings for preview
  const { data: backgroundImageSetting } = useSystemSetting('email_background_image');
  const { data: primaryColorSetting } = useSystemSetting('email_design_primary_color');
  const { data: accentColorSetting } = useSystemSetting('email_design_accent_color');
  const { data: textColorSetting } = useSystemSetting('email_design_text_color');
  const { data: cardBackgroundSetting } = useSystemSetting('email_design_card_background');
  const { data: logoSetting } = useSystemSetting('public_logo_url');

  // Initialize messages from settings
  useEffect(() => {
    if (settings) {
      const passwordSetting = settings.find(s => s.setting_key === 'password_reset_message');
      if (passwordSetting?.setting_value) {
        setPasswordResetMessage(passwordSetting.setting_value);
      } else {
        // Set default password reset message template for watercolor background
        const defaultPasswordResetTemplate = `
          <p style="color: #4A4A4A; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">This password reset link has been sent to your email address to verify your identity. Please click the link below to be sent to the password reset page.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{reset_link}}" style="background: linear-gradient(135deg, #8B7355, #A1887F); color: white; padding: 16px 32px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(139, 115, 85, 0.3);">Click here to Reset your password</a>
          </div>
          
          {{login_hint_section}}
          
          <p style="color: #4A4A4A; font-size: 14px; line-height: 1.8; margin: 20px 0;">If this message was not requested by you, please contact us at <a href="mailto:info@hessconsortium.org" style="color: #8B7355; font-weight: bold; text-decoration: none;">info@hessconsortium.org</a> immediately.</p>
          
          <p style="color: #4A4A4A; font-size: 16px; line-height: 1.8; margin: 20px 0 10px 0;">Thank you and have a great day!</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid rgba(212, 175, 55, 0.3);">
            <p style="color: #8B7355; font-weight: bold; font-size: 16px; margin: 0;">The HESS Consortium</p>
          </div>
        `;
        setPasswordResetMessage(defaultPasswordResetTemplate);
      }
      
      const welcomeSetting = settings.find(s => s.setting_key === 'welcome_message_template');
      if (welcomeSetting?.setting_value) {
        setWelcomeMessage(welcomeSetting.setting_value);
      } else {
        // Set default welcome message template for watercolor background
        const defaultTemplate = `
          <p style="color: #4A4A4A; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">{{primary_contact_name}},</p>
          
          <p style="color: #4A4A4A; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">Thank you for your registration for HESS Consortium membership. I want to welcome you and {{organization_name}} personally to membership in the HESS Consortium!</p>
          
          <p style="color: #4A4A4A; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">I've CCed Gwen Pechan, HESS Board President and CIO at Flagler College to welcome you also.</p>
          
          <p style="color: #4A4A4A; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">If you have a few minutes, I would love to fill you in on the work we are doing together in the Consortium and with our business partners.</p>
          
          <p style="color: #4A4A4A; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">We will make sure to get your contact information into our member listserv asap. Make sure to use and update your institutional information on our <a href="https://members.hessconsortium.app/" style="color: #8B7355; font-weight: bold; text-decoration: none;">new member portal here</a>.</p>
          
          <p style="color: #4A4A4A; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">Also, make sure to register for an account on our HESS Online Leadership Community collaboration website to download the latest information and join in conversation with HESS CIOs. You will definitely want to sign up online at <a href="https://www.hessconsortium.org/community" style="color: #8B7355; font-weight: bold; text-decoration: none;">https://www.hessconsortium.org/community</a> and invite your staff to participate also.</p>
          
          <p style="color: #4A4A4A; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">You now have access to our HESS / Coalition Educational Discount Program with Insight for computer and network hardware, peripherals and cloud software. Please create an institutional portal account at <a href="https://www.insight.com/HESS" style="color: #8B7355; font-weight: bold; text-decoration: none;">www.insight.com/HESS</a> online now. We hope you will evaluate these special Insight discount pricing and let us know how it looks compared to your current suppliers.</p>
          
          <p style="color: #4A4A4A; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">After you have joined the HESS OLC (mentioned above), click the Member Discounts icon at the top of the page to see all of the discount programs you have access to as a HESS member institution.</p>
          
          <p style="color: #4A4A4A; font-size: 16px; line-height: 1.8; margin: 0 0 30px 0;">Again, welcome to our quickly growing group of private, non-profit institutions in technology!</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <img src="https://www.hessconsortium.org/new/wp-content/uploads/2023/04/KeithFowlkesshortsig.png" alt="Keith Fowlkes Signature" style="max-width: 200px; height: auto;">
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid rgba(212, 175, 55, 0.3);">
            <p style="color: #8B7355; font-size: 16px; font-weight: bold; margin: 5px 0;">Keith Fowlkes, M.A., M.B.A.</p>
            <p style="color: #4A4A4A; font-size: 14px; margin: 5px 0;">Executive Director and Founder</p>
            <p style="color: #8B7355; font-size: 16px; font-weight: bold; margin: 5px 0;">The HESS Consortium</p>
            <p style="color: #4A4A4A; font-size: 14px; margin: 5px 0;">keith.fowlkes@hessconsortium.org | 859.516.3571</p>
          </div>
        `;
        setWelcomeMessage(defaultTemplate);
      }

      const profileUpdateSetting = settings.find(s => s.setting_key === 'profile_update_message_template');
      if (profileUpdateSetting?.setting_value) {
        setProfileUpdateMessage(profileUpdateSetting.setting_value);
      } else {
        // Set default profile update message template for watercolor background
        const defaultProfileUpdateTemplate = `
          <p style="color: #4A4A4A; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">Dear {{primary_contact_name}},</p>
          
          <p style="color: #4A4A4A; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">Your profile update request for {{organization_name}} has been approved by our administration team.</p>
          
          <p style="color: #4A4A4A; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">The changes you requested have been applied to your organization's profile and are now active in our system.</p>
          
          <p style="color: #4A4A4A; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">You can view your updated profile by logging into the <a href="https://members.hessconsortium.app/" style="color: #8B7355; font-weight: bold; text-decoration: none;">HESS Consortium member portal</a>.</p>
          
          <p style="color: #4A4A4A; font-size: 16px; line-height: 1.8; margin: 0 0 30px 0;">If you have any questions about your profile or membership, please don't hesitate to contact us.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <img src="https://www.hessconsortium.org/new/wp-content/uploads/2023/04/KeithFowlkesshortsig.png" alt="Keith Fowlkes Signature" style="max-width: 200px; height: auto;">
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid rgba(212, 175, 55, 0.3);">
            <p style="color: #8B7355; font-size: 16px; font-weight: bold; margin: 5px 0;">Keith Fowlkes, M.A., M.B.A.</p>
            <p style="color: #4A4A4A; font-size: 14px; margin: 5px 0;">Executive Director and Founder</p>
            <p style="color: #8B7355; font-size: 16px; font-weight: bold; margin: 5px 0;">The HESS Consortium</p>
            <p style="color: #4A4A4A; font-size: 14px; margin: 5px 0;">keith.fowlkes@hessconsortium.org | 859.516.3571</p>
          </div>
        `;
        setProfileUpdateMessage(defaultProfileUpdateTemplate);
      }

      const memberInfoUpdateSetting = settings.find(s => s.setting_key === 'email_member_info_update_template');
      if (memberInfoUpdateSetting?.setting_value) {
        setMemberInfoUpdateMessage(memberInfoUpdateSetting.setting_value);
      } else {
        // Set default member info update message template for watercolor background
        const defaultMemberInfoUpdateTemplate = `
          <p style="color: #4A4A4A; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">Dear {{first_name}} {{last_name}},</p>
          
          <p style="color: #4A4A4A; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">Your organization information has been successfully updated in our system.</p>
          
          <div style="background: rgba(212, 175, 55, 0.1); border: 2px solid rgba(212, 175, 55, 0.3); border-radius: 12px; padding: 20px; margin: 25px 0;">
            <p style="color: #8B7355; font-size: 16px; font-weight: bold; margin: 0 0 10px 0;">Updated Information:</p>
            <div style="color: #4A4A4A; font-size: 14px; line-height: 1.6;">{{update_details}}</div>
          </div>
          
          <p style="color: #4A4A4A; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">These changes are now active in our system. You can view your updated profile by logging into the <a href="https://members.hessconsortium.app/" style="color: #8B7355; font-weight: bold; text-decoration: none;">HESS Consortium member portal</a>.</p>
          
          <p style="color: #4A4A4A; font-size: 16px; line-height: 1.8; margin: 0 0 30px 0;">If you have any questions about these changes, please don't hesitate to contact us.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <img src="https://www.hessconsortium.org/new/wp-content/uploads/2023/04/KeithFowlkesshortsig.png" alt="Keith Fowlkes Signature" style="max-width: 200px; height: auto;">
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid rgba(212, 175, 55, 0.3);">
            <p style="color: #8B7355; font-size: 16px; font-weight: bold; margin: 5px 0;">Keith Fowlkes, M.A., M.B.A.</p>
            <p style="color: #4A4A4A; font-size: 14px; margin: 5px 0;">Executive Director and Founder</p>
            <p style="color: #8B7355; font-size: 16px; font-weight: bold; margin: 5px 0;">The HESS Consortium</p>
            <p style="color: #4A4A4A; font-size: 14px; margin: 5px 0;">keith.fowlkes@hessconsortium.org | 859.516.3571</p>
          </div>
        `;
        setMemberInfoUpdateMessage(defaultMemberInfoUpdateTemplate);
      }
    }
  }, [settings]);

  const handleSavePasswordMessage = async () => {
    setSavingMessage(true);
    try {
      await updateSetting('password_reset_message', passwordResetMessage);
    } finally {
      setSavingMessage(false);
    }
  };

  const handleSaveWelcomeMessage = async () => {
    setSavingWelcomeMessage(true);
    try {
      await updateSetting('welcome_message_template', welcomeMessage);
    } finally {
      setSavingWelcomeMessage(false);
    }
  };

  const handleSaveProfileUpdateMessage = async () => {
    setSavingProfileUpdateMessage(true);
    try {
      await updateSetting('profile_update_message_template', profileUpdateMessage);
    } finally {
      setSavingProfileUpdateMessage(false);
    }
  };

  const handleSaveMemberInfoUpdateMessage = async () => {
    setSavingMemberInfoUpdateMessage(true);
    try {
      await updateSetting('email_member_info_update_template', memberInfoUpdateMessage);
    } finally {
      setSavingMemberInfoUpdateMessage(false);
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

    const logoUrl = logoSetting?.setting_value;
    const emailOptimizedLogo = logoUrl 
      ? `<img src="${logoUrl}" alt="HESS Consortium Logo" style="max-width: 200px; height: auto; display: block; margin: 0 auto 20px auto;" border="0">`
      : '';

    // Determine background style based on settings
    const backgroundStyle = settings.background_image 
      ? `background-image: url('${settings.background_image}'); background-size: cover; background-position: center; background-repeat: no-repeat; min-height: 100vh; background-color: ${settings.primary_color};`
      : `background: linear-gradient(135deg, ${settings.primary_color} 0%, ${settings.accent_color} 100%); min-height: 100vh;`;

    // Replace template variables with sample data
    let processedContent = content
      .replace(/{{primary_contact_name}}/g, 'John Smith')
      .replace(/{{organization_name}}/g, 'Sample University')
      .replace(/{{first_name}}/g, 'John')
      .replace(/{{last_name}}/g, 'Smith')
      .replace(/{{user_email}}/g, 'john.smith@example.edu')
      .replace(/{{reset_link}}/g, '#password-reset-link')
      .replace(/{{update_details}}/g, 'Organization name, contact information, and system preferences')
      .replace(/{{login_hint_section}}/g, '<p style="color: #4A4A4A; font-size: 14px; line-height: 1.8; margin: 20px 0; font-style: italic;">If you are having trouble logging in, try using your email address as your username.</p>');

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
                            ${emailOptimizedLogo}
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

  const handlePreview = (content: string, title: string) => {
    const previewHtml = generateEmailPreview(content, title);
    setPreviewContent(previewHtml);
    setPreviewTitle(title);
    setPreviewOpen(true);
  };

  if (messagesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading message templates...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold">Message Template Configuration</h3>
        <p className="text-muted-foreground">Customize system messages and email templates</p>
      </div>

      {/* Password Reset Message */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Password Reset Message
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email Template (HTML)</Label>
            <p className="text-sm text-muted-foreground">
              Available variables: user_email, reset_link (use double braces around each)
            </p>
            <div className="min-h-[200px]">
                <TinyMCEEditor
                  value={passwordResetMessage}
                  onChange={setPasswordResetMessage}
                  placeholder="Enter password reset message template..."
                />
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleSavePasswordMessage}
              disabled={savingMessage}
            >
              {savingMessage ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Save Password Message
            </Button>
            <Button 
              variant="outline"
              onClick={() => handlePreview(passwordResetMessage, 'Password Reset')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Welcome Message */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Welcome Message Template
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email Template (HTML)</Label>
            <div className="min-h-[200px]">
                <TinyMCEEditor
                  value={welcomeMessage}
                  onChange={setWelcomeMessage}
                  placeholder="Enter welcome message template..."
                />
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleSaveWelcomeMessage}
              disabled={savingWelcomeMessage}
            >
              {savingWelcomeMessage ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Save Welcome Message
            </Button>
            <Button 
              variant="outline"
              onClick={() => handlePreview(welcomeMessage, 'Welcome Message')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Update Message */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Profile Update Message Template
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email Template (HTML)</Label>
            <div className="min-h-[200px]">
                <TinyMCEEditor
                  value={profileUpdateMessage}
                  onChange={setProfileUpdateMessage}
                  placeholder="Enter profile update message template..."
                />
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleSaveProfileUpdateMessage}
              disabled={savingProfileUpdateMessage}
            >
              {savingProfileUpdateMessage ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Save Profile Update Message
            </Button>
            <Button 
              variant="outline"
              onClick={() => handlePreview(profileUpdateMessage, 'Profile Update Message')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Member Information Update Message */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Member Information Update Message Template
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email Template (HTML)</Label>
            <p className="text-sm text-muted-foreground">
              Available variables: first_name, last_name, organization_name, update_details (use double braces around each)
            </p>
            <div className="min-h-[200px]">
                <TinyMCEEditor
                  value={memberInfoUpdateMessage}
                  onChange={setMemberInfoUpdateMessage}
                  placeholder="Enter member information update message template..."
                />
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleSaveMemberInfoUpdateMessage}
              disabled={savingMemberInfoUpdateMessage}
            >
              {savingMemberInfoUpdateMessage ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Save Member Information Update Message
            </Button>
            <Button 
              variant="outline"
              onClick={() => handlePreview(memberInfoUpdateMessage, 'Member Information Update Message')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Organization Invitation Message */}
      <OrganizationInvitationTemplateEditor />

      {/* Email Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Email Preview - {previewTitle}</DialogTitle>
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
    </div>
  );
};