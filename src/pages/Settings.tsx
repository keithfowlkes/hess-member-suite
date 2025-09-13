import { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { AdminPasswordManager } from '@/components/AdminPasswordManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useSettings } from '@/hooks/useSettings';
import { useSystemSetting, useUpdateSystemSetting } from '@/hooks/useSystemSettings';
import { useFormFields, FormField } from '@/hooks/useFormFields';
import { useToast } from '@/hooks/use-toast';
import { PublicOrganizationDirectory } from '@/components/PublicOrganizationDirectory';
import { SimpleSystemFieldManager } from '@/components/SimpleSystemFieldManager';
import { USMap } from '@/components/USMap';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Building2, 
  FileText, 
  DollarSign, 
  Shield, 
  Settings as SettingsIcon,
  BarChart3,
  Key,
  Save,
  FormInput,
  Eye,
  Settings2,
  RotateCcw,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Mail,
  Send,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const availableSections = [
  'Organization Information',
  'Primary Contact', 
  'Secondary Contact',
  'Systems Information'
];

export default function Settings() {
  const { users, stats, settings, loading, updateUserRole, deleteUser, resetUserPassword, changeUserPassword, updateSetting, cleanupOrphanedProfiles } = useSettings();
  const { data: recaptchaSetting } = useSystemSetting('recaptcha_site_key');
  const updateSystemSetting = useUpdateSystemSetting();
  const { 
    formFields, 
    loading: formFieldsLoading, 
    updateFieldVisibility, 
    createFormField, 
    updateFormField, 
    deleteFormField, 
    resetToDefaults 
  } = useFormFields();
  const { toast } = useToast();
  
  const [recaptchaKey, setRecaptchaKey] = useState('');
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const [emailTestData, setEmailTestData] = useState({
    to: '',
    subject: 'HESS Consortium - Email System Test',
    message: 'This is a test email from the HESS Consortium email system. If you receive this message, the email system is working correctly.',
    emailType: 'test'
  });
  const [emailTestLoading, setEmailTestLoading] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{
    success: boolean;
    message: string;
    timestamp?: string;
    emailId?: string;
    recipients?: string[];
    template?: string;
  } | null>(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [resendApiKey, setResendApiKey] = useState('');
  const [resendFromEmail, setResendFromEmail] = useState('');
  const [emailConfigLoading, setEmailConfigLoading] = useState(false);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  
  // reCaptcha enable/disable state
  const { data: recaptchaEnabledSetting } = useSystemSetting('recaptcha_enabled');
  const [recaptchaEnabled, setRecaptchaEnabled] = useState(true);

  // Email sender setting
  const { data: emailFromSetting } = useSystemSetting('email_from');
  
  // Email rate limit delay setting
  const { data: emailDelaySetting } = useSystemSetting('email_rate_limit_delay_ms');
  const [emailDelay, setEmailDelay] = useState('550');

  // Email configuration verification
  const [configVerificationResult, setConfigVerificationResult] = useState<any>(null);
  const [configVerificationLoading, setConfigVerificationLoading] = useState(false);

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

  // Email template helpers
  const getEmailTypeSubject = (type: string) => {
    const subjects: Record<string, string> = {
      test: 'HESS Consortium - Email System Test',
      welcome: 'Welcome to HESS Consortium - {{organization_name}}',
      invoice: 'HESS Consortium Membership Invoice - {{organization_name}}',
      overdue_reminder: 'Payment Reminder - {{organization_name}} Membership Fee Overdue',
      password_reset: 'HESS Consortium - Password Reset Request',
      custom: 'Custom Email Template'
    };
    return subjects[type] || 'HESS Consortium Email';
  };

  const getTemplateVariables = (type: string): string[] => {
    const variables: Record<string, string[]> = {
      test: ['message', 'from_email', 'timestamp', 'test_id'],
      welcome: ['organization_name', 'primary_contact_name', 'custom_message'],
      invoice: ['organization_name', 'invoice_number', 'amount', 'due_date'],
      overdue_reminder: ['organization_name', 'invoice_number', 'amount', 'due_date'],
      password_reset: ['user_name', 'reset_link', 'expiry_time'],
      custom: []
    };
    return variables[type] || [];
  };

  const handleSaveRecaptcha = async () => {
    await updateSystemSetting.mutateAsync({
      settingKey: 'recaptcha_site_key',
      settingValue: recaptchaKey,
      description: 'Google reCAPTCHA site key for form verification'
    });
  };

  const handleSaveRecaptchaEnabled = async () => {
    await updateSystemSetting.mutateAsync({
      settingKey: 'recaptcha_enabled',
      settingValue: recaptchaEnabled ? 'true' : 'false',
      description: 'Enable or disable reCAPTCHA validation on forms'
    });
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

  // Centralized email testing function
  const handleSendTestEmail = async () => {
    if (!emailTestData.to.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a recipient email address.',
        variant: 'destructive'
      });
      return;
    }

    setEmailTestLoading(true);
    setEmailTestResult(null);

    try {
      const payload = {
        type: emailTestData.emailType || 'test',
        to: emailTestData.to.trim(),
        subject: emailTestData.subject.trim(),
        data: {
          message: emailTestData.message.trim(),
          organization_name: 'Test Organization',
          primary_contact_name: 'Test User',
          invoice_number: 'INV-TEST-001',
          amount: '5000',
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          custom_message: emailTestData.message.trim()
        },
        debug: true,
      };

      const response = await fetch('https://tyovnvuluyosjnabrzjc.supabase.co/functions/v1/centralized-email-delivery-public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5b3ZudnVsdXlvc2puYWJyempjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjE0MzIsImV4cCI6MjA3MTc5NzQzMn0.G3HlqGeyLS_39jxbrKtttcsE93A9WvFSEByJow--470'
        },
        body: JSON.stringify(payload)
      });

      const respJson = await response.json().catch(() => null);
      if (!response.ok) {
        const details = respJson ? `: ${respJson.error || respJson.message || ''}` : '';
        const meta = respJson ? ` [code=${respJson.statusCode || response.status}${respJson.name ? `, name=${respJson.name}` : ''}${respJson.correlationId ? `, id=${respJson.correlationId}` : ''}]` : ` [code=${response.status}]`;
        const note = respJson?.note ? ` - ${respJson.note}` : '';
        throw new Error(`Edge Function error${details}${meta}${note}`.trim());
      }

      setEmailTestResult({
        success: true,
        message: respJson?.message || 'Test email sent successfully',
        timestamp: respJson?.timestamp,
        emailId: respJson?.emailId,
        recipients: respJson?.recipients,
        template: respJson?.template
      });
      toast({
        title: 'Email Test Successful',
        description: `Test email sent successfully`,
      });
    } catch (error: any) {
      console.error('Email test error:', error);
      setEmailTestResult({
        success: false,
        message: error.message || 'An unexpected error occurred'
      });
      toast({
        title: 'Email Test Failed',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setEmailTestLoading(false);
    }
  };

  // Bulk email operations
  const handleBulkEmailOperation = async (operation: string) => {
    try {
      toast({
        title: 'Bulk Email Operation',
        description: `Initiating ${operation.replace('_', ' ')} operation...`,
      });
      
      // This would integrate with your existing bulk operations
      // For now, just show a message
      console.log(`Bulk operation: ${operation}`);
    } catch (error: any) {
      toast({
        title: 'Operation Failed',
        description: error.message || 'Bulk email operation failed',
        variant: 'destructive'
      });
    }
  };

  // Form field handlers
  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'required': return 'bg-red-500/10 text-red-700 border-red-200';
      case 'optional': return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'hidden': return 'bg-gray-500/10 text-gray-700 border-gray-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const handleFieldVisibilityChange = async (fieldId: string, visibility: 'required' | 'optional' | 'hidden') => {
    try {
      await updateFieldVisibility(fieldId, visibility);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleAddField = async (newField: Omit<FormField, 'id' | 'field_id' | 'display_order' | 'is_custom'>) => {
    try {
      await createFormField({
        ...newField,
        field_id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        field_name: newField.field_label.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        is_custom: true
      });
      setIsAddDialogOpen(false);
      toast({
        title: 'Field Added',
        description: `"${newField.field_label}" has been added to the form.`,
      });
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleEditField = async (updatedField: FormField) => {
    try {
      await updateFormField(updatedField.id, {
        field_name: updatedField.field_name,
        field_label: updatedField.field_label,
        field_type: updatedField.field_type,
        section: updatedField.section,
        visibility: updatedField.visibility,
        placeholder: updatedField.placeholder,
        description: updatedField.description
      });
      setIsEditDialogOpen(false);
      setEditingField(null);
      toast({
        title: 'Field Updated',
        description: `"${updatedField.field_label}" has been updated.`,
      });
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    const field = formFields.find(f => f.id === fieldId);
    try {
      await deleteFormField(fieldId);
      toast({
        title: 'Field Deleted',
        description: `"${field?.field_label}" has been removed from the form.`,
      });
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleReset = async () => {
    try {
      await resetToDefaults();
    } catch (error) {
      // Error is handled in the hook
    }
  };

  // Initialize form values when settings load
  useEffect(() => {
    if (recaptchaSetting?.setting_value) {
      setRecaptchaKey(recaptchaSetting.setting_value);
    }
  }, [recaptchaSetting]);

  useEffect(() => {
    if (recaptchaEnabledSetting?.setting_value !== undefined) {
      setRecaptchaEnabled(recaptchaEnabledSetting.setting_value === 'true');
    }
  }, [recaptchaEnabledSetting]);

  useEffect(() => {
    if (emailDelaySetting?.setting_value) {
      setEmailDelay(emailDelaySetting.setting_value);
    }
  }, [emailDelaySetting]);

  if (loading || formFieldsLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 p-8">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center">
                <SettingsIcon className="h-8 w-8 mr-3" />
                System Settings
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage system configuration, users, and view analytics
              </p>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="forms">Registration Forms</TabsTrigger>
                <TabsTrigger value="public">Public Views</TabsTrigger>
                <TabsTrigger value="security">Security Settings</TabsTrigger>
                <TabsTrigger value="system">System Info</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.totalMembers || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats?.activeMembers || 0} active
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.totalInvoices || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats?.pendingInvoices || 0} pending
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        ${(stats?.totalRevenue || 0).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        From paid invoices
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">System Users</CardTitle>
                      <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{users.length}</div>
                      <p className="text-xs text-muted-foreground">
                        {users.filter(u => u.user_roles?.[0]?.role === 'admin').length} admins
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      System Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Active Members</p>
                          <p className="font-medium">
                            {stats?.activeMembers || 0} / {stats?.totalMembers || 0}
                            {stats?.totalMembers ? 
                              ` (${Math.round(((stats?.activeMembers || 0) / stats.totalMembers) * 100)}%)` 
                              : ''
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Collection Rate</p>
                          <p className="font-medium">
                            {stats?.totalInvoices ? 
                              `${Math.round(((stats.totalInvoices - (stats.pendingInvoices || 0)) / stats.totalInvoices) * 100)}%`
                              : '0%'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="forms" className="space-y-6">
                <SimpleSystemFieldManager />
              </TabsContent>

              <TabsContent value="public" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold">Public Views</h2>
                  <p className="text-muted-foreground mt-2">
                    Manage and configure public-facing content and directories for HESS Consortium
                  </p>
                </div>
                
                <Tabs defaultValue="directory" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="directory" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Organization Directory
                    </TabsTrigger>
                    <TabsTrigger value="map" className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      U.S. Map
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="directory" className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-4">Organization Directory</h3>
                      <PublicOrganizationDirectory />
                    </div>
                  </TabsContent>

                  <TabsContent value="map" className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-4">Member Location Map</h3>
                      <p className="text-muted-foreground mb-6">
                        Interactive map showing the geographic distribution of HESS member organizations across the United States
                      </p>
                      <USMap />
                    </div>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="security" className="space-y-6">
                {/* User Management Cleanup */}
                <Card>
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                       <Users className="w-4 h-4" />
                       Admin User Assignments
                     </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Clean up orphaned user profiles and manage user data integrity
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h4 className="font-medium text-yellow-800 mb-2">Orphaned Profile Cleanup</h4>
                        <p className="text-sm text-yellow-700 mb-3">
                          Sometimes user profiles can become "orphaned" when their authentication records are deleted but profile data remains. 
                          This can cause errors in the User Management interface.
                        </p>
                        <Button 
                          variant="outline" 
                          onClick={cleanupOrphanedProfiles}
                          disabled={loading}
                          className="bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Scanning...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Clean Up Orphaned Profiles
                            </>
                          )}
                        </Button>
                      </div>
                      
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p><strong>What this does:</strong></p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          <li>Scans all user profiles to find orphaned entries</li>
                          <li>Removes profiles that no longer have authentication records</li>
                          <li>Cleans up associated roles and organization assignments</li>
                          <li>Refreshes the user list to show only valid accounts</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Admin Password Management */}
                <AdminPasswordManager />

                {/* reCAPTCHA Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
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

                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button 
                        onClick={handleSaveRecaptcha}
                        disabled={updateSystemSetting.isPending || !recaptchaKey.trim()}
                        variant="outline"
                        className="flex-1"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateSystemSetting.isPending ? 'Saving...' : 'Save Site Key'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* reCAPTCHA Enable/Disable */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      reCAPTCHA Validation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="recaptcha-enabled" className="text-base font-medium">
                          Enable reCAPTCHA
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Require reCAPTCHA verification on sign-in and registration forms
                        </p>
                      </div>
                      <Switch
                        id="recaptcha-enabled"
                        checked={recaptchaEnabled}
                        onCheckedChange={setRecaptchaEnabled}
                      />
                    </div>

                    <Button 
                      onClick={handleSaveRecaptchaEnabled}
                      disabled={updateSystemSetting.isPending}
                      className="w-full sm:w-auto"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateSystemSetting.isPending ? 'Saving...' : 'Save reCAPTCHA Settings'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="system" className="space-y-6">
                {/* Email System Testing - Full Width */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Email System Testing & Management
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      Centralized email delivery system for all application forms and communications
                    </p>
                  </CardHeader>
                   <CardContent className="space-y-6">
                     {/* Centralized Email Management System */}
                     <div className="space-y-6">
                       
                       {/* Email Type Selector */}
                       <Card>
                         <CardHeader>
                           <CardTitle className="text-base flex items-center gap-2">
                             <Mail className="w-4 h-4" />
                             Email Template Testing
                           </CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-4">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="space-y-2">
                               <Label htmlFor="email-type">Email Type</Label>
                               <Select value={emailTestData.emailType || 'test'} onValueChange={(value) => 
                                 setEmailTestData(prev => ({ ...prev, emailType: value, subject: getEmailTypeSubject(value) }))
                               }>
                                 <SelectTrigger>
                                   <SelectValue />
                                 </SelectTrigger>
                                 <SelectContent>
                                   <SelectItem value="test">System Test Email</SelectItem>
                                   <SelectItem value="welcome">Welcome Email</SelectItem>
                                   <SelectItem value="invoice">Invoice Email</SelectItem>
                                   <SelectItem value="overdue_reminder">Payment Reminder</SelectItem>
                                   <SelectItem value="password_reset">Password Reset</SelectItem>
                                   <SelectItem value="custom">Custom Template</SelectItem>
                                 </SelectContent>
                               </Select>
                             </div>

                             <div className="space-y-2">
                               <Label htmlFor="test-email-to">Test Recipient Email</Label>
                               <Input
                                 id="test-email-to"
                                 type="email"
                                 placeholder="test@example.com"
                                 value={emailTestData.to}
                                 onChange={(e) => setEmailTestData(prev => ({ ...prev, to: e.target.value }))}
                               />
                             </div>
                           </div>

                           <div className="space-y-2">
                             <Label htmlFor="test-subject">Email Subject</Label>
                             <Input
                               id="test-subject"
                               placeholder="Email subject"
                               value={emailTestData.subject}
                               onChange={(e) => setEmailTestData(prev => ({ ...prev, subject: e.target.value }))}
                             />
                           </div>

                           <div className="space-y-2">
                             <Label htmlFor="test-message">Message Content</Label>
                             <Textarea
                               id="test-message"
                               placeholder="Enter your test message or template data..."
                               value={emailTestData.message}
                               onChange={(e) => setEmailTestData(prev => ({ ...prev, message: e.target.value }))}
                               rows={4}
                             />
                           </div>

                           {/* Template Variables Helper */}
                           {emailTestData.emailType && emailTestData.emailType !== 'test' && (
                             <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                               <h4 className="font-medium text-blue-900 mb-2">Available Template Variables:</h4>
                               <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-blue-800">
                                 {getTemplateVariables(emailTestData.emailType).map(variable => (
                                   <code key={variable} className="bg-blue-100 px-2 py-1 rounded text-xs">
                                     {`{{${variable}}}`}
                                   </code>
                                 ))}
                               </div>
                             </div>
                           )}

                           <div className="flex gap-3">
                             <Button 
                               onClick={handleSendTestEmail}
                               disabled={emailTestLoading || !emailTestData.to.trim()}
                               className="flex-1"
                             >
                               {emailTestLoading ? (
                                 <>
                                   <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                   Sending Test...
                                 </>
                               ) : (
                                 <>
                                   <Send className="w-4 h-4 mr-2" />
                                   Send Test Email
                                 </>
                               )}
                             </Button>
                             
                             <Button 
                               variant="outline" 
                               onClick={() => setShowEmailPreview(true)}
                               disabled={!emailTestData.emailType}
                             >
                               <Eye className="w-4 h-4 mr-2" />
                               Preview
                             </Button>
                           </div>
                         </CardContent>
                       </Card>

                       {/* Bulk Email Management */}
                       <Card>
                         <CardHeader>
                           <CardTitle className="text-base flex items-center gap-2">
                             <Users className="w-4 h-4" />
                             Bulk Email Operations
                           </CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-4">
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <Button 
                               variant="outline" 
                               size="sm" 
                               className="h-auto py-3 px-4 flex flex-col items-start gap-1"
                               onClick={() => handleBulkEmailOperation('welcome_all_pending')}
                             >
                               <div className="flex items-center gap-2 font-medium">
                                 <Mail className="w-4 h-4" />
                                 Welcome All Pending
                               </div>
                               <p className="text-xs text-muted-foreground">Send welcome emails to all pending members</p>
                             </Button>
                             
                             <Button 
                               variant="outline" 
                               size="sm" 
                               className="h-auto py-3 px-4 flex flex-col items-start gap-1"
                               onClick={() => handleBulkEmailOperation('overdue_reminders')}
                             >
                               <div className="flex items-center gap-2 font-medium">
                                 <AlertCircle className="w-4 h-4" />
                                 Overdue Reminders
                               </div>
                               <p className="text-xs text-muted-foreground">Send payment reminders for overdue invoices</p>
                             </Button>
                             
                             <Button 
                               variant="outline" 
                               size="sm" 
                               className="h-auto py-3 px-4 flex flex-col items-start gap-1"
                               onClick={() => handleBulkEmailOperation('system_announcement')}
                             >
                               <div className="flex items-center gap-2 font-medium">
                                 <BarChart3 className="w-4 h-4" />
                                 System Announcement
                               </div>
                               <p className="text-xs text-muted-foreground">Send announcement to all active members</p>
                             </Button>
                           </div>
                         </CardContent>
                        </Card>

                        {/* Rate Limiting Configuration */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <Settings2 className="w-4 h-4" />
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
                                try {
                                  await updateSystemSetting.mutateAsync({
                                    settingKey: 'email_rate_limit_delay_ms',
                                    settingValue: emailDelay,
                                    description: 'Delay in milliseconds between bulk email sends to respect Resend API rate limits (2 req/sec max)'
                                  });
                                  toast({
                                    title: 'Email Rate Limit Settings Updated',
                                    description: `Email delay set to ${emailDelay}ms for bulk operations.`
                                  });
                                } catch (error) {
                                  toast({
                                    title: 'Error',
                                    description: 'Failed to update email rate limit settings.',
                                    variant: 'destructive'
                                  });
                                }
                              }}
                              disabled={updateSystemSetting.isPending}
                              className="w-full md:w-auto"
                            >
                              <Save className="w-4 h-4 mr-2" />
                              {updateSystemSetting.isPending ? 'Saving...' : 'Save Rate Limit Settings'}
                            </Button>
                          </CardContent>
                        </Card>

                        {/* Email Delivery Status */}
                       <Card>
                         <CardHeader>
                           <CardTitle className="text-base flex items-center gap-2">
                             <BarChart3 className="w-4 h-4" />
                             Delivery Status & Analytics
                           </CardTitle>
                         </CardHeader>
                         <CardContent>
                           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                             <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                               <p className="text-green-700 font-medium">Emails Sent Today</p>
                               <p className="text-2xl font-bold text-green-800">24</p>
                             </div>
                             <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                               <p className="text-blue-700 font-medium">Delivery Rate</p>
                               <p className="text-2xl font-bold text-blue-800">98.5%</p>
                             </div>
                             <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                               <p className="text-yellow-700 font-medium">Pending Queue</p>
                               <p className="text-2xl font-bold text-yellow-800">3</p>
                             </div>
                             <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                               <p className="text-red-700 font-medium">Failed Today</p>
                               <p className="text-2xl font-bold text-red-800">1</p>
                             </div>
                           </div>
                         </CardContent>
                       </Card>

                       {/* Test Result Display */}
                       {emailTestResult && (
                         <Card className={`border-2 ${emailTestResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                           <CardHeader className="pb-3">
                             <CardTitle className={`text-sm font-medium flex items-center gap-2 ${emailTestResult.success ? 'text-green-800' : 'text-red-800'}`}>
                               {emailTestResult.success ? (
                                 <CheckCircle className="w-4 h-4" />
                               ) : (
                                 <AlertCircle className="w-4 h-4" />
                               )}
                               {emailTestResult.success ? 'Email Sent Successfully' : 'Email Sending Failed'}
                             </CardTitle>
                           </CardHeader>
                           <CardContent className="pt-0">
                             <div className={`text-sm ${emailTestResult.success ? 'text-green-700' : 'text-red-700'}`}>
                               <p className="font-medium">{emailTestResult.message}</p>
                               {emailTestResult.timestamp && (
                                 <p className="text-xs mt-1 opacity-75">
                                   Sent at: {new Date(emailTestResult.timestamp).toLocaleString()}
                                 </p>
                               )}
                               {emailTestResult.success && emailTestResult.emailId && (
                                 <p className="text-xs mt-1 opacity-75">
                                   Email ID: {emailTestResult.emailId}
                                 </p>
                               )}
                               {emailTestResult.recipients && (
                                 <p className="text-xs mt-1 opacity-75">
                                   Recipients: {emailTestResult.recipients.join(', ')}
                                 </p>
                               )}
                               {emailTestResult.template && (
                                 <p className="text-xs mt-1 opacity-75">
                                   Template: {emailTestResult.template}
                                 </p>
                               )}
                             </div>
                           </CardContent>
                         </Card>
                       )}
                     </div>

                       {/* Enhanced Email Configuration Management */}
                      <div className="space-y-6 pt-6 border-t border-border">
                        <div className="flex items-center gap-2 mb-4">
                          <Settings2 className="w-5 h-5 text-primary" />
                          <h3 className="text-lg font-semibold">Email System Configuration</h3>
                        </div>
                        
                         {/* Current Configuration Status */}
                        <Card className="bg-gradient-to-r from-background to-muted/20 border-l-4 border-l-primary">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                              <Eye className="w-4 h-4" />
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
                                <div className={`p-4 rounded-lg border text-sm space-y-2 ${
                                  configVerificationResult.success 
                                    ? 'bg-green-50 border-green-200' 
                                    : 'bg-red-50 border-red-200'
                                }`}>
                                  <div className="flex items-center gap-2 font-medium">
                                    {configVerificationResult.success ? (
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                    ) : (
                                      <AlertCircle className="w-4 h-4 text-red-600" />
                                    )}
                                    {configVerificationResult.success ? 'Configuration Valid' : 'Configuration Issues Found'}
                                  </div>
                                  
                                  {configVerificationResult.configuration && (
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                      <div>
                                        <p><strong>API Key:</strong> {configVerificationResult.configuration.api_key_valid ? '✓ Valid' : '✗ Invalid'}</p>
                                        <p><strong>Sender Source:</strong> {configVerificationResult.configuration.sender_source}</p>
                                      </div>
                                      <div>
                                        <p><strong>Domain:</strong> {configVerificationResult.configuration.sender_domain || 'None'}</p>
                                        <p><strong>Domain Verified:</strong> {configVerificationResult.configuration.domain_verified ? '✓ Yes' : '✗ No'}</p>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {configVerificationResult.configuration?.errors?.length > 0 && (
                                    <div className="mt-2">
                                      <p className="font-medium text-red-700">Errors:</p>
                                      <ul className="list-disc list-inside text-red-600">
                                        {configVerificationResult.configuration.errors.map((error: string, i: number) => (
                                          <li key={i}>{error}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  
                                  {configVerificationResult.recommendations?.length > 0 && (
                                    <div className="mt-2">
                                      <p className="font-medium text-blue-700">Recommendations:</p>
                                      <ul className="list-disc list-inside text-blue-600">
                                        {configVerificationResult.recommendations.map((rec: string, i: number) => (
                                          <li key={i}>{rec}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Configuration Forms */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                          {/* From Email Configuration */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                Sender Configuration
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Domain Configuration */}
                                <div className="space-y-2 mb-4">
                                  <Label className="text-sm font-medium">Email Domain Configuration</Label>
                                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-sm text-blue-800 font-medium mb-1">
                                      Configured Domain: members.hessconsortium.app
                                    </p>
                                    <p className="text-xs text-blue-600">
                                      All system emails will be sent from addresses using this domain. Ensure this domain is verified in your Resend account.
                                    </p>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                 <Label htmlFor="new-from-email" className="text-sm font-medium">
                                   From Email Address
                                 </Label>
                                 <div className="relative">
                                   <Input
                                     id="new-from-email"
                                     type="email"
                                     placeholder="support@members.hessconsortium.app"
                                     value={resendFromEmail}
                                     onChange={(e) => setResendFromEmail(e.target.value)}
                                     className={`pr-10 ${
                                       resendFromEmail && !/^[^\s@]+@members\.hessconsortium\.app$/.test(resendFromEmail) 
                                         ? 'border-destructive focus:border-destructive' 
                                         : resendFromEmail && /^[^\s@]+@members\.hessconsortium\.app$/.test(resendFromEmail)
                                         ? 'border-green-500 focus:border-green-500'
                                         : ''
                                     }`}
                                   />
                                   {resendFromEmail && (
                                     <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                       {/^[^\s@]+@members\.hessconsortium\.app$/.test(resendFromEmail) ? (
                                         <CheckCircle className="w-4 h-4 text-green-500" />
                                       ) : (
                                         <AlertCircle className="w-4 h-4 text-destructive" />
                                       )}
                                     </div>
                                   )}
                                 </div>
                                 <div className="flex items-start gap-2 text-xs text-muted-foreground">
                                   <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                   <div>
                                     <p>Must use the configured domain: members.hessconsortium.app</p>
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
                                    disabled={emailConfigLoading || !resendFromEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resendFromEmail)}
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
                                      Update Sender Email Address
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="space-y-2">
                                      You're about to change the sender email address to:
                                      <code className="block bg-muted p-2 rounded font-mono text-sm mt-2">
                                        {resendFromEmail}
                                      </code>
                                      <span className="block text-xs text-muted-foreground mt-2">
                                        This will affect all system emails. Changes may take a few minutes to propagate across edge functions.
                                      </span>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleUpdateEmailConfig}>
                                      Update Sender Address
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </CardContent>
                          </Card>

                          {/* API Key Configuration */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base flex items-center gap-2">
                                <Key className="w-4 h-4" />
                                API Configuration
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="new-api-key" className="text-sm font-medium">
                                  Resend API Key
                                </Label>
                                <div className="relative">
                                  <Input
                                    id="new-api-key"
                                    type="password"
                                    placeholder="re_xxxxxxxxxxxxxxxxxx"
                                    value={resendApiKey}
                                    onChange={(e) => setResendApiKey(e.target.value)}
                                    className={`pr-10 ${
                                      resendApiKey && !resendApiKey.startsWith('re_') 
                                        ? 'border-destructive focus:border-destructive' 
                                        : resendApiKey && resendApiKey.startsWith('re_') && resendApiKey.length > 10
                                        ? 'border-green-500 focus:border-green-500'
                                        : ''
                                    }`}
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
                              <Settings2 className="w-4 h-4" />
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
                            
                            <Separator className="my-4" />
                            
                            <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
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
                                  <Send className="w-4 h-4 text-blue-600" />
                                  <span>Test email functionality using the form above</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                  </CardContent>
                </Card>

                {/* System Information - Moved to bottom */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <SettingsIcon className="w-5 h-5" />
                      System Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Application</p>
                        <p className="text-lg font-semibold">HESS Consortium CRM</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Version</p>
                        <p className="text-lg">v1.0.0</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Database</p>
                        <p className="text-lg">Supabase PostgreSQL</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Authentication</p>
                        <p className="text-lg">Supabase Auth</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Footer */}
          <div className="flex flex-col items-center justify-center py-8 mt-12 border-t border-border">
            <img 
              src="/lovable-uploads/95b9e225-2202-4407-bdb2-f95edf683d93.png" 
              alt="DeusLogic Logo" 
              className="h-8 w-auto mb-2 opacity-70"
            />
            <p className="text-xs text-muted-foreground">
              Copyright 2025 DeusLogic, LLC.
            </p>
          </div>
        </main>
      </div>

      {/* Email Preview Dialog */}
      <Dialog open={showEmailPreview} onOpenChange={setShowEmailPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Email Template Preview - {emailTestData.emailType}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[70vh] space-y-4">
            {emailTestData.emailType && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-medium mb-2">Email Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">To:</span> {emailTestData.to}
                    </div>
                    <div>
                      <span className="font-medium">Subject:</span> {emailTestData.subject}
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Message Content</h3>
                  <div className="whitespace-pre-wrap text-sm bg-background p-4 rounded border">
                    {emailTestData.message || `This would show the ${emailTestData.emailType} template content with sample data.`}
                  </div>
                </div>
                
                {emailTestData.emailType !== 'test' && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">Available Template Variables:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-blue-800">
                      {getTemplateVariables(emailTestData.emailType).map(variable => (
                        <code key={variable} className="bg-blue-100 px-2 py-1 rounded text-xs">
                          {`{{${variable}}}`}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

// Form field components
function AddFieldForm({ onSubmit, defaultSection }: { 
  onSubmit: (field: Omit<FormField, 'id' | 'field_id' | 'display_order' | 'is_custom'>) => void;
  defaultSection: string;
}) {
  const [field, setField] = useState<Omit<FormField, 'id' | 'field_id' | 'display_order' | 'is_custom'>>({
    field_name: '',
    field_label: '',
    field_type: 'text',
    section: defaultSection,
    visibility: 'optional',
    placeholder: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (field.field_name && field.field_label) {
      onSubmit(field);
      setField({
        field_name: '',
        field_label: '',
        field_type: 'text',
        section: defaultSection,
        visibility: 'optional',
        placeholder: ''
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="field-name">Field Name</Label>
        <Input
          id="field-name"
          value={field.field_name}
          onChange={(e) => setField(prev => ({ ...prev, field_name: e.target.value }))}
          placeholder="e.g., organizationType"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="field-label">Field Label</Label>
        <Input
          id="field-label"
          value={field.field_label}
          onChange={(e) => setField(prev => ({ ...prev, field_label: e.target.value }))}
          placeholder="e.g., Organization Type"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="field-type">Field Type</Label>
        <Select value={field.field_type} onValueChange={(value: 'text' | 'email' | 'number' | 'password') => 
          setField(prev => ({ ...prev, field_type: value }))
        }>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="number">Number</SelectItem>
            <SelectItem value="password">Password</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="field-section">Section</Label>
        <Select value={field.section} onValueChange={(value) => 
          setField(prev => ({ ...prev, section: value }))
        }>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableSections.map(section => (
              <SelectItem key={section} value={section}>{section}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="field-visibility">Visibility</Label>
        <Select value={field.visibility} onValueChange={(value: 'required' | 'optional' | 'hidden') => 
          setField(prev => ({ ...prev, visibility: value }))
        }>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="required">Required</SelectItem>
            <SelectItem value="optional">Optional</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="field-placeholder">Placeholder</Label>
        <Input
          id="field-placeholder"
          value={field.placeholder}
          onChange={(e) => setField(prev => ({ ...prev, placeholder: e.target.value }))}
          placeholder="e.g., Enter organization type"
        />
      </div>
      <Button type="submit" className="w-full">Add Field</Button>
    </form>
  );
}

function EditFieldForm({ field, onSubmit }: { 
  field: FormField;
  onSubmit: (field: FormField) => void;
}) {
  const [editedField, setEditedField] = useState<FormField>(field);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(editedField);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-field-name">Field Name</Label>
        <Input
          id="edit-field-name"
          value={editedField.field_name}
          onChange={(e) => setEditedField(prev => ({ ...prev, field_name: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-field-label">Field Label</Label>
        <Input
          id="edit-field-label"
          value={editedField.field_label}
          onChange={(e) => setEditedField(prev => ({ ...prev, field_label: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-field-type">Field Type</Label>
        <Select value={editedField.field_type} onValueChange={(value: 'text' | 'email' | 'number' | 'password') => 
          setEditedField(prev => ({ ...prev, field_type: value }))
        }>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="number">Number</SelectItem>
            <SelectItem value="password">Password</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-field-section">Section</Label>
        <Select value={editedField.section} onValueChange={(value) => 
          setEditedField(prev => ({ ...prev, section: value }))
        }>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableSections.map(section => (
              <SelectItem key={section} value={section}>{section}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-field-placeholder">Placeholder</Label>
        <Input
          id="edit-field-placeholder"
          value={editedField.placeholder || ''}
          onChange={(e) => setEditedField(prev => ({ ...prev, placeholder: e.target.value }))}
        />
      </div>
      <Button type="submit" className="w-full">Update Field</Button>
    </form>
  );
}