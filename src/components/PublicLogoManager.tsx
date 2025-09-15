import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, ExternalLink, Eye, Trash2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSystemSetting, useUpdateSystemSetting } from '@/hooks/useSystemSettings';

export function PublicLogoManager() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [logoName, setLogoName] = useState('');
  
  const { data: logoUrlSetting } = useSystemSetting('public_logo_url');
  const { data: logoNameSetting } = useSystemSetting('public_logo_name');
  const updateSystemSetting = useUpdateSystemSetting();

  const currentLogoUrl = logoUrlSetting?.setting_value || '';
  const currentLogoName = logoNameSetting?.setting_value || 'HESS Consortium Logo';

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, etc.)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;

      // Upload to Supabase storage
      const { error: uploadError, data } = await supabase.storage
        .from('invoice-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('invoice-logos')
        .getPublicUrl(fileName);

      // Save the logo URL to system settings
      await updateSystemSetting.mutateAsync({
        settingKey: 'public_logo_url',
        settingValue: publicUrl,
        description: 'URL for the public logo display'
      });

      // Save the logo name if provided
      if (logoName.trim()) {
        await updateSystemSetting.mutateAsync({
          settingKey: 'public_logo_name',
          settingValue: logoName.trim(),
          description: 'Display name for the public logo'
        });
      }

      toast({
        title: "Logo uploaded successfully",
        description: "Your logo has been uploaded and is now available on the public page"
      });

      // Clear the form
      setLogoName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload logo",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      // Remove from system settings
      await updateSystemSetting.mutateAsync({
        settingKey: 'public_logo_url',
        settingValue: '',
        description: 'URL for the public logo display'
      });

      toast({
        title: "Logo removed",
        description: "The logo has been removed from the public page"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to remove logo",
        variant: "destructive"
      });
    }
  };

  const handleViewPublic = () => {
    if (currentLogoUrl) {
      window.open(currentLogoUrl, '_blank');
    } else {
      toast({
        title: "No logo available",
        description: "Please upload a logo first",
        variant: "destructive"
      });
    }
  };

  const handleUpdateName = async () => {
    if (!logoName.trim()) return;

    try {
      await updateSystemSetting.mutateAsync({
        settingKey: 'public_logo_name',
        settingValue: logoName.trim(),
        description: 'Display name for the public logo'
      });

      toast({
        title: "Logo name updated",
        description: "The logo display name has been updated"
      });

      setLogoName('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update logo name",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-primary">
                <ImageIcon className="h-5 w-5" />
                Logo Display Preview
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                This shows your uploaded logo that can be used in other applications
              </p>
            </div>
            <Button onClick={handleViewPublic} variant="outline" className="gap-2" disabled={!currentLogoUrl}>
              <ExternalLink className="h-4 w-4" />
              View Logo File
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            {currentLogoUrl ? (
              <div className="space-y-4">
                <div className="bg-white p-6 rounded-lg shadow-sm border max-w-md mx-auto">
                  <img
                    src={currentLogoUrl}
                    alt={currentLogoName}
                    className="max-w-full max-h-48 mx-auto object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden text-muted-foreground text-sm mt-2">
                    Image failed to load
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-foreground">{currentLogoName}</h2>
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    This logo is publicly accessible and can be embedded in other applications
                  </p>
                  <div className="bg-muted/50 p-3 rounded text-sm font-mono">
                    {currentLogoUrl}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">
                <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>No logo uploaded yet</p>
                <p className="text-sm">Upload a logo to get a direct file URL for use in other applications</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload New Logo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logo-name">Logo Display Name (Optional)</Label>
            <Input
              id="logo-name"
              placeholder="e.g., HESS Consortium Logo"
              value={logoName}
              onChange={(e) => setLogoName(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Upload an image to get a direct file URL that can be used in other applications, websites, or documents
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo-file">Select Logo Image</Label>
            <Input
              id="logo-file"
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <p className="text-sm text-muted-foreground">
              Supported formats: PNG, JPG, GIF, WebP. Maximum size: 5MB. The uploaded file will be directly accessible via URL.
            </p>
          </div>

          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              Uploading logo...
            </div>
          )}

          {/* Update name for existing logo */}
          {currentLogoUrl && logoName.trim() && (
            <Button 
              onClick={handleUpdateName}
              disabled={updateSystemSetting.isPending}
              variant="outline"
              className="w-full"
            >
              <Eye className="h-4 w-4 mr-2" />
              Update Display Name
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Current Logo Management */}
      {currentLogoUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Current Logo Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <img
                  src={currentLogoUrl}
                  alt="Current logo"
                  className="w-12 h-12 object-contain bg-white rounded border"
                />
                <div>
                  <p className="font-medium">{currentLogoName}</p>
                  <p className="text-sm text-muted-foreground">
                    Direct file URL - can be used in other applications
                  </p>
                  <p className="text-xs text-muted-foreground font-mono break-all">
                    {currentLogoUrl}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleRemoveLogo}
                variant="destructive"
                size="sm"
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}