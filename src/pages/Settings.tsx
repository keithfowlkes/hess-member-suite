import { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { 
  Users, 
  Building2, 
  FileText, 
  DollarSign, 
  Shield, 
  UserMinus, 
  Settings as SettingsIcon,
  BarChart3,
  KeyRound
} from 'lucide-react';
import { format } from 'date-fns';

export default function Settings() {
  const { users, stats, settings, loading, updateUserRole, deleteUser, resetUserPassword, updateSetting } = useSettings();
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [passwordResetMessage, setPasswordResetMessage] = useState('');
  const [savingMessage, setSavingMessage] = useState(false);

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

  const handleSavePasswordMessage = async () => {
    setSavingMessage(true);
    await updateSetting('password_reset_message', passwordResetMessage);
    setSavingMessage(false);
  };

  // Initialize password reset message when settings load
  useEffect(() => {
    const passwordSetting = settings.find(s => s.setting_key === 'password_reset_message');
    if (passwordSetting?.setting_value) {
      setPasswordResetMessage(passwordSetting.setting_value);
    }
  }, [settings]);

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
                                    title="Reset Password"
                                  >
                                    <KeyRound className="h-4 w-4" />
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