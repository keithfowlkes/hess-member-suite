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
        // Set default organization invitation template
        const defaultTemplate = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <center>
              <img src="http://www.hessconsortium.org/new/wp-content/uploads/2023/03/HESSlogoMasterFLAT.png" alt="HESS LOGO" style="width:230px; height:155px;">
            </center>
            
            <p>Dear {{invitee_email}},</p>
            
            <p>You have been invited to become the primary contact for {{organization_name}} in the HESS Consortium member directory.</p>
            
            <p>The HESS Consortium is a collaborative network of private, non-profit higher education institutions focused on sharing technology resources, best practices, and building strategic partnerships.</p>
            
            <p>To accept this invitation and set up your account, please click the link below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{invitation_link}}" style="background-color: #0066cc; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">Accept Invitation</a>
            </div>
            
            <p><strong>What you'll get as a HESS member:</strong></p>
            <ul style="margin-left: 20px; line-height: 1.6;">
              <li>Access to our HESS Online Leadership Community collaboration website</li>
              <li>Educational discount programs with our business partners</li>
              <li>Networking opportunities with CIOs from similar institutions</li>
              <li>Shared resources and best practices in higher education technology</li>
            </ul>
            
            <p>This invitation will expire in 7 days. If you have any questions about HESS membership or this invitation, please don't hesitate to contact us.</p>
            
            <p>We look forward to welcoming {{organization_name}} to our growing consortium!</p>
            
            <img src="https://www.hessconsortium.org/new/wp-content/uploads/2023/04/KeithFowlkesshortsig.png" alt="Keith Fowlkes Signature" style="margin: 20px 0;">
            
            <p>Keith Fowlkes, M.A., M.B.A.<br>
            Executive Director and Founder<br>
            The HESS Consortium<br>
            keith.fowlkes@hessconsortium.org | 859.516.3571</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            
            <p style="font-size: 12px; color: #666; text-align: center;">
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