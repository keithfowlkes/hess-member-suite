import { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useSettings } from '@/hooks/useSettings';
import { useSystemSetting, useUpdateSystemSetting } from '@/hooks/useSystemSettings';
import { useFormFields, FormField } from '@/hooks/useFormFields';
import { useToast } from '@/hooks/use-toast';
import { PublicOrganizationDirectory } from '@/components/PublicOrganizationDirectory';
import { SystemFieldOptionsManager } from '@/components/SystemFieldOptionsManager';
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
  const { users, stats, settings, loading, updateUserRole, deleteUser, resetUserPassword, changeUserPassword, updateSetting } = useSettings();
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
  
  // Email testing states
  const [emailTestData, setEmailTestData] = useState({
    to: '',
    subject: 'HESS Consortium - Email System Test',
    message: 'This is a test email from the HESS Consortium email system. If you receive this message, the email system is working correctly.'
  });
  const [emailTestLoading, setEmailTestLoading] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{
    success: boolean;
    message: string;
    timestamp?: string;
    emailId?: string;
  } | null>(null);
  const [resendApiKey, setResendApiKey] = useState('');
  const [apiKeyLoading, setApiKeyLoading] = useState(false);

  const handleSaveRecaptcha = async () => {
    await updateSystemSetting.mutateAsync({
      settingKey: 'recaptcha_site_key',
      settingValue: recaptchaKey,
      description: 'Google reCAPTCHA site key for form verification'
    });
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

    // This will trigger the secrets modal for updating the RESEND_API_KEY
    toast({
      title: 'API Key Update',
      description: 'Please use the modal that opens to securely update your Resend API key.',
    });
  };

  // Email testing function
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
      const { data, error } = await supabase.functions.invoke('test-email', {
        body: {
          to: emailTestData.to.trim(),
          subject: emailTestData.subject.trim() || 'HESS Consortium - Email System Test',
          message: emailTestData.message.trim() || 'This is a test email from the HESS Consortium email system.'
        }
      });

      if (error) {
        console.error('Email test error:', error);
        setEmailTestResult({
          success: false,
          message: error.message || 'Failed to send test email'
        });
        toast({
          title: 'Email Test Failed',
          description: error.message || 'Failed to send test email',
          variant: 'destructive'
        });
      } else {
        setEmailTestResult({
          success: true,
          message: data.message || 'Test email sent successfully',
          timestamp: data.timestamp,
          emailId: data.emailId
        });
        toast({
          title: 'Email Test Successful',
          description: `Test email sent to ${emailTestData.to}`,
        });
      }
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
                <SystemFieldOptionsManager />
              </TabsContent>

              <TabsContent value="public" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold">Public Views</h2>
                  <p className="text-muted-foreground mt-2">
                    Manage and configure public-facing content and directories
                  </p>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-4">Organization Directory</h3>
                    <PublicOrganizationDirectory />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="security" className="space-y-6">
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

                    <Button 
                      onClick={handleSaveRecaptcha}
                      disabled={updateSystemSetting.isPending || !recaptchaKey.trim()}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateSystemSetting.isPending ? 'Saving...' : 'Save reCAPTCHA Settings'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="system" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>System Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                    </CardContent>
                  </Card>

                  {/* Email System Testing */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5" />
                        Email System Testing
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Resend API Key Management */}
                      <div className="space-y-4 pb-4 border-b border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <Key className="w-4 h-4" />
                          <h4 className="font-medium">Resend API Key</h4>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="resend-api-key">Enter Resend API Key</Label>
                          <Input
                            id="resend-api-key"
                            type="password"
                            placeholder="re_xxxxxxxxxx"
                            value={resendApiKey}
                            onChange={(e) => setResendApiKey(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Get your API key from{' '}
                            <a 
                              href="https://resend.com/api-keys" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              Resend Dashboard
                            </a>
                          </p>
                        </div>

                        <Button 
                          onClick={handleUpdateResendApiKey}
                          disabled={apiKeyLoading || !resendApiKey.trim()}
                          size="sm"
                        >
                          {apiKeyLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Update API Key
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Email Testing Section */}
                      <div className="space-y-4">
                        <h4 className="font-medium flex items-center gap-2">
                          <Send className="w-4 h-4" />
                          Send Test Email
                        </h4>
                        
                        <div className="space-y-2">
                          <Label htmlFor="test-email">Test Recipient Email</Label>
                          <Input
                            id="test-email"
                            type="email"
                            placeholder="Enter email address to test"
                            value={emailTestData.to}
                            onChange={(e) => setEmailTestData(prev => ({ ...prev, to: e.target.value }))}
                          />
                        </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="test-subject">Email Subject</Label>
                        <Input
                          id="test-subject"
                          placeholder="Test email subject"
                          value={emailTestData.subject}
                          onChange={(e) => setEmailTestData(prev => ({ ...prev, subject: e.target.value }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="test-message">Test Message</Label>
                        <Textarea
                          id="test-message"
                          placeholder="Enter test message content"
                          value={emailTestData.message}
                          onChange={(e) => setEmailTestData(prev => ({ ...prev, message: e.target.value }))}
                          rows={3}
                        />
                      </div>

                      <Button 
                        onClick={handleSendTestEmail}
                        disabled={emailTestLoading || !emailTestData.to.trim()}
                        className="w-full"
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

                      {/* Email Test Result */}
                      {emailTestResult && (
                        <div className={`p-4 rounded-lg border-l-4 ${
                          emailTestResult.success 
                            ? 'bg-green-50 border-green-400' 
                            : 'bg-red-50 border-red-400'
                        }`}>
                          <div className="flex items-start gap-3">
                            {emailTestResult.success ? (
                              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <h4 className={`font-medium ${
                                emailTestResult.success ? 'text-green-900' : 'text-red-900'
                              }`}>
                                {emailTestResult.success ? 'Test Email Sent Successfully' : 'Email Test Failed'}
                              </h4>
                              <p className={`text-sm mt-1 ${
                                emailTestResult.success ? 'text-green-800' : 'text-red-800'
                              }`}>
                                {emailTestResult.message}
                              </p>
                              {emailTestResult.success && emailTestResult.timestamp && (
                                <p className="text-xs text-green-700 mt-2">
                                  Sent at: {new Date(emailTestResult.timestamp).toLocaleString()}
                                </p>
                              )}
                              {emailTestResult.success && emailTestResult.emailId && (
                                <p className="text-xs text-green-700">
                                  Email ID: {emailTestResult.emailId}
                                </p>
                              )}
                            </div>
                           </div>
                         </div>
                       )}
                      </div>

                       <div className="bg-blue-50 p-4 rounded-md border-l-4 border-blue-400">
                        <h4 className="font-medium text-blue-900 mb-2">Email Configuration:</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li><strong>From:</strong> info@hessconsortium.app</li>
                          <li><strong>Service:</strong> Resend</li>
                          <li><strong>Domain:</strong> hessconsortium.app</li>
                        </ul>
                        <p className="text-xs text-blue-700 mt-2">
                          Make sure the domain is verified in your Resend account for successful delivery.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
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