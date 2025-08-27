import { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useSettings } from '@/hooks/useSettings';
import { useSystemSetting, useUpdateSystemSetting } from '@/hooks/useSystemSettings';
import { 
  Users, 
  Building2, 
  FileText, 
  DollarSign, 
  Shield, 
  UserMinus, 
  Settings as SettingsIcon,
  BarChart3,
  KeyRound,
  Lock,
  Key,
  Save
} from 'lucide-react';
import { format } from 'date-fns';

export default function Settings() {
  const { users, stats, settings, loading, updateUserRole, deleteUser, resetUserPassword, changeUserPassword, updateSetting } = useSettings();
  const { data: recaptchaSetting } = useSystemSetting('recaptcha_site_key');
  const updateSystemSetting = useUpdateSystemSetting();
  
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [passwordResetMessage, setPasswordResetMessage] = useState('');
  const [savingMessage, setSavingMessage] = useState(false);
  const [recaptchaKey, setRecaptchaKey] = useState('');
  const [changePasswordDialog, setChangePasswordDialog] = useState<{open: boolean, userId: string, userName: string}>({
    open: false,
    userId: '',
    userName: ''
  });
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleRoleUpdate = async (userId: string, currentRole: string) => {
    setUpdatingUser(userId);
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    await updateUserRole(userId, newRole);
    setUpdatingUser(null);
  };

  const handleDeleteUser = async (userId: string) => {
    await deleteUser(userId);
  };

  const handlePasswordReset = async (email: string) => {
    await resetUserPassword(email);
  };

  const handleOpenChangePassword = (userId: string, userName: string) => {
    setChangePasswordDialog({ open: true, userId, userName });
    setNewPassword('');
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim()) {
      return;
    }
    
    setChangingPassword(true);
    await changeUserPassword(changePasswordDialog.userId, newPassword);
    setChangingPassword(false);
    setChangePasswordDialog({ open: false, userId: '', userName: '' });
    setNewPassword('');
  };

  const handleSavePasswordMessage = async () => {
    setSavingMessage(true);
    await updateSetting('password_reset_message', passwordResetMessage);
    setSavingMessage(false);
  };

  const handleSaveRecaptcha = async () => {
    await updateSystemSetting.mutateAsync({
      settingKey: 'recaptcha_site_key',
      settingValue: recaptchaKey,
      description: 'Google reCAPTCHA site key for form verification'
    });
  };

  // Initialize form values when settings load
  useEffect(() => {
    const passwordSetting = settings.find(s => s.setting_key === 'password_reset_message');
    if (passwordSetting?.setting_value) {
      setPasswordResetMessage(passwordSetting.setting_value);
    }
  }, [settings]);

  useEffect(() => {
    if (recaptchaSetting?.setting_value) {
      setRecaptchaKey(recaptchaSetting.setting_value);
    }
  }, [recaptchaSetting]);

  if (loading) {
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
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="users">User Management</TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
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

              <TabsContent value="users" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Manage user roles and permissions
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => {
                          const userRole = user.user_roles?.[0]?.role || 'member';
                          return (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">
                                <div>
                                  <div>{user.first_name} {user.last_name}</div>
                                  {user.organization && (
                                    <div className="text-sm text-muted-foreground">{user.organization}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>
                                <Badge 
                                  variant={userRole === 'admin' ? 'default' : 'secondary'}
                                  className={userRole === 'admin' ? 'bg-primary' : ''}
                                >
                                  {userRole}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handlePasswordReset(user.email)}
                                    title="Send Password Reset Email"
                                  >
                                    <KeyRound className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenChangePassword(user.user_id, `${user.first_name} ${user.last_name}`)}
                                    title="Change Password"
                                    disabled={user.email === 'keith.fowlkes@hessconsortium.org'}
                                  >
                                    <Lock className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRoleUpdate(user.user_id, userRole)}
                                    disabled={updatingUser === user.user_id || user.email === 'keith.fowlkes@hessconsortium.org'}
                                  >
                                    {updatingUser === user.user_id ? 'Updating...' : 
                                     userRole === 'admin' ? 'Make Member' : 'Make Admin'}
                                  </Button>
                                  
                                  {user.email !== 'keith.fowlkes@hessconsortium.org' && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="destructive">
                                          <UserMinus className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete User</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete {user.first_name} {user.last_name}? 
                                            This action cannot be undone and will permanently remove their account and all associated data.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDeleteUser(user.user_id)}
                                            className="bg-destructive hover:bg-destructive/90"
                                          >
                                            Delete User
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <Dialog open={changePasswordDialog.open} onOpenChange={(open) => setChangePasswordDialog({...changePasswordDialog, open})}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>
                      Set a new password for {changePasswordDialog.userName}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="mt-2"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setChangePasswordDialog({ open: false, userId: '', userName: '' })}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleChangePassword}
                      disabled={changingPassword || !newPassword.trim()}
                    >
                      {changingPassword ? "Changing..." : "Change Password"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <TabsContent value="messages" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Password Reset Message</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Customize the message shown to users when their password is reset
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="password-reset-message">Reset Message</Label>
                      <Textarea
                        id="password-reset-message"
                        placeholder="Enter the password reset message..."
                        value={passwordResetMessage}
                        onChange={(e) => setPasswordResetMessage(e.target.value)}
                        rows={4}
                        className="mt-2"
                      />
                    </div>
                    <Button 
                      onClick={handleSavePasswordMessage}
                      disabled={savingMessage}
                    >
                      {savingMessage ? "Saving..." : "Save Message"}
                    </Button>
                  </CardContent>
                </Card>
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

                <Separator />

                {/* Security Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Security Status
                    </CardTitle>
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
                      <div>
                        <Label className="font-medium">Row Level Security:</Label>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 mt-1">
                          Enabled
                        </Badge>
                      </div>
                      <div>
                        <Label className="font-medium">Authentication:</Label>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 mt-1">
                          Supabase Auth
                        </Badge>
                      </div>
                    </div>
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

                  <Card>
                    <CardHeader>
                      <CardTitle>Security Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Row Level Security</p>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Enabled
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Email Verification</p>
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Disabled (Development)
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">API Access</p>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Authenticated Only
                        </Badge>
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