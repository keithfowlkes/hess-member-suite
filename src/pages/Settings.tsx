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
import { SystemFieldNormalizer } from '@/components/SystemFieldNormalizer';
import { SimplifiedMemberRegistrationManagement } from '@/components/SimplifiedMemberRegistrationManagement';
import { PublicLogoManager } from '@/components/PublicLogoManager';
import { HeaderGraphicManager } from '@/components/HeaderGraphicManager';
import { AuthPageFieldsManager } from '@/components/AuthPageFieldsManager';

import { USMap } from '@/components/USMap';
import { MessageTextContent } from '@/components/MessageTextContent';
import { ResendApiConfig } from '@/components/ResendApiConfig';
import { EmailDesignManager } from '@/components/EmailDesignManager';
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
  CheckCircle,
  Image as ImageIcon,
  Palette
} from 'lucide-react';

const availableSections = [
  'Organization Information',
  'Primary Contact', 
  'Secondary Contact',
  'Systems Information'
];

export default function Settings() {
  const { users, stats, settings, loading, updateUserRoles, deleteUser, resetUserPassword, changeUserPassword, updateSetting, cleanupOrphanedProfiles } = useSettings();
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
  
  const [activeSection, setActiveSection] = useState('overview');
  
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
  
  // TinyMCE API Key state
  const [tinymceApiKey, setTinymceApiKey] = useState('');
  const [tinymceKeyLoading, setTinymceKeyLoading] = useState(false);
  
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

  // TinyMCE API key management
  const handleUpdateTinymceApiKey = async () => {
    if (!tinymceApiKey.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a valid TinyMCE API key.',
        variant: 'destructive'
      });
      return;
    }

    setTinymceKeyLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-tinymce-key', {
        body: {
          apiKey: tinymceApiKey.trim()
        }
      });

      if (error) {
        console.error('TinyMCE API key update error:', error);
        toast({
          title: 'TinyMCE Key Update Failed',
          description: error.message || 'Failed to update TinyMCE API key',
          variant: 'destructive'
        });
        return;
      }

      if (data.success) {
        toast({
          title: 'TinyMCE Key Updated',
          description: 'TinyMCE API key has been updated successfully. Refreshing editors...',
        });
        setTinymceApiKey(''); // Clear for security
        
        // Trigger refresh of all TinyMCE editors
        window.dispatchEvent(new CustomEvent('tinymce-key-updated'));
        
        // Also force a page refresh after a short delay to ensure all editors reload
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        throw new Error(data.message || 'Update failed');
      }
    } catch (error: any) {
      console.error('TinyMCE API key update error:', error);
      toast({
        title: 'Configuration Error',
        description: error.message || 'Failed to update TinyMCE API key',
        variant: 'destructive'
      });
    } finally {
      setTinymceKeyLoading(false);
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

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Vertical Navigation */}
              <div className="lg:col-span-1">
                <div className="sticky top-6 space-y-2">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Settings</h2>
                  <nav className="space-y-1">
                    {[
                      { id: 'overview', label: 'Overview', icon: BarChart3, description: 'System statistics and analytics' },
                      { id: 'forms', label: 'Member Management', icon: Users, description: 'Registration and user management' },
                      { id: 'fields', label: 'Field Options', icon: FormInput, description: 'Configure dropdown options' },
                      { id: 'public', label: 'Public Views', icon: Eye, description: 'Public-facing content' },
                      { id: 'security', label: 'Security Settings', icon: Shield, description: 'Authentication and security' },
                      { id: 'messaging', label: 'Messaging Config', icon: Mail, description: 'Email and notifications' }
                    ].map((section) => (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          activeSection === section.id 
                            ? 'bg-primary text-primary-foreground shadow-sm' 
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <section.icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">{section.label}</div>
                            <div className={`text-xs mt-0.5 ${
                              activeSection === section.id 
                                ? 'text-primary-foreground/70' 
                                : 'text-muted-foreground'
                            }`}>
                              {section.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </nav>
                </div>
              </div>

              {/* Content Area */}
              <div className="lg:col-span-3 space-y-6">

                {/* Overview Section */}
                {activeSection === 'overview' && (
                  <div className="space-y-6">
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

                {/* Header Graphic Management */}
                <HeaderGraphicManager />
                  </div>
                )}

                {/* Member Management Section */}
                {activeSection === 'forms' && (
                  <div className="space-y-6">
                {/* New Simplified Registration Management */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Member Registration Updates</h3>
                      <p className="text-sm text-muted-foreground">
                        Review and approve member registration updates and primary contact changes
                      </p>
                    </div>
                  </div>
                  
                  <SimplifiedMemberRegistrationManagement />
                </div>
                  </div>
                )}

                {/* Field Options Section */}
                {activeSection === 'fields' && (
                  <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold">Field Options Management</h2>
                  <p className="text-muted-foreground mt-2">
                    Configure dropdown options and normalize system field data across the platform
                  </p>
                </div>
                
                <div className="space-y-8">
                  <SimpleSystemFieldManager />
                  <div className="border-t pt-8">
                    <SystemFieldNormalizer />
                  </div>
                </div>
                  </div>
                )}

                {/* Public Views Section */}
                {activeSection === 'public' && (
                  <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold">Public Views</h2>
                  <p className="text-muted-foreground mt-2">
                    Manage and configure public-facing content and directories for HESS Consortium
                  </p>
                </div>
                
                <Tabs defaultValue="directory" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-4 max-w-2xl">
                    <TabsTrigger value="directory" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Organization Directory
                    </TabsTrigger>
                    <TabsTrigger value="map" className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      U.S. Map
                    </TabsTrigger>
                    <TabsTrigger value="logo" className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Logo Upload
                    </TabsTrigger>
                    <TabsTrigger value="auth" className="flex items-center gap-2">
                      <FormInput className="h-4 w-4" />
                      Auth Pages
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

                  <TabsContent value="logo" className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-4">Logo Upload</h3>
                      <p className="text-muted-foreground mb-6">
                        Upload and display your organization logo on a public page
                      </p>
                      <PublicLogoManager />
                    </div>
                  </TabsContent>

                  <TabsContent value="auth" className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-4">Authentication Pages</h3>
                      <p className="text-muted-foreground mb-6">
                        Configure form fields and validation for sign-in, sign-up, and member update pages
                      </p>
                      <AuthPageFieldsManager />
                    </div>
                  </TabsContent>
                </Tabs>
                  </div>
                )}

                {/* Security Settings Section */}
                {activeSection === 'security' && (
                  <div className="space-y-6">
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

                {/* TinyMCE Editor Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Edit className="w-4 h-4" />
                      TinyMCE Editor Key
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="tinymce-key">TinyMCE API Key</Label>
                      <Input
                        id="tinymce-key"
                        type="password"
                        placeholder="Enter your TinyMCE API key"
                        value={tinymceApiKey}
                        onChange={(e) => setTinymceApiKey(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        Get your TinyMCE API key from{' '}
                        <a 
                          href="https://www.tiny.cloud/auth/signup/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          TinyMCE Cloud Dashboard
                        </a>
                      </p>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-md border-l-4 border-blue-400">
                      <h4 className="font-medium text-blue-900 mb-2">Setup Instructions:</h4>
                      <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                        <li>Visit the TinyMCE Cloud Dashboard and sign up/log in</li>
                        <li>Create a new application or use an existing one</li>
                        <li>Copy your API key from the dashboard</li>
                        <li>Paste it in the field above and save</li>
                        <li>The rich text editor will now have full functionality</li>
                      </ol>
                    </div>

                    <div className="bg-green-50 p-4 rounded-md border-l-4 border-green-400">
                      <h4 className="font-medium text-green-900 mb-2">TinyMCE Features:</h4>
                      <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                        <li>Advanced rich text editing for email templates</li>
                        <li>Built-in image upload, resize, and formatting tools</li>
                        <li>Professional toolbar with formatting options</li>
                        <li>Drag & drop file support</li>
                        <li>Right-click context menus for images</li>
                      </ul>
                    </div>

                    <Button 
                      onClick={handleUpdateTinymceApiKey}
                      disabled={tinymceKeyLoading || !tinymceApiKey.trim()}
                      className="w-full sm:w-auto"
                    >
                      {tinymceKeyLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save TinyMCE API Key
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
                  </div>
                )}

                {/* Messaging Config Section */}
                {activeSection === 'messaging' && (
                  <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold">Messaging Configuration</h2>
                  <p className="text-muted-foreground mt-2">
                    Manage email system testing, templates, and message configuration for HESS Consortium
                  </p>
                </div>
                
                <Tabs defaultValue="email-testing" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-3 max-w-2xl">
                    <TabsTrigger value="email-testing" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email System Testing
                    </TabsTrigger>
                    <TabsTrigger value="resend-config" className="flex items-center gap-2">
                      <Settings2 className="h-4 w-4" />
                      Resend API Config
                    </TabsTrigger>
                    <TabsTrigger value="email-text-design" className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Email Text & Design
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="email-testing" className="space-y-6">
                    {/* Email System Testing */}
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
                        {/* Enhanced Email Testing */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <Send className="w-4 h-4" />
                              Email Testing & Validation
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="test-email-to">Recipient Email</Label>
                                  <Input
                                    id="test-email-to"
                                    type="email"
                                    value={emailTestData.to}
                                    onChange={(e) => setEmailTestData(prev => ({ ...prev, to: e.target.value }))}
                                    placeholder="recipient@example.com"
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="test-email-type">Email Type</Label>
                                  <Select 
                                    value={emailTestData.emailType} 
                                    onValueChange={(value) => {
                                      setEmailTestData(prev => ({ 
                                        ...prev, 
                                        emailType: value,
                                        subject: getEmailTypeSubject(value)
                                      }));
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select email type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="test">Test Email</SelectItem>
                                      <SelectItem value="welcome">Welcome Email</SelectItem>
                                      <SelectItem value="invoice">Invoice Email</SelectItem>
                                      <SelectItem value="overdue_reminder">Overdue Reminder</SelectItem>
                                      <SelectItem value="password_reset">Password Reset</SelectItem>
                                      <SelectItem value="custom">Custom Template</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="test-email-subject">Subject Line</Label>
                                  <Input
                                    id="test-email-subject"
                                    value={emailTestData.subject}
                                    onChange={(e) => setEmailTestData(prev => ({ ...prev, subject: e.target.value }))}
                                    placeholder="Email subject line"
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="test-email-message">Message Content</Label>
                                  <Textarea
                                    id="test-email-message"
                                    value={emailTestData.message}
                                    onChange={(e) => setEmailTestData(prev => ({ ...prev, message: e.target.value }))}
                                    placeholder="Enter test message content..."
                                    rows={4}
                                  />
                                </div>
                              </div>
                              
                              <div className="space-y-4">
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                  <h4 className="font-medium text-blue-900 mb-2">Testing Guidelines</h4>
                                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                                    <li>Always test with a valid email address you control</li>
                                    <li>Check both email delivery and template rendering</li>
                                    <li>Verify all template variables are properly replaced</li>
                                    <li>Test different email types to ensure templates work</li>
                                  </ul>
                                </div>
                                
                                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                                  <h4 className="font-medium text-amber-900 mb-2">Rate Limits</h4>
                                  <p className="text-sm text-amber-800">
                                    Resend Free: 100 emails/day, 2 emails/second<br/>
                                    Resend Pro: 50,000 emails/month, higher rate limits
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                              <Button 
                                onClick={handleSendTestEmail}
                                disabled={emailTestLoading || !emailTestData.to.trim()}
                                className="flex-1"
                              >
                                {emailTestLoading ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Sending Test Email...
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
                        </CardContent>
                      </Card>

                    </TabsContent>

                    <TabsContent value="resend-config" className="space-y-6">
                      <ResendApiConfig />
                    </TabsContent>

                  <TabsContent value="email-text-design" className="space-y-6">
                    <Tabs defaultValue="message-text" className="space-y-6">
                      <TabsList className="grid w-full grid-cols-2 max-w-md">
                        <TabsTrigger value="message-text" className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Message Text
                        </TabsTrigger>
                        <TabsTrigger value="design-settings" className="flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          Design Settings
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="message-text" className="space-y-6">
                        <MessageTextContent />
                      </TabsContent>
                      
                      <TabsContent value="design-settings" className="space-y-6">
                        <EmailDesignManager />
                      </TabsContent>
                    </Tabs>
                  </TabsContent>
                </Tabs>
                    </div>
                )}
              </div>
            </div>
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