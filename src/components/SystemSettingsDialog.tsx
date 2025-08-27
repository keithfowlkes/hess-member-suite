import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useSystemSetting, useUpdateSystemSetting } from '@/hooks/useSystemSettings';
import { Save, Key, Shield } from 'lucide-react';

interface SystemSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SystemSettingsDialog({ open, onOpenChange }: SystemSettingsDialogProps) {
  const { data: recaptchaSetting } = useSystemSetting('recaptcha_site_key');
  const updateSetting = useUpdateSystemSetting();
  
  const [recaptchaKey, setRecaptchaKey] = useState('');

  useEffect(() => {
    if (recaptchaSetting?.setting_value) {
      setRecaptchaKey(recaptchaSetting.setting_value);
    }
  }, [recaptchaSetting]);

  const handleSaveRecaptcha = async () => {
    await updateSetting.mutateAsync({
      settingKey: 'recaptcha_site_key',
      settingValue: recaptchaKey,
      description: 'Google reCAPTCHA site key for form verification'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            System Settings
          </DialogTitle>
          <DialogDescription>
            Configure system-wide settings and security features
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* reCAPTCHA Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Key className="w-4 h-4" />
                reCAPTCHA Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recaptcha-key">reCAPTCHA Site Key</Label>
                <Input
                  id="recaptcha-key"
                  type="text"
                  placeholder="Enter your Google reCAPTCHA site key"
                  value={recaptchaKey}
                  onChange={(e) => setRecaptchaKey(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Get your reCAPTCHA site key from the{' '}
                  <a 
                    href="https://www.google.com/recaptcha/admin" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Google reCAPTCHA Admin Console
                  </a>
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-md border-l-4 border-blue-400">
                <h4 className="font-medium text-blue-900 mb-2">Setup Instructions:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Visit the Google reCAPTCHA Admin Console</li>
                  <li>Create a new site or use an existing one</li>
                  <li>Choose "reCAPTCHA v2" and "I'm not a robot" Checkbox</li>
                  <li>Add your domain(s) to the domain list</li>
                  <li>Copy the Site Key and paste it above</li>
                </ol>
              </div>

              <Button 
                onClick={handleSaveRecaptcha}
                disabled={updateSetting.isPending || !recaptchaKey.trim()}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateSetting.isPending ? 'Saving...' : 'Save reCAPTCHA Settings'}
              </Button>
            </CardContent>
          </Card>

          <Separator />

          {/* Current Settings Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="font-medium">reCAPTCHA Status:</Label>
                  <p className={`mt-1 ${recaptchaSetting?.setting_value ? 'text-green-600' : 'text-orange-600'}`}>
                    {recaptchaSetting?.setting_value ? 'Configured' : 'Not configured'}
                  </p>
                </div>
                <div>
                  <Label className="font-medium">Site Key Preview:</Label>
                  <p className="mt-1 text-muted-foreground font-mono text-xs">
                    {recaptchaSetting?.setting_value 
                      ? `${recaptchaSetting.setting_value.substring(0, 20)}...` 
                      : 'No key configured'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}