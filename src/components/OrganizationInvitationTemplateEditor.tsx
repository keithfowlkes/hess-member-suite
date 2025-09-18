import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Edit } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import TinyMCEEditor from '@/components/TinyMCEEditor';

export const OrganizationInvitationTemplateEditor = () => {
  const { settings, updateSetting } = useSettings();
  
  const [invitationTemplate, setInvitationTemplate] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Initialize template from settings
  useEffect(() => {
    if (settings) {
      const templateSetting = settings.find(s => s.setting_key === 'organization_invitation_template');
      if (templateSetting?.setting_value) {
        setInvitationTemplate(templateSetting.setting_value);
      } else {
        // Set default organization invitation template with watercolor background
        const defaultTemplate = `
          <div style="background: url('https://members.hessconsortium.app/src/assets/email-background.png') no-repeat center center; background-size: cover; min-height: 800px; padding: 50px 20px; font-family: 'Georgia', serif;">
            <div style="background: rgba(245, 237, 225, 0.95); max-width: 500px; margin: 0 auto; padding: 40px; border-radius: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
              <center>
                <img src="https://members.hessconsortium.app/lovable-uploads/c2026cbe-1547-4c12-ba1e-542841a78351.png" alt="HESS LOGO" style="width: 200px; height: auto; margin-bottom: 30px;">
              </center>
              
              <p style="color: #5D4037; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Dear {{invitee_email}},</p>
              
              <p style="color: #5D4037; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">{{organization_name}} has been invited to become a member institution of the HESS Consortium.</p>
              
              <p style="color: #5D4037; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">The HESS Consortium is a collaborative network of private, non-profit higher education institutions focused on sharing technology resources, best practices, and building strategic partnerships.</p>
              
              <p style="color: #5D4037; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">To accept this invitation and set up your account, please click the link below:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{invitation_link}}" style="background: linear-gradient(135deg, #8D6E63, #A1887F); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(141, 110, 99, 0.3); transition: all 0.3s ease;">Accept Invitation</a>
              </div>
              
              <p style="color: #8D6E63; font-size: 16px; font-weight: bold; margin: 25px 0 15px 0;">What you'll get as a HESS member:</p>
              <ul style="margin-left: 20px; line-height: 1.8; color: #5D4037; font-size: 15px;">
                <li style="margin-bottom: 8px;">Access to our HESS Online Leadership Community collaboration website</li>
                <li style="margin-bottom: 8px;">Educational discount programs with our business partners</li>
                <li style="margin-bottom: 8px;">Networking opportunities with CIOs from similar institutions</li>
                <li style="margin-bottom: 8px;">Shared resources and best practices in higher education technology</li>
              </ul>
              
              <p style="color: #5D4037; font-size: 16px; line-height: 1.6; margin: 25px 0 20px 0;">This invitation will expire in 7 days. If you have any questions about HESS membership or this invitation, please don't hesitate to contact us.</p>
              
              <p style="color: #5D4037; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">We look forward to welcoming {{organization_name}} to our growing consortium!</p>
              
              <center>
                <img src="https://www.hessconsortium.org/new/wp-content/uploads/2023/04/KeithFowlkesshortsig.png" alt="Keith Fowlkes Signature" style="margin: 20px 0; max-width: 200px; height: auto;">
              </center>
              
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #8D6E63; font-size: 16px; font-weight: bold; margin: 5px 0;">Keith Fowlkes, M.A., M.B.A.</p>
                <p style="color: #5D4037; font-size: 14px; margin: 5px 0;">Executive Director and Founder</p>
                <p style="color: #8D6E63; font-size: 16px; font-weight: bold; margin: 5px 0;">The HESS Consortium</p>
                <p style="color: #5D4037; font-size: 14px; margin: 5px 0;">keith.fowlkes@hessconsortium.org | 859.516.3571</p>
              </div>
              
              <hr style="margin: 30px 0; border: none; border-top: 2px solid rgba(141, 110, 99, 0.3);">
              
              <p style="font-size: 12px; color: #8D6E63; text-align: center; font-style: italic;">
                If you believe you received this invitation in error, please contact us at keith.fowlkes@hessconsortium.org
              </p>
            </div>
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

  return (
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
        
        <Button 
          onClick={handleSaveTemplate}
          disabled={savingTemplate || !invitationTemplate.trim()}
          className="w-full"
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
      </CardContent>
    </Card>
  );
};