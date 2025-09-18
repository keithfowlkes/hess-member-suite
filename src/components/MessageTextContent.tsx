import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Edit, MessageSquare } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useSystemMessages, useCreateSystemMessage, useUpdateSystemMessage } from '@/hooks/useSystemMessages';
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

  // Initialize messages from settings
  useEffect(() => {
    if (settings) {
      const passwordSetting = settings.find(s => s.setting_key === 'password_reset_message');
      if (passwordSetting?.setting_value) {
        setPasswordResetMessage(passwordSetting.setting_value);
      } else {
        // Set default password reset message template with watercolor background
        const defaultPasswordResetTemplate = `
          <div style="background: url('https://members.hessconsortium.app/src/assets/email-background.png') no-repeat center center; background-size: cover; min-height: 600px; padding: 50px 20px; font-family: 'Georgia', serif;">
            <div style="background: rgba(245, 237, 225, 0.95); max-width: 500px; margin: 0 auto; padding: 40px; border-radius: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
              <center>
                <img src="https://members.hessconsortium.app/lovable-uploads/c2026cbe-1547-4c12-ba1e-542841a78351.png" alt="HESS LOGO" style="width: 200px; height: auto; margin-bottom: 30px;">
              </center>
              
              <p style="color: #5D4037; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Dear {{user_email}},</p>
              
              <p style="color: #5D4037; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">A password reset link has been sent to your email address. Please check your inbox and follow the instructions to reset your password.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{reset_link}}" style="background: linear-gradient(135deg, #8D6E63, #A1887F); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(141, 110, 99, 0.3); transition: all 0.3s ease;">Click here to Reset your password</a>
              </div>
              
              <p style="color: #5D4037; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">If this message was not requested by you, please contact us at <a href="mailto:info@hessconsortium.org" style="color: #8D6E63;">info@hessconsortium.org</a> immediately.</p>
              
              <p style="color: #5D4037; font-size: 16px; line-height: 1.6; margin-bottom: 10px;">Thank you and have a great day!</p>
              
              <p style="color: #8D6E63; font-weight: bold; font-size: 16px; margin-top: 30px;">The HESS Consortium</p>
            </div>
          </div>
        `;
        setPasswordResetMessage(defaultPasswordResetTemplate);
      }
      
      const welcomeSetting = settings.find(s => s.setting_key === 'welcome_message_template');
      if (welcomeSetting?.setting_value) {
        setWelcomeMessage(welcomeSetting.setting_value);
      } else {
        // Set default welcome message template with watercolor background
        const defaultTemplate = `
          <div style="background: url('https://members.hessconsortium.app/src/assets/email-background.png') no-repeat center center; background-size: cover; min-height: 800px; padding: 50px 20px; font-family: 'Georgia', serif;">
            <div style="background: rgba(245, 237, 225, 0.95); max-width: 500px; margin: 0 auto; padding: 40px; border-radius: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
              <center>
                <img src="https://members.hessconsortium.app/lovable-uploads/c2026cbe-1547-4c12-ba1e-542841a78351.png" alt="HESS LOGO" style="width: 200px; height: auto; margin-bottom: 30px;">
              </center>
              
              <p style="color: #5D4037; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">{{primary_contact_name}},</p>
              
              <p style="color: #5D4037; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Thank you for your registration for HESS Consortium membership. I want to welcome you and {{organization_name}} personally to membership in the HESS Consortium!</p>
              
              <p style="color: #5D4037; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">I've CCed Gwen Pechan, HESS Board President and CIO at Flagler College to welcome you also.</p>
              
              <p style="color: #5D4037; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">If you have a few minutes, I would love to fill you in on the work we are doing together in the Consortium and with our business partners.</p>
              
              <p style="color: #5D4037; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">We will make sure to get your contact information into our member listserv asap. Make sure to use and update your institutional information on our <a href="https://members.hessconsortium.app/" style="color: #8D6E63; font-weight: bold;">new member portal here</a>.</p>
              
              <p style="color: #5D4037; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Also, make sure to register for an account on our HESS Online Leadership Community collaboration website to download the latest information and join in conversation with HESS CIOs. You will definitely want to sign up online at <a href="https://www.hessconsortium.org/community" style="color: #8D6E63; font-weight: bold;">https://www.hessconsortium.org/community</a> and invite your staff to participate also.</p>
              
              <p style="color: #5D4037; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">You now have access to our HESS / Coalition Educational Discount Program with Insight for computer and network hardware, peripherals and cloud software. Please create an institutional portal account at <a href="https://www.insight.com/HESS" style="color: #8D6E63; font-weight: bold;">www.insight.com/HESS</a> online now. We hope you will evaluate these special Insight discount pricing and let us know how it looks compared to your current suppliers.</p>
              
              <p style="color: #5D4037; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">After you have joined the HESS OLC (mentioned above), click the Member Discounts icon at the top of the page to see all of the discount programs you have access to as a HESS member institution.</p>
              
              <p style="color: #5D4037; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">Again, welcome to our quickly growing group of private, non-profit institutions in technology!</p>
              
              <center>
                <img src="https://www.hessconsortium.org/new/wp-content/uploads/2023/04/KeithFowlkesshortsig.png" alt="Keith Fowlkes Signature" style="margin: 20px 0; max-width: 200px; height: auto;">
              </center>
              
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #8D6E63; font-size: 16px; font-weight: bold; margin: 5px 0;">Keith Fowlkes, M.A., M.B.A.</p>
                <p style="color: #5D4037; font-size: 14px; margin: 5px 0;">Executive Director and Founder</p>
                <p style="color: #8D6E63; font-size: 16px; font-weight: bold; margin: 5px 0;">The HESS Consortium</p>
                <p style="color: #5D4037; font-size: 14px; margin: 5px 0;">keith.fowlkes@hessconsortium.org | 859.516.3571</p>
              </div>
            </div>
          </div>
        `;
        setWelcomeMessage(defaultTemplate);
      }

      const profileUpdateSetting = settings.find(s => s.setting_key === 'profile_update_message_template');
      if (profileUpdateSetting?.setting_value) {
        setProfileUpdateMessage(profileUpdateSetting.setting_value);
      } else {
        // Set default profile update message template with watercolor background
        const defaultProfileUpdateTemplate = `
          <div style="background: url('https://members.hessconsortium.app/src/assets/email-background.png') no-repeat center center; background-size: cover; min-height: 600px; padding: 50px 20px; font-family: 'Georgia', serif;">
            <div style="background: rgba(245, 237, 225, 0.95); max-width: 500px; margin: 0 auto; padding: 40px; border-radius: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
              <center>
                <img src="https://members.hessconsortium.app/lovable-uploads/c2026cbe-1547-4c12-ba1e-542841a78351.png" alt="HESS LOGO" style="width: 200px; height: auto; margin-bottom: 30px;">
              </center>
              
              <p style="color: #5D4037; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Dear {{primary_contact_name}},</p>
              
              <p style="color: #5D4037; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Your profile update request for {{organization_name}} has been approved by our administration team.</p>
              
              <p style="color: #5D4037; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">The changes you requested have been applied to your organization's profile and are now active in our system.</p>
              
              <p style="color: #5D4037; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">You can view your updated profile by logging into the <a href="https://members.hessconsortium.app/" style="color: #8D6E63; font-weight: bold;">HESS Consortium member portal</a>.</p>
              
              <p style="color: #5D4037; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">If you have any questions about your profile or membership, please don't hesitate to contact us.</p>
              
              <center>
                <img src="https://www.hessconsortium.org/new/wp-content/uploads/2023/04/KeithFowlkesshortsig.png" alt="Keith Fowlkes Signature" style="margin: 20px 0; max-width: 200px; height: auto;">
              </center>
              
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #8D6E63; font-size: 16px; font-weight: bold; margin: 5px 0;">Keith Fowlkes, M.A., M.B.A.</p>
                <p style="color: #5D4037; font-size: 14px; margin: 5px 0;">Executive Director and Founder</p>
                <p style="color: #8D6E63; font-size: 16px; font-weight: bold; margin: 5px 0;">The HESS Consortium</p>
                <p style="color: #5D4037; font-size: 14px; margin: 5px 0;">keith.fowlkes@hessconsortium.org | 859.516.3571</p>
              </div>
            </div>
          </div>
        `;
        setProfileUpdateMessage(defaultProfileUpdateTemplate);
      }

      const memberInfoUpdateSetting = settings.find(s => s.setting_key === 'email_member_info_update_template');
      if (memberInfoUpdateSetting?.setting_value) {
        setMemberInfoUpdateMessage(memberInfoUpdateSetting.setting_value);
      } else {
        // Set default member info update message template with watercolor background
        const defaultMemberInfoUpdateTemplate = `
          <div style="background: url('https://members.hessconsortium.app/src/assets/email-background.png') no-repeat center center; background-size: cover; min-height: 650px; padding: 50px 20px; font-family: 'Georgia', serif;">
            <div style="background: rgba(245, 237, 225, 0.95); max-width: 500px; margin: 0 auto; padding: 40px; border-radius: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
              <center>
                <img src="https://members.hessconsortium.app/lovable-uploads/c2026cbe-1547-4c12-ba1e-542841a78351.png" alt="HESS LOGO" style="width: 200px; height: auto; margin-bottom: 30px;">
              </center>
              
              <p style="color: #5D4037; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Dear {{first_name}} {{last_name}},</p>
              
              <p style="color: #5D4037; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Your organization information has been successfully updated in our system.</p>
              
              <p style="color: #8D6E63; font-size: 16px; font-weight: bold; margin: 20px 0 10px 0;">Updated Information:</p>
              <div style="background: rgba(255, 255, 255, 0.8); padding: 20px; border-radius: 10px; margin: 15px 0; border-left: 4px solid #8D6E63;">
                <div style="color: #5D4037; font-size: 14px; line-height: 1.5;">{{update_details}}</div>
              </div>
              
              <p style="color: #5D4037; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">These changes are now active in our system. You can view your updated profile by logging into the <a href="https://members.hessconsortium.app/" style="color: #8D6E63; font-weight: bold;">HESS Consortium member portal</a>.</p>
              
              <p style="color: #5D4037; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">If you have any questions about these changes, please don't hesitate to contact us.</p>
              
              <center>
                <img src="https://www.hessconsortium.org/new/wp-content/uploads/2023/04/KeithFowlkesshortsig.png" alt="Keith Fowlkes Signature" style="margin: 20px 0; max-width: 200px; height: auto;">
              </center>
              
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #8D6E63; font-size: 16px; font-weight: bold; margin: 5px 0;">Keith Fowlkes, M.A., M.B.A.</p>
                <p style="color: #5D4037; font-size: 14px; margin: 5px 0;">Executive Director and Founder</p>
                <p style="color: #8D6E63; font-size: 16px; font-weight: bold; margin: 5px 0;">The HESS Consortium</p>
                <p style="color: #5D4037; font-size: 14px; margin: 5px 0;">keith.fowlkes@hessconsortium.org | 859.516.3571</p>
              </div>
            </div>
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
          <Button 
            onClick={handleSavePasswordMessage}
            disabled={savingMessage}
          >
            {savingMessage ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Save Password Message
          </Button>
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
          <Button 
            onClick={handleSaveWelcomeMessage}
            disabled={savingWelcomeMessage}
          >
            {savingWelcomeMessage ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Save Welcome Message
          </Button>
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
          <Button 
            onClick={handleSaveProfileUpdateMessage}
            disabled={savingProfileUpdateMessage}
          >
            {savingProfileUpdateMessage ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Save Profile Update Message
          </Button>
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
          <Button 
            onClick={handleSaveMemberInfoUpdateMessage}
            disabled={savingMemberInfoUpdateMessage}
          >
            {savingMemberInfoUpdateMessage ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Save Member Information Update Message
          </Button>
        </CardContent>
      </Card>
      
      {/* Organization Invitation Message */}
      <OrganizationInvitationTemplateEditor />
    </div>
  );
};