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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

// Hooks
import { useAuth } from '@/hooks/useAuth';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useSettings } from '@/hooks/useSettings';
import { useOrganizationApprovals } from '@/hooks/useOrganizationApprovals';
import { useOrganizationInvitations } from '@/hooks/useOrganizationInvitations';

// Components
import { OrganizationApprovalDialog } from '@/components/OrganizationApprovalDialog';
import { InvitationManagementDialog } from '@/components/InvitationManagementDialog';
import { ReassignmentRequestsDialog } from '@/components/ReassignmentRequestsDialog';

// Icons
import { 
  Users, 
  Building2, 
  Clock, 
  Mail, 
  CheckCircle, 
  XCircle,
  Eye,
  AlertCircle,
  RefreshCw,
  FileText, 
  DollarSign, 
  LogOut, 
  Loader2,
  Shield, 
  UserMinus, 
  BarChart3,
  KeyRound,
  Lock,
  Settings as SettingsIcon
} from 'lucide-react';
import { format } from 'date-fns';

const MasterDashboard = () => {
  const { user, signOut } = useAuth();
  const { stats: dashboardStats, loading: statsLoading } = useDashboardStats();
  const { users, stats, settings, loading: settingsLoading, updateUserRole, deleteUser, resetUserPassword, changeUserPassword, updateSetting } = useSettings();
  
  // Organization management hooks
  const { 
    pendingOrganizations, 
    loading: approvalsLoading, 
    approveOrganization, 
    rejectOrganization 
  } = useOrganizationApprovals();
  const { invitations, loading: invitationsLoading } = useOrganizationInvitations();

  // State management
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showInvitationDialog, setShowInvitationDialog] = useState(false);
  const [showReassignmentDialog, setShowReassignmentDialog] = useState(false);
  
  // User management state
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [changePasswordDialog, setChangePasswordDialog] = useState<{open: boolean, userId: string, userName: string}>({
    open: false,
    userId: '',
    userName: ''
  });
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Messages state
  const [passwordResetMessage, setPasswordResetMessage] = useState('');
  const [savingMessage, setSavingMessage] = useState(false);

  // Stats for the overview section
  const mainStats = [
    { 
      title: 'Total Organizations', 
      value: statsLoading ? '...' : dashboardStats.totalOrganizations.toLocaleString(), 
      icon: Building2, 
      color: 'text-blue-600' 
    },
    { 
      title: 'Active Memberships', 
      value: statsLoading ? '...' : dashboardStats.activeOrganizations.toLocaleString(), 
      icon: Users, 
      color: 'text-green-600' 
    },
    { 
      title: 'Pending Invoices', 
      value: statsLoading ? '...' : dashboardStats.pendingInvoices.toLocaleString(), 
      icon: FileText, 
      color: dashboardStats.pendingInvoices > 0 ? 'text-orange-600' : 'text-green-600' 
    },
    { 
      title: 'Annual Revenue', 
      value: statsLoading ? '...' : `$${dashboardStats.totalRevenue.toLocaleString()}`, 
      icon: DollarSign, 
      color: 'text-green-600' 
    }
  ];

  const adminStats = [
    {
      title: 'Pending Approvals',
      value: pendingOrganizations.length,
      icon: Clock,
      color: 'text-orange-600',
      description: 'Organizations awaiting review'
    },
    {
      title: 'Active Invitations',
      value: invitations.filter(inv => !inv.used_at && new Date(inv.expires_at) > new Date()).length,
      icon: Mail,
      color: 'text-blue-600',
      description: 'Pending email invitations'
    },
    {
      title: 'System Users',
      value: users.length,
      icon: Shield,
      color: 'text-purple-600',
      description: `${users.filter(u => u.user_roles?.[0]?.role === 'admin').length} admins`
    },
    {
      title: 'Total Student FTE',
      value: statsLoading ? '...' : dashboardStats.totalStudentFte.toLocaleString(),
      icon: BarChart3,
      color: 'text-indigo-600',
      description: 'Across all organizations'
    }
  ];

  // Event handlers
  const handleReviewOrganization = (org) => {
    setSelectedOrganization(org);
    setShowApprovalDialog(true);
  };

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

  // Initialize password reset message when settings load
  useEffect(() => {
    const passwordSetting = settings.find(s => s.setting_key === 'password_reset_message');
    if (passwordSetting?.setting_value) {
      setPasswordResetMessage(passwordSetting.setting_value);
    }
  }, [settings]);

  if (statsLoading || settingsLoading) {
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
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Master Dashboard</h1>
                <p className="text-muted-foreground mt-2">
                  Complete administrative control and system overview
                </p>
                {user?.email && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Logged in as: <span className="font-medium text-foreground">{user.email}</span>
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                onClick={signOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="organizations">Organizations</TabsTrigger>
                <TabsTrigger value="users">User Management</TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Main Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {mainStats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">
                            {stat.title}
                          </CardTitle>
                          <Icon className={`h-4 w-4 ${stat.color}`} />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold flex items-center gap-2">
                            {statsLoading ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : null}
                            {stat.value}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Admin Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {adminStats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">
                            {stat.title}
                          </CardTitle>
                          <Icon className={`h-4 w-4 ${stat.color}`} />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{stat.value}</div>
                          <p className="text-xs text-muted-foreground">
                            {stat.description}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Recent Activity and Security Settings */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Organization approved</p>
                            <p className="text-xs text-muted-foreground">2 hours ago</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">New user registration</p>
                            <p className="text-xs text-muted-foreground">1 day ago</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Invitation sent</p>
                            <p className="text-xs text-muted-foreground">3 days ago</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Security Settings */}
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

              {/* Organizations Tab */}
              <TabsContent value="organizations" className="space-y-6">
                <Tabs defaultValue="approvals" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
                    <TabsTrigger value="invitations">Manage Invitations</TabsTrigger>
                    <TabsTrigger value="reassignments">Reassignment Requests</TabsTrigger>
                  </TabsList>

                  <TabsContent value="approvals" className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-semibold">Organization Applications</h2>
                      <Badge variant="secondary" className="text-sm">
                        {pendingOrganizations.length} pending
                      </Badge>
                    </div>

                    {approvalsLoading ? (
                      <Card>
                        <CardContent className="p-6">
                          <div className="text-center">Loading pending organizations...</div>
                        </CardContent>
                      </Card>
                    ) : pendingOrganizations.length === 0 ? (
                      <Card>
                        <CardContent className="p-6">
                          <div className="text-center text-muted-foreground">
                            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No pending organization applications.</p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-4">
                        {pendingOrganizations.map((org) => (
                          <Card key={org.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-semibold">{org.name}</h3>
                                    <Badge variant={org.profiles?.is_private_nonprofit ? "default" : "destructive"}>
                                      {org.profiles?.is_private_nonprofit ? "Private Non-Profit" : "Not Confirmed"}
                                    </Badge>
                                  </div>
                                  
                                  <div className="text-sm text-muted-foreground space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Users className="h-3 w-3" />
                                      <span>
                                        Contact: {org.profiles?.first_name} {org.profiles?.last_name}
                                        {org.profiles?.primary_contact_title && ` - ${org.profiles.primary_contact_title}`}
                                      </span>
                                    </div>
                                    <div>
                                      Email: {org.profiles?.email} | Location: {org.city}, {org.state}
                                    </div>
                                    <div>
                                      Student FTE: {org.student_fte?.toLocaleString() || 'Not specified'} | 
                                      Applied: {new Date(org.created_at).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleReviewOrganization(org)}
                                    className="flex items-center gap-2"
                                  >
                                    <Eye className="h-3 w-3" />
                                    Review
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="invitations" className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-semibold">Organization Invitations</h2>
                      <Button onClick={() => setShowInvitationDialog(true)}>
                        <Mail className="h-4 w-4 mr-2" />
                        Manage Invitations
                      </Button>
                    </div>

                    <Card>
                      <CardContent className="p-6">
                        <div className="text-center text-muted-foreground">
                          <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Click "Manage Invitations" to send invitations to organizations without contacts.</p>
                          <p className="text-sm mt-2">
                            This allows existing organizations in your database to gain portal access.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="reassignments" className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-semibold">Organization Reassignment Requests</h2>
                      <Button onClick={() => setShowReassignmentDialog(true)}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        View Requests
                      </Button>
                    </div>

                    <Card>
                      <CardContent className="p-6">
                        <div className="text-center text-muted-foreground">
                          <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Manage organization reassignment requests and approve changes.</p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              {/* User Management Tab */}
              <TabsContent value="users" className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-semibold">User Management</h2>
                    <p className="text-muted-foreground">Manage user roles and permissions</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{users.length} total users</Badge>
                    <Badge variant="outline">{users.filter(u => u.user_roles?.[0]?.role === 'admin').length} admins</Badge>
                  </div>
                </div>

                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-6">User</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="pr-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => {
                          const userRole = user.user_roles?.[0]?.role || 'member';
                          return (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium pl-6">
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
                              <TableCell className="pr-6">
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

              {/* Messages Tab */}
              <TabsContent value="messages" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold">Message Configuration</h2>
                  <p className="text-muted-foreground">Customize system messages and notifications</p>
                </div>

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

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold">System Analytics</h2>
                  <p className="text-muted-foreground">Detailed insights and performance metrics</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Membership Analytics</CardTitle>
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

                  <Card>
                    <CardHeader>
                      <CardTitle>Financial Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium">Average Fee per Organization:</span>{' '}
                          <span className="text-muted-foreground">
                            ${dashboardStats.activeOrganizations > 0 
                              ? Math.round(dashboardStats.totalRevenue / dashboardStats.activeOrganizations).toLocaleString()
                              : '0'
                            }
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Total Student FTE:</span>{' '}
                          <span className="text-muted-foreground">
                            {dashboardStats.totalStudentFte.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Change Password Dialog */}
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

      {/* Organization Management Dialogs */}
      <OrganizationApprovalDialog
        open={showApprovalDialog}
        onOpenChange={setShowApprovalDialog}
        organization={selectedOrganization}
        onApprove={approveOrganization}
        onReject={rejectOrganization}
      />

      <InvitationManagementDialog
        open={showInvitationDialog}
        onOpenChange={setShowInvitationDialog}
      />

      <ReassignmentRequestsDialog
        open={showReassignmentDialog}
        onOpenChange={setShowReassignmentDialog}
      />
    </SidebarProvider>
  );
};

export default MasterDashboard;