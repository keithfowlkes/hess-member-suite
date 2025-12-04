import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSystemSetting } from '@/hooks/useSystemSettings';
import { Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export function PasswordEncryptionSetup() {
  const { toast } = useToast();
  const [isSettingUp, setIsSettingUp] = useState(false);
  const { data: encryptionKeySetting, isLoading, refetch } = useSystemSetting('password_encryption_key');
  
  const isConfigured = encryptionKeySetting?.setting_value && encryptionKeySetting.setting_value.length > 0;

  const handleSetupEncryption = async () => {
    setIsSettingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke('set-encryption-key');
      
      if (error) {
        throw error;
      }

      toast({
        title: 'Encryption Configured',
        description: 'Password encryption has been set up successfully.',
      });
      
      // Refetch the setting to update the UI
      refetch();
    } catch (error: any) {
      console.error('Error setting up encryption:', error);
      toast({
        title: 'Setup Failed',
        description: error.message || 'Failed to configure password encryption.',
        variant: 'destructive',
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Password Encryption
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Checking encryption status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Password Encryption
        </CardTitle>
        <CardDescription>
          Secure password storage using AES-256-GCM encryption
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConfigured ? (
          <Alert>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>Encryption Configured</AlertTitle>
            <AlertDescription>
              Password encryption is active. New registrations will have their passwords encrypted before storage.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Encryption Not Configured</AlertTitle>
              <AlertDescription>
                Password encryption is not yet set up. Click the button below to initialize it using the configured secret.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={handleSetupEncryption} 
              disabled={isSettingUp}
              className="w-full"
            >
              {isSettingUp ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting Up Encryption...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Initialize Password Encryption
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
