import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, Mail, Key, Save, CheckCircle, AlertCircle, Shield, BarChart3, FileText } from 'lucide-react';
import { useSystemSetting, useUpdateSystemSetting } from '@/hooks/useSystemSettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const ResendApiConfig = () => {
  const { toast } = useToast();
  const updateSystemSetting = useUpdateSystemSetting();
  
  // Email sender setting
  const { data: emailFromSetting } = useSystemSetting('email_from');
  
  // Email rate limit delay setting
  const { data: emailDelaySetting } = useSystemSetting('email_rate_limit_delay_ms');
  const [emailDelay, setEmailDelay] = useState('550');

  // API configuration states
  const [resendApiKey, setResendApiKey] = useState('');
  const [resendFromEmail, setResendFromEmail] = useState('');
  const [emailConfigLoading, setEmailConfigLoading] = useState(false);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);

  // Email configuration verification
  const [configVerificationResult, setConfigVerificationResult] = useState<any>(null);
  const [configVerificationLoading, setConfigVerificationLoading] = useState(false);

  // Initialize email delay setting
  useEffect(() => {
    if (emailDelaySetting?.setting_value) {
      setEmailDelay(emailDelaySetting.setting_value);
    }
  }, [emailDelaySetting]);

  const handleVerifyEmailConfig = async () => {
    setConfigVerificationLoading(true);
    setConfigVerificationResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('verify-email-config');

      if (error) {
        console.error('Config verification error:', error);
        setConfigVerificationResult({
          success: false,
          error: error.message || 'Failed to verify configuration'
        });
        return;
      }

      setConfigVerificationResult(data);
    } catch (error: any) {
      console.error('Config verification error:', error);
      setConfigVerificationResult({
        success: false,
        error: error.message || 'Failed to verify configuration'
      });
    } finally {
      setConfigVerificationLoading(false);
    }
  };

  // Email configuration management
  const handleUpdateEmailConfig = async () => {
    if (!resendFromEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a valid from email address.',
        variant: 'destructive'
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resendFromEmail)) {
      toast({
        title: 'Error',
        description: 'Please enter a valid email address format.',
        variant: 'destructive'
      });
      return;
    }

    setEmailConfigLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-email-config', {
        body: { resendFromEmail: resendFromEmail.trim() }
      });

      if (error) {
        console.error('Sender update error:', error);
        toast({
          title: 'Update Failed',
          description: error.message || 'Failed to update sender address',
          variant: 'destructive'
        });
        return;
      }

      if (data.success) {
        toast({
          title: 'Sender Updated',
          description: 'From address updated. Changes may take a few minutes to propagate.',
        });
        setResendFromEmail('');
      } else {
        throw new Error(data.message || 'Update failed');
      }
    } catch (error: any) {
      toast({
        title: 'Configuration Error',
        description: error.message || 'Failed to update sender address',
        variant: 'destructive'
      });
    } finally {
      setEmailConfigLoading(false);
    }
  };

  // Resend API key management
  const handleUpdateResendApiKey = async () => {
    if (!resendApiKey.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a valid Resend API key.',
        variant: 'destructive'
      });
      return;
    }

    setApiKeyLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-email-config', {
        body: {
          resendApiKey: resendApiKey.trim()
        }
      });

      if (error) {
        console.error('API key update error:', error);
        toast({
          title: 'API Key Update Failed',
          description: error.message || 'Failed to update API key',
          variant: 'destructive'
        });
        return;
      }

      if (data.success) {
        toast({
          title: 'API Key Updated',
          description: 'Resend API key has been updated successfully. Changes may take a few minutes to take effect.',
        });
        setResendApiKey(''); // Clear for security
      } else {
        throw new Error(data.message || 'Update failed');
      }
    } catch (error: any) {
      console.error('API key update error:', error);
      toast({
        title: 'Configuration Error',
        description: error.message || 'Failed to update API key',
        variant: 'destructive'
      });
    } finally {
      setApiKeyLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold">Resend API Configuration</h3>
        <p className="text-muted-foreground">Configure Resend email service settings and API credentials</p>
      </div>

      {/* Rate Limiting Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Email Rate Limiting Configuration
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure delays between bulk email sends to respect Resend API rate limits (max 2 requests/second)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email-delay">Delay Between Emails (milliseconds)</Label>
              <Input
                id="email-delay"
                type="number"
                min="500"
                max="5000"
                step="50"
                value={emailDelay}
                onChange={(e) => setEmailDelay(e.target.value)}
                placeholder="550"
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 550ms (safely under 2 req/sec limit). Lower values may cause rate limit errors.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Rate Limit Information</Label>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="text-sm space-y-1">
                  <p className="text-blue-700 font-medium">Current Setting: {emailDelay}ms</p>
                  <p className="text-blue-600">Effective Rate: ~{Math.round(1000 / parseInt(emailDelay || '550'))} emails/second</p>
                  <p className="text-blue-600">Recommended: 550ms for optimal delivery</p>
                </div>
              </div>
            </div>
          </div>

          <Button 
            onClick={async () => {
              await updateSystemSetting.mutateAsync({
                settingKey: 'email_rate_limit_delay_ms',
                settingValue: emailDelay,
                description: 'Delay in milliseconds between bulk email sends to respect rate limits'
              });
            }}
            disabled={updateSystemSetting.isPending}
            className="w-full sm:w-auto"
          >
            <Save className="w-4 h-4 mr-2" />
            {updateSystemSetting.isPending ? 'Saving...' : 'Save Rate Limit Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Current Configuration Status */}
      <Card className="bg-gradient-to-r from-background to-muted/20 border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Current Configuration Status
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
            <div className="space-y-1">
              <p className="text-muted-foreground">Provider</p>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Resend
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">From Address</p>
              <p className="font-mono text-xs bg-muted px-2 py-1 rounded">
                {emailFromSetting?.setting_value || 'Not configured (using RESEND_FROM or sandbox)'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">API Key Status</p>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Configured
              </Badge>
            </div>
          </div>
          
          {/* Verification Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Configuration Verification</p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleVerifyEmailConfig}
                disabled={configVerificationLoading}
              >
                {configVerificationLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Verify Configuration
                  </>
                )}
              </Button>
            </div>
            
            {configVerificationResult && (
              <div className={`p-3 rounded-lg border text-sm ${
                configVerificationResult.success 
                  ? 'bg-green-50 border-green-200 text-green-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="flex items-start gap-2">
                  {configVerificationResult.success ? (
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="space-y-1">
                    <p className="font-medium">{configVerificationResult.message}</p>
                    {configVerificationResult.details && (
                      <pre className="text-xs bg-black/5 p-2 rounded border overflow-auto whitespace-pre-wrap">
                        {JSON.stringify(configVerificationResult.details, null, 2)}
                      </pre>
                    )}
                    {configVerificationResult.recommendations && (
                      <div className="mt-2">
                        <p className="font-medium mb-1">Recommendations:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {configVerificationResult.recommendations.map((rec: string, idx: number) => (
                            <li key={idx} className="text-xs">{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Email Configuration Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* From Email Configuration */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="w-4 h-4" />
              From Email Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="from-email">Sender Email Address</Label>
              <div className="relative">
                <Input
                  id="from-email"
                  type="email"
                  value={resendFromEmail}
                  onChange={(e) => setResendFromEmail(e.target.value)}
                  placeholder="noreply@hessconsortium.org"
                  className="pr-10"
                />
                {resendFromEmail && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {resendFromEmail.includes('@') && resendFromEmail.length > 5 ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Mail className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p>Must use a domain verified in your Resend account</p>
                  <p className="text-primary hover:underline cursor-pointer"
                     onClick={() => window.open('https://resend.com/domains', '_blank')}>
                    Verify domain at resend.com/domains →
                  </p>
                </div>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  disabled={emailConfigLoading || !resendFromEmail.trim() || !resendFromEmail.includes('@')}
                  className="w-full"
                  size="sm"
                >
                  {emailConfigLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating From Address...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Update From Address
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Update From Email Address
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    You're about to update the sender email address to:
                    <code className="block bg-muted p-2 rounded font-mono text-sm mt-2">
                      {resendFromEmail}
                    </code>
                    <span className="block text-xs text-muted-foreground mt-2">
                      Make sure this domain is verified in your Resend account first.
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleUpdateEmailConfig}>
                    Update Address
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* API Key Configuration */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Key className="w-4 h-4" />
              Resend API Key
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type="password"
                  value={resendApiKey}
                  onChange={(e) => setResendApiKey(e.target.value)}
                  placeholder="re_..."
                  className="pr-10"
                />
                {resendApiKey && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {resendApiKey.startsWith('re_') && resendApiKey.length > 10 ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Key className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p>Get your API key from the Resend dashboard</p>
                  <p className="text-primary hover:underline cursor-pointer"
                     onClick={() => window.open('https://resend.com/api-keys', '_blank')}>
                    Generate key at resend.com/api-keys →
                  </p>
                </div>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  disabled={apiKeyLoading || !resendApiKey.trim() || !resendApiKey.startsWith('re_')}
                  className="w-full"
                  size="sm"
                >
                  {apiKeyLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating API Key...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Update API Key
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    Update Resend API Key
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    You're about to update the Resend API key.
                    <code className="block bg-muted p-2 rounded font-mono text-sm mt-2">
                      {resendApiKey.substring(0, 8)}{'*'.repeat(Math.max(0, resendApiKey.length - 8))}
                    </code>
                    <span className="block text-xs text-muted-foreground mt-2">
                      This will replace the current API key. You'll need to update this manually in Supabase Edge Functions secrets.
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleUpdateResendApiKey}>
                    Update API Key
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Quick Actions & Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-auto py-3 px-4 flex flex-col items-start gap-1"
              onClick={() => window.open('https://resend.com/dashboard', '_blank')}
            >
              <div className="flex items-center gap-2 font-medium">
                <BarChart3 className="w-4 h-4" />
                Resend Dashboard
              </div>
              <p className="text-xs text-muted-foreground">View email analytics & logs</p>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="h-auto py-3 px-4 flex flex-col items-start gap-1"
              onClick={() => window.open('https://resend.com/domains', '_blank')}
            >
              <div className="flex items-center gap-2 font-medium">
                <Shield className="w-4 h-4" />
                Domain Management
              </div>
              <p className="text-xs text-muted-foreground">Verify & manage domains</p>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="h-auto py-3 px-4 flex flex-col items-start gap-1"
              onClick={() => window.open('https://resend.com/docs', '_blank')}
            >
              <div className="flex items-center gap-2 font-medium">
                <FileText className="w-4 h-4" />
                Documentation
              </div>
              <p className="text-xs text-muted-foreground">API reference & guides</p>
            </Button>
          </div>
          
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200 mt-6">
            <h4 className="font-medium text-amber-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Configuration Checklist
            </h4>
            <div className="space-y-2 text-sm text-amber-800">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Valid Resend API key configured</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Domain verified at resend.com/domains</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>From email address using verified domain</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <span>Test email functionality using the Email System Testing tab</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};