import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, Palette, Upload, Eye, Save, CheckCircle, Settings2, Mail, Wand2 } from 'lucide-react';
import { useSystemSetting, useUpdateSystemSetting } from '@/hooks/useSystemSettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables: string[];
}

export const UnifiedEmailDesignSystem = () => {
  const { toast } = useToast();
  const updateSystemSetting = useUpdateSystemSetting();
  
  // Design settings hooks
  const { data: primaryColorSetting } = useSystemSetting('email_design_primary_color');
  const { data: accentColorSetting } = useSystemSetting('email_design_accent_color');
  const { data: textColorSetting } = useSystemSetting('email_design_text_color');
  const { data: cardBackgroundSetting } = useSystemSetting('email_design_card_background');
  const { data: backgroundImageSetting } = useSystemSetting('email_background_image');
  const { data: logoSetting } = useSystemSetting('public_logo_url');

  // Message template hooks
  const { data: passwordResetSetting } = useSystemSetting('password_reset_message');
  const { data: welcomeMessageSetting } = useSystemSetting('welcome_message_template');
  const { data: profileUpdateSetting } = useSystemSetting('profile_update_message_template');

  // Local state for design
  const [primaryColor, setPrimaryColor] = useState('#9d8161');
  const [accentColor, setAccentColor] = useState('#c6bc76');
  const [textColor, setTextColor] = useState('#4A4A4A');
  const [cardBackground, setCardBackground] = useState('#f8f5ee');
  const [backgroundImage, setBackgroundImage] = useState('');
  
  // Template states
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('password_reset');
  const [activeTemplate, setActiveTemplate] = useState<EmailTemplate | null>(null);
  
  // UI states
  const [uploadLoading, setUploadLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Initialize email templates
  useEffect(() => {
    const defaultTemplates: EmailTemplate[] = [
      {
        id: 'password_reset',
        name: 'Password Reset',
        subject: 'Password Reset Request',
        content: passwordResetSetting?.setting_value || `<p style="margin-bottom: 20px;">Dear {{user_name}},</p>

<p style="margin-bottom: 25px;">We received a request to reset your password for your HESS Consortium account.</p>

{{login_hint_section}}

<div style="text-align: center; margin: 30px 0;">
  <a href="{{reset_link}}" style="background: linear-gradient(135deg, {{primary_color}}, {{accent_color}}); color: white; padding: 16px 32px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(139, 115, 85, 0.3);">Reset Your Password</a>
</div>

<div style="background: {{accent_color_light}}; border: 2px solid {{accent_color_border}}; border-radius: 12px; padding: 20px; margin: 25px 0;">
  <p style="font-size: 14px; line-height: 1.6; margin: 0; color: {{text_color}};"><strong>Security Notice:</strong> This link will expire in {{expiry_time}}. If you did not request this reset, please ignore this email and your password will remain unchanged.</p>
</div>

<p style="margin-top: 30px; color: {{text_color}};">Best regards,<br><strong style="color: {{primary_color}};">HESS Consortium Team</strong></p>`,
        variables: ['user_name', 'reset_link', 'login_hint_section', 'expiry_time']
      },
      {
        id: 'welcome_message',
        name: 'Welcome Message',
        subject: 'Welcome to HESS Consortium!',
        content: welcomeMessageSetting?.setting_value || `<p style="margin-bottom: 20px;">Dear {{primary_contact_name}},</p>

<p style="margin-bottom: 20px;">Welcome to the HESS Consortium! We're thrilled to have {{organization_name}} as a member of our community.</p>

<div style="text-align: center; margin: 30px 0;">
  <a href="https://members.hessconsortium.app/" style="background: linear-gradient(135deg, {{primary_color}}, {{accent_color}}); color: white; padding: 16px 32px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 16px;">Access Member Portal</a>
</div>

<p style="margin-bottom: 20px;">Your membership gives you access to exclusive resources, networking opportunities, and member discounts.</p>

<p style="margin-top: 30px; color: {{text_color}};">Best regards,<br><strong style="color: {{primary_color}};">HESS Consortium Team</strong></p>`,
        variables: ['primary_contact_name', 'organization_name']
      },
      {
        id: 'profile_update',
        name: 'Profile Update Confirmation',
        subject: 'Profile Update Approved',
        content: profileUpdateSetting?.setting_value || `<p style="margin-bottom: 20px;">Dear {{primary_contact_name}},</p>

<p style="margin-bottom: 20px;">Your profile update request for {{organization_name}} has been approved and the changes are now active.</p>

<div style="background: {{accent_color_light}}; border: 2px solid {{accent_color_border}}; border-radius: 12px; padding: 20px; margin: 25px 0;">
  <p style="font-size: 14px; line-height: 1.6; margin: 0; color: {{text_color}};"><strong>Updated Information:</strong> Your organization profile has been successfully updated with the new information you provided.</p>
</div>

<div style="text-align: center; margin: 30px 0;">
  <a href="https://members.hessconsortium.app/profile" style="background: linear-gradient(135deg, {{primary_color}}, {{accent_color}}); color: white; padding: 16px 32px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 16px;">View Your Profile</a>
</div>

<p style="margin-top: 30px; color: {{text_color}};">Best regards,<br><strong style="color: {{primary_color}};">HESS Consortium Team</strong></p>`,
        variables: ['primary_contact_name', 'organization_name']
      }
    ];
    
    setTemplates(defaultTemplates);
    setActiveTemplate(defaultTemplates[0]);
  }, [passwordResetSetting, welcomeMessageSetting, profileUpdateSetting]);

  // Initialize design settings from database
  useEffect(() => {
    if (primaryColorSetting?.setting_value) setPrimaryColor(primaryColorSetting.setting_value);
    if (accentColorSetting?.setting_value) setAccentColor(accentColorSetting.setting_value);
    if (textColorSetting?.setting_value) setTextColor(textColorSetting.setting_value);
    if (cardBackgroundSetting?.setting_value) setCardBackground(cardBackgroundSetting.setting_value);
    if (backgroundImageSetting?.setting_value) setBackgroundImage(backgroundImageSetting.setting_value);
  }, [primaryColorSetting, accentColorSetting, textColorSetting, cardBackgroundSetting, backgroundImageSetting]);

  // Utility function to convert hex to rgba (email-safe)
  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);  
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplateId(templateId);
      setActiveTemplate(template);
    }
  };

  const handleTemplateContentChange = (content: string) => {
    if (activeTemplate) {
      const updatedTemplate = { ...activeTemplate, content };
      setActiveTemplate(updatedTemplate);
      
      // Update templates array
      setTemplates(prev => 
        prev.map(t => t.id === activeTemplate.id ? updatedTemplate : t)
      );
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file',
        variant: 'destructive'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 5MB',
        variant: 'destructive'
      });
      return;
    }

    setUploadLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `email-background-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('invoice-logos')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('invoice-logos')
        .getPublicUrl(fileName);

      setBackgroundImage(publicUrl);
      
      toast({
        title: 'Background uploaded',
        description: 'Background image uploaded successfully.',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload background image',
        variant: 'destructive'
      });
    } finally {
      setUploadLoading(false);
    }
  };

  const generatePreview = () => {
    if (!activeTemplate) return;

    // Create email-safe colors
    const lightBackground = hexToRgba(accentColor, 0.1);
    const lightBorder = hexToRgba(accentColor, 0.3);
    
    // Replace color variables with actual values
    let content = activeTemplate.content
      .replace(/{{primary_color}}/g, primaryColor)
      .replace(/{{accent_color}}/g, accentColor)
      .replace(/{{text_color}}/g, textColor)
      .replace(/{{accent_color_light}}/g, lightBackground)
      .replace(/{{accent_color_border}}/g, lightBorder);

    // Replace template variables with sample data
    content = content
      .replace(/{{user_name}}/g, 'John Smith')
      .replace(/{{primary_contact_name}}/g, 'John Smith')
      .replace(/{{organization_name}}/g, 'Sample University')
      .replace(/{{reset_link}}/g, '#password-reset-link')
      .replace(/{{expiry_time}}/g, '24 hours')
      .replace(/{{login_hint_section}}/g, '<p style="color: #666; font-size: 14px; font-style: italic; margin: 20px 0;">If you are having trouble logging in, try using your email address as your username.</p>');

    const logoUrl = logoSetting?.setting_value;
    const emailOptimizedLogo = logoUrl 
      ? `<img src="${logoUrl}" alt="HESS Consortium Logo" style="max-width: 200px; height: auto; display: block; margin: 0 auto 20px auto;" border="0">`
      : '';

    const backgroundStyle = backgroundImage 
      ? `background-image: url('${backgroundImage}'); background-size: cover; background-position: center; background-repeat: no-repeat; min-height: 100vh; background-color: ${primaryColor};`
      : `background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%); min-height: 100vh;`;

    const previewHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HESS Consortium - ${activeTemplate.name}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Georgia, 'Times New Roman', serif; line-height: 1.6; ${backgroundStyle}">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="min-height: 100vh; padding: 60px 20px;">
        <tr>
            <td align="center" valign="top">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background: ${cardBackground}; border-radius: 20px; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1); overflow: hidden; backdrop-filter: blur(10px);">
                    <tr>
                        <td style="padding: 40px 40px 20px 40px; text-align: center;">
                            ${emailOptimizedLogo}
                            <div style="height: 3px; background: linear-gradient(90deg, ${accentColor} 0%, ${primaryColor} 50%, ${accentColor} 100%); border-radius: 2px; margin: 15px auto 0 auto; width: 120px;"></div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 50px 40px 50px;">
                            <div style="color: ${textColor}; font-size: 16px; line-height: 1.8; text-align: left;">
                                ${content}
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="background: ${lightBackground}; padding: 30px 40px; border-top: 2px solid ${lightBorder}; text-align: center;">
                            <p style="margin: 0; color: ${primaryColor}; font-size: 14px; font-weight: 500;">
                                © ${new Date().getFullYear()} HESS Consortium. All rights reserved.
                            </p>
                            <p style="margin: 8px 0 0 0; color: ${hexToRgba(primaryColor, 0.8)}; font-size: 12px;">
                                This email was sent from the HESS Consortium Member Portal
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
    
    setPreviewContent(previewHtml);
    setPreviewOpen(true);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Save design settings
      const designPromises = [
        updateSystemSetting.mutateAsync({
          settingKey: 'email_design_primary_color',
          settingValue: primaryColor,
          description: 'Primary color for email design elements'
        }),
        updateSystemSetting.mutateAsync({
          settingKey: 'email_design_accent_color',
          settingValue: accentColor,
          description: 'Accent color for email design elements'
        }),
        updateSystemSetting.mutateAsync({
          settingKey: 'email_design_text_color',
          settingValue: textColor,
          description: 'Primary text color for email templates'
        }),
        updateSystemSetting.mutateAsync({
          settingKey: 'email_design_card_background',
          settingValue: cardBackground,
          description: 'Background color for email content cards'
        }),
        updateSystemSetting.mutateAsync({
          settingKey: 'email_background_image',
          settingValue: backgroundImage,
          description: 'URL of the background image for email templates'
        })
      ];

      // Save template content
      const templatePromises = templates.map(template => {
        const settingKey = template.id === 'password_reset' ? 'password_reset_message' : 
                          template.id === 'welcome_message' ? 'welcome_message_template' :
                          template.id === 'profile_update' ? 'profile_update_message_template' : null;
        
        if (settingKey) {
          return updateSystemSetting.mutateAsync({
            settingKey,
            settingValue: template.content,
            description: `Email template content for ${template.name}`
          });
        }
        return Promise.resolve();
      });

      await Promise.all([...designPromises, ...templatePromises]);

      toast({
        title: 'All settings saved',
        description: 'Email design and template settings have been saved successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error.message || 'Failed to save settings',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Wand2 className="w-5 h-5" />
          Unified Email Design System
        </h3>
        <p className="text-muted-foreground mt-2">
          Complete control over email design and content. All changes apply immediately to outgoing emails.
        </p>
      </div>

      <Tabs defaultValue="design" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="design" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Visual Design
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Content & Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="design" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Color Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Color Scheme
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-16 h-10"
                    />
                    <Input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-16 h-10"
                    />
                    <Input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Text Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-16 h-10"
                    />
                    <Input
                      type="text"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Card Background</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={cardBackground}
                      onChange={(e) => setCardBackground(e.target.value)}
                      className="w-16 h-10"
                    />
                    <Input
                      type="text"
                      value={cardBackground}
                      onChange={(e) => setCardBackground(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Background Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Background Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Background Image</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="bg-upload"
                      disabled={uploadLoading}
                    />
                    <Label htmlFor="bg-upload" className="cursor-pointer">
                      <Button disabled={uploadLoading} className="w-full" asChild>
                        <span>
                          {uploadLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Upload Background
                            </>
                          )}
                        </span>
                      </Button>
                    </Label>
                  </div>
                  {backgroundImage && (
                    <p className="text-sm text-muted-foreground">
                      Current: {backgroundImage.split('/').pop()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Template Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Email Templates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {templates.map(template => (
                  <Button
                    key={template.id}
                    variant={selectedTemplateId === template.id ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {template.name}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Template Editor */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">
                  {activeTemplate?.name || 'Select Template'}
                </CardTitle>
                {activeTemplate && (
                  <p className="text-sm text-muted-foreground">
                    Available variables: {activeTemplate.variables.map(v => `{{${v}}}`).join(', ')}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {activeTemplate && (
                  <textarea
                    value={activeTemplate.content}
                    onChange={(e) => handleTemplateContentChange(e.target.value)}
                    className="w-full h-96 p-3 border rounded-md font-mono text-sm"
                    placeholder="Edit your email template content here..."
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-6 border-t">
        <Button
          onClick={generatePreview}
          variant="outline"
          className="flex-1"
          disabled={!activeTemplate}
        >
          <Eye className="w-4 h-4 mr-2" />
          Preview Email
        </Button>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="flex-1" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save All Changes
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Save All Email Settings</AlertDialogTitle>
              <AlertDialogDescription>
                This will save both design settings and email template content. 
                Changes will take effect immediately for all outgoing emails.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSaveAll}>
                Save All Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Email Preview - {activeTemplate?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <iframe
              srcDoc={previewContent}
              className="w-full h-[70vh] border rounded"
              title="Email Preview"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};