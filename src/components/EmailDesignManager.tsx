import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, Palette, Upload, Eye, Save, CheckCircle, AlertCircle, Image as ImageIcon, Settings2 } from 'lucide-react';
import { useSystemSetting, useUpdateSystemSetting } from '@/hooks/useSystemSettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const EmailDesignManager = () => {
  const { toast } = useToast();
  const updateSystemSetting = useUpdateSystemSetting();
  
  // Design settings hooks
  const { data: templateSetting } = useSystemSetting('email_design_template');
  const { data: backgroundImageSetting } = useSystemSetting('email_background_image');
  const { data: primaryColorSetting } = useSystemSetting('email_design_primary_color');
  const { data: accentColorSetting } = useSystemSetting('email_design_accent_color');
  const { data: textColorSetting } = useSystemSetting('email_design_text_color');
  const { data: cardBackgroundSetting } = useSystemSetting('email_design_card_background');

  // Local state
  const [selectedTemplate, setSelectedTemplate] = useState('modern_block');
  const [backgroundImage, setBackgroundImage] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#8B7355');
  const [accentColor, setAccentColor] = useState('#D4AF37');
  const [textColor, setTextColor] = useState('#4A4A4A');
  const [cardBackground, setCardBackground] = useState('rgba(248, 245, 238, 0.95)');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Initialize state from settings
  useEffect(() => {
    if (templateSetting?.setting_value) setSelectedTemplate(templateSetting.setting_value);
    if (backgroundImageSetting?.setting_value) setBackgroundImage(backgroundImageSetting.setting_value);
    if (primaryColorSetting?.setting_value) setPrimaryColor(primaryColorSetting.setting_value);
    if (accentColorSetting?.setting_value) setAccentColor(accentColorSetting.setting_value);
    if (textColorSetting?.setting_value) setTextColor(textColorSetting.setting_value);
    if (cardBackgroundSetting?.setting_value) setCardBackground(cardBackgroundSetting.setting_value);
  }, [templateSetting, backgroundImageSetting, primaryColorSetting, accentColorSetting, textColorSetting, cardBackgroundSetting]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file (PNG, JPG, WEBP, etc.)',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 5MB)
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
        description: 'Background image uploaded successfully. Click Save to apply changes.',
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

  const handleSaveDesign = async () => {
    try {
      await Promise.all([
        updateSystemSetting.mutateAsync({
          settingKey: 'email_design_template',
          settingValue: selectedTemplate,
          description: 'Selected email design template type'
        }),
        updateSystemSetting.mutateAsync({
          settingKey: 'email_background_image',
          settingValue: backgroundImage,
          description: 'URL of the background image for email templates'
        }),
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
        })
      ]);

      toast({
        title: 'Design saved',
        description: 'Email design settings have been saved successfully. All new emails will use these settings.',
      });
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error.message || 'Failed to save design settings',
        variant: 'destructive'
      });
    }
  };

  const sendPreviewEmail = async () => {
    setPreviewLoading(true);
    try {
      const response = await fetch('https://tyovnvuluyosjnabrzjc.supabase.co/functions/v1/centralized-email-delivery-public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5b3ZudnVsdXlvc2puYWJyempjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjE0MzIsImV4cCI6MjA3MTc5NzQzMn0.G3HlqGeyLS_39jxbrKtttcsE93A9WvFSEByJow--470'
        },
        body: JSON.stringify({
          type: 'test',
          to: ['admin@test.com'],
          subject: 'Email Design Preview',
          data: {
            test_message: 'This is a preview of your email design settings. The design includes your custom background, colors, and layout preferences.',
            timestamp: new Date().toISOString(),
            test_id: 'preview-' + Date.now(),
            system_info: 'Design Preview Test'
          },
          preview: true
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Preview email sent',
          description: 'A preview email has been generated with your current design settings.',
        });
      } else {
        throw new Error(result.error || 'Failed to send preview');
      }
    } catch (error: any) {
      toast({
        title: 'Preview failed',
        description: error.message || 'Failed to generate email preview',
        variant: 'destructive'
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const templateOptions = [
    { value: 'modern_block', label: 'Modern Block Design', description: 'Clean, card-based layout with modern styling' },
    { value: 'classic', label: 'Classic Design', description: 'Traditional email layout with simple formatting' },
    { value: 'minimal', label: 'Minimal Design', description: 'Clean and minimalist approach' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Email Design Control Center
        </h3>
        <p className="text-muted-foreground mt-2">
          Centralized control for all email template designs. Changes here will affect all outgoing emails including welcome messages, password resets, and notifications.
        </p>
      </div>

      <Tabs defaultValue="template" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="template" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Template
          </TabsTrigger>
          <TabsTrigger value="background" className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Background
          </TabsTrigger>
          <TabsTrigger value="colors" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Colors
          </TabsTrigger>
        </TabsList>

        <TabsContent value="template" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Template Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email Template Style</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template style" />
                  </SelectTrigger>
                  <SelectContent>
                    {templateOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{option.label}</span>
                          <span className="text-sm text-muted-foreground">{option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Template Coverage</h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Welcome Messages
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Password Reset
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Registration Notifications
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Member Updates
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Invoice Emails
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    System Test Messages
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="background" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Background Image Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Upload Background Image</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                  <div className="text-center">
                    <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Upload a background image for email templates
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Recommended: 1200x800px, PNG/JPG, under 5MB
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="background-upload"
                        disabled={uploadLoading}
                      />
                      <Label htmlFor="background-upload" className="cursor-pointer">
                        <Button disabled={uploadLoading} className="mt-2" asChild>
                          <span>
                            {uploadLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                Choose File
                              </>
                            )}
                          </span>
                        </Button>
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              {backgroundImage && (
                <div className="space-y-2">
                  <Label>Current Background</Label>
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <img 
                      src={backgroundImage} 
                      alt="Email background" 
                      className="w-full h-32 object-cover rounded border"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active Background
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setBackgroundImage('')}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Color Scheme Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary-color"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#8B7355"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accent-color">Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accent-color"
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      placeholder="#D4AF37"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="text-color">Text Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="text-color"
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      placeholder="#4A4A4A"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="card-background">Card Background</Label>
                  <Input
                    id="card-background"
                    value={cardBackground}
                    onChange={(e) => setCardBackground(e.target.value)}
                    placeholder="rgba(248, 245, 238, 0.95)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use rgba() values for transparency effects
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Color Preview</h4>
                <div className="flex gap-2">
                  <div 
                    className="w-12 h-12 rounded border-2 border-white shadow-sm"
                    style={{ backgroundColor: primaryColor }}
                    title="Primary Color"
                  />
                  <div 
                    className="w-12 h-12 rounded border-2 border-white shadow-sm"
                    style={{ backgroundColor: accentColor }}
                    title="Accent Color"
                  />
                  <div 
                    className="w-12 h-12 rounded border-2 border-white shadow-sm"
                    style={{ backgroundColor: textColor }}
                    title="Text Color"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Save Design Settings
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Save Email Design Settings</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will update the design for ALL email templates including welcome messages, 
                    password resets, registration notifications, and system messages. 
                    The changes will take effect immediately for new emails.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSaveDesign}>
                    Save Settings
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button 
              variant="outline" 
              onClick={sendPreviewEmail}
              disabled={previewLoading}
              className="flex-1"
            >
              {previewLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Preview...
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Design
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};