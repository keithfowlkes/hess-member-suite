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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Hooks
import { useAuth } from '@/hooks/useAuth';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useSettings } from '@/hooks/useSettings';
import { useOrganizationApprovals } from '@/hooks/useOrganizationApprovals';
import { useOrganizationInvitations } from '@/hooks/useOrganizationInvitations';
import { useReassignmentRequests, useApproveReassignmentRequest, useRejectReassignmentRequest, useDeleteReassignmentRequest } from '@/hooks/useReassignmentRequests';

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
  Settings as SettingsIcon,
  Search,
  MoreVertical,
  ChevronDown
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
  const { data: reassignmentRequests = [], isLoading: reassignmentLoading, refetch: refetchRequests } = useReassignmentRequests();
  
  // Calculate pending counts
  const pendingApprovalsCount = pendingOrganizations.length;
  const activeInvitationsCount = invitations.filter(inv => !inv.used_at && new Date(inv.expires_at) > new Date()).length;
  const reassignmentRequestsCount = reassignmentRequests.length;
  const totalOrganizationActions = pendingApprovalsCount + activeInvitationsCount + reassignmentRequestsCount;
  const approveReassignment = useApproveReassignmentRequest();
  const rejectReassignment = useRejectReassignmentRequest();
  const deleteReassignment = useDeleteReassignmentRequest();

  // State management
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showInvitationDialog, setShowInvitationDialog] = useState(false);
  const [showReassignmentDialog, setShowReassignmentDialog] = useState(false);
  
  // Search functionality
  const [organizationSearchTerm, setOrganizationSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  
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

  // Filter functions for search
  const filteredPendingOrganizations = pendingOrganizations.filter(org => {
    const searchLower = organizationSearchTerm.toLowerCase();
    return (
      org.name.toLowerCase().includes(searchLower) ||
      org.profiles?.first_name?.toLowerCase().includes(searchLower) ||
      org.profiles?.last_name?.toLowerCase().includes(searchLower) ||
      org.profiles?.email?.toLowerCase().includes(searchLower) ||
      org.city?.toLowerCase().includes(searchLower) ||
      org.state?.toLowerCase().includes(searchLower)
    );
  });

  const filteredUsers = users.filter(user => {
    const searchLower = userSearchTerm.toLowerCase();
    return (
      user.email.toLowerCase().includes(searchLower) ||
      user.user_roles?.[0]?.role?.toLowerCase().includes(searchLower)
    );
  });

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
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="organizations" className="relative">
                  Organizations
                  {totalOrganizationActions > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                      {totalOrganizationActions}
                    </Badge>
                  )}
                </TabsTrigger>
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
                    <TabsTrigger value="approvals" className="relative">
                      Pending Approvals
                      {pendingApprovalsCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                        >
                          {pendingApprovalsCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="invitations" className="relative">
                      Manage Invitations
                      {activeInvitationsCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                        >
                          {activeInvitationsCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="reassignments" className="relative">
                      Reassignment Requests
                      {reassignmentRequestsCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                        >
                          {reassignmentRequestsCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="users">User Management</TabsTrigger>
                  </TabsList>

                  <TabsContent value="approvals" className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-semibold">Organization Applications</h2>
                      <div className="flex items-center gap-2">
                        {pendingOrganizations.length > 0 && (
                          <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <span className="font-medium">{pendingOrganizations.length} Pending Review</span>
                          </div>
                        )}
                        <Badge variant="secondary" className="text-sm">
                          {filteredPendingOrganizations.length} of {pendingOrganizations.length} shown
                        </Badge>
                      </div>
                    </div>

                    {/* Search Bar for Organizations */}
                    <div className="relative max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search organizations, contacts, or locations..."
                        value={organizationSearchTerm}
                        onChange={(e) => setOrganizationSearchTerm(e.target.value)}
                        className="pl-10 bg-white"
                      />
                    </div>

                    {approvalsLoading ? (
                      <Card>
                        <CardContent className="p-6">
                          <div className="text-center">Loading pending organizations...</div>
                        </CardContent>
                      </Card>
                    ) : filteredPendingOrganizations.length === 0 ? (
                      <Card>
                        <CardContent className="p-6">
                          <div className="text-center text-muted-foreground">
                            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            {organizationSearchTerm ? (
                              <p>No organizations match your search "{organizationSearchTerm}".</p>
                            ) : (
                              <p>No pending organization applications.</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-4">
                        {filteredPendingOrganizations.map((org) => (
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
                      <div className="flex items-center gap-2">
                        {activeInvitationsCount > 0 && (
                          <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                            <Mail className="h-4 w-4" />
                            <span className="font-medium">
                              {activeInvitationsCount} Active
                            </span>
                          </div>
                        )}
                        <Button onClick={() => setShowInvitationDialog(true)}>
                          <Mail className="h-4 w-4 mr-2" />
                          Manage Invitations
                        </Button>
                      </div>
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
                      <div className="flex items-center gap-2">
                        {reassignmentRequests.length > 0 && (
                          <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <span className="font-medium">{reassignmentRequests.length} Pending</span>
                          </div>
                        )}
                        <Button onClick={() => refetchRequests()}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh List
                        </Button>
                      </div>
                    </div>

                    {reassignmentLoading ? (
                      <Card>
                        <CardContent className="p-6">
                          <div className="text-center">Loading reassignment requests...</div>
                        </CardContent>
                      </Card>
                    ) : reassignmentRequests.length === 0 ? (
                      <Card>
                        <CardContent className="p-6">
                          <div className="text-center text-muted-foreground">
                            <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No pending reassignment requests.</p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-2">
                        {reassignmentRequests.map((request) => (
                          <Collapsible key={request.id}>
                            <Card>
                              <CollapsibleTrigger asChild>
                                <CardContent className="p-4 hover:bg-muted/50 cursor-pointer">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                      <div className="min-w-0 flex-1">
                                        <div className="font-medium truncate">
                                          {request.organizations?.name || 'Unknown Organization'}
                                        </div>
                                        <div className="text-sm text-muted-foreground truncate">
                                          {request.new_contact_email}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <Badge variant={request.status === 'pending' ? 'outline' : 'default'}>
                                          {request.status}
                                        </Badge>
                                        <span className="text-sm text-muted-foreground">
                                          {new Date(request.created_at).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </div>
                                    <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                                  </div>
                                </CardContent>
                              </CollapsibleTrigger>
                              
                              <CollapsibleContent>
                                <CardContent className="pt-0 px-4 pb-4">
                                  <Separator className="mb-4" />
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    {/* Current Information */}
                                    <div className="space-y-2">
                                      <h4 className="font-medium text-sm">Current Contact</h4>
                                      <div className="text-sm text-muted-foreground space-y-1">
                                        {request.organizations?.profiles?.first_name && request.organizations?.profiles?.last_name ? (
                                          <div>{request.organizations.profiles.first_name} {request.organizations.profiles.last_name}</div>
                                        ) : (
                                          <div>No name on file</div>
                                        )}
                                        <div>{request.organizations?.profiles?.email || 'No email on file'}</div>
                                      </div>
                                    </div>

                                    {/* New Contact Information */}
                                    <div className="space-y-2">
                                      <h4 className="font-medium text-sm">Requested New Contact</h4>
                                      <div className="text-sm text-muted-foreground">
                                        {request.new_contact_email}
                                      </div>
                                    </div>
                                  </div>

                                   {/* Organization Information Comparison */}
                                   {request.new_organization_data && (
                                     <div className="space-y-4 mb-4">
                                       <h4 className="font-medium text-sm">Organization Information Comparison</h4>
                                       
                                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                         {/* Current Organization Information */}
                                         <div className="space-y-2">
                                           <h5 className="font-medium text-xs text-muted-foreground uppercase tracking-wider">Current Information</h5>
                                           <div className="bg-muted/20 rounded-md p-3 space-y-2 text-sm">
                                             {/* Organization Details */}
                                             <div className="grid grid-cols-2 gap-2 py-1 border-b border-muted/30">
                                               <span className="font-medium text-foreground">Name:</span>
                                               <span className="text-muted-foreground break-words">
                                                 {request.organizations?.name || 'Not set'}
                                               </span>
                                             </div>
                                             
                                             {/* Address Information */}
                                             {((request.organizations as any)?.address_line_1 || (request.organizations as any)?.city || (request.organizations as any)?.state) && (
                                               <div className="grid grid-cols-2 gap-2 py-1 border-b border-muted/30">
                                                 <span className="font-medium text-foreground">Address Line 1:</span>
                                                 <span className="text-muted-foreground break-words">
                                                   {(request.organizations as any)?.address_line_1 || 'Not set'}
                                                 </span>
                                               </div>
                                             )}
                                             
                                             {(request.organizations as any)?.address_line_2 && (
                                               <div className="grid grid-cols-2 gap-2 py-1 border-b border-muted/30">
                                                 <span className="font-medium text-foreground">Address Line 2:</span>
                                                 <span className="text-muted-foreground break-words">
                                                   {(request.organizations as any).address_line_2}
                                                 </span>
                                               </div>
                                             )}
                                             
                                             <div className="grid grid-cols-2 gap-2 py-1 border-b border-muted/30">
                                               <span className="font-medium text-foreground">City:</span>
                                               <span className="text-muted-foreground break-words">
                                                 {(request.organizations as any)?.city || 'Not set'}
                                               </span>
                                             </div>
                                             
                                             <div className="grid grid-cols-2 gap-2 py-1 border-b border-muted/30">
                                               <span className="font-medium text-foreground">State:</span>
                                               <span className="text-muted-foreground break-words">
                                                 {(request.organizations as any)?.state || 'Not set'}
                                               </span>
                                             </div>
                                             
                                             {(request.organizations as any)?.zip_code && (
                                               <div className="grid grid-cols-2 gap-2 py-1 border-b border-muted/30">
                                                 <span className="font-medium text-foreground">Zip Code:</span>
                                                 <span className="text-muted-foreground break-words">
                                                   {(request.organizations as any).zip_code}
                                                 </span>
                                               </div>
                                             )}
                                             
                                             {/* Contact Information */}
                                             <div className="grid grid-cols-2 gap-2 py-1 border-b border-muted/30">
                                               <span className="font-medium text-foreground">Primary Contact:</span>
                                               <span className="text-muted-foreground break-words">
                                                 {request.organizations?.profiles?.first_name && request.organizations?.profiles?.last_name
                                                   ? `${request.organizations.profiles.first_name} ${request.organizations.profiles.last_name}`
                                                   : 'Not set'
                                                 }
                                               </span>
                                             </div>
                                             
                                             <div className="grid grid-cols-2 gap-2 py-1 border-b border-muted/30">
                                               <span className="font-medium text-foreground">Primary Contact Email:</span>
                                               <span className="text-muted-foreground break-words">
                                                 {request.organizations?.profiles?.email || 'Not set'}
                                               </span>
                                             </div>
                                             
                                             {(request.organizations as any)?.primary_contact_title && (
                                               <div className="grid grid-cols-2 gap-2 py-1 border-b border-muted/30">
                                                 <span className="font-medium text-foreground">Primary Contact Title:</span>
                                                 <span className="text-muted-foreground break-words">
                                                   {(request.organizations as any).primary_contact_title}
                                                 </span>
                                               </div>
                                             )}
                                             
                                             {(request.organizations as any)?.phone && (
                                               <div className="grid grid-cols-2 gap-2 py-1 border-b border-muted/30">
                                                 <span className="font-medium text-foreground">Phone:</span>
                                                 <span className="text-muted-foreground break-words">
                                                   {(request.organizations as any).phone}
                                                 </span>
                                               </div>
                                             )}
                                             
                                             {(request.organizations as any)?.email && (
                                               <div className="grid grid-cols-2 gap-2 py-1 border-b border-muted/30">
                                                 <span className="font-medium text-foreground">Organization Email:</span>
                                                 <span className="text-muted-foreground break-words">
                                                   {(request.organizations as any).email}
                                                 </span>
                                               </div>
                                             )}
                                             
                                             {(request.organizations as any)?.website && (
                                               <div className="grid grid-cols-2 gap-2 py-1 border-b border-muted/30">
                                                 <span className="font-medium text-foreground">Website:</span>
                                                 <span className="text-muted-foreground break-words">
                                                   {(request.organizations as any).website}
                                                 </span>
                                               </div>
                                             )}
                                             
                                             {/* Secondary Contact */}
                                             {((request.organizations as any)?.secondary_first_name || (request.organizations as any)?.secondary_last_name) && (
                                               <div className="grid grid-cols-2 gap-2 py-1 border-b border-muted/30">
                                                 <span className="font-medium text-foreground">Secondary Contact:</span>
                                                 <span className="text-muted-foreground break-words">
                                                   {`${(request.organizations as any)?.secondary_first_name || ''} ${(request.organizations as any)?.secondary_last_name || ''}`.trim() || 'Not set'}
                                                 </span>
                                               </div>
                                             )}
                                             
                                             {(request.organizations as any)?.secondary_contact_email && (
                                               <div className="grid grid-cols-2 gap-2 py-1 border-b border-muted/30">
                                                 <span className="font-medium text-foreground">Secondary Contact Email:</span>
                                                 <span className="text-muted-foreground break-words">
                                                   {(request.organizations as any).secondary_contact_email}
                                                 </span>
                                               </div>
                                             )}
                                             
                                             {(request.organizations as any)?.secondary_contact_title && (
                                               <div className="grid grid-cols-2 gap-2 py-1 border-b border-muted/30">
                                                 <span className="font-medium text-foreground">Secondary Contact Title:</span>
                                                 <span className="text-muted-foreground break-words">
                                                   {(request.organizations as any).secondary_contact_title}
                                                 </span>
                                               </div>
                                             )}
                                             
                                             {/* Organization Details */}
                                             <div className="grid grid-cols-2 gap-2 py-1 border-b border-muted/30">
                                               <span className="font-medium text-foreground">Student FTE:</span>
                                               <span className="text-muted-foreground break-words">
                                                 {(request.organizations as any)?.student_fte?.toLocaleString() || 'Not set'}
                                               </span>
                                             </div>
                                             
                                             {(request.organizations as any)?.membership_status && (
                                               <div className="grid grid-cols-2 gap-2 py-1 border-b border-muted/30">
                                                 <span className="font-medium text-foreground">Membership Status:</span>
                                                 <span className="text-muted-foreground break-words">
                                                   {(request.organizations as any).membership_status}
                                                 </span>
                                               </div>
                                             )}
                                             
                                             {/* Software Systems */}
                                             {(request.organizations as any)?.student_information_system && (
                                               <div className="grid grid-cols-2 gap-2 py-1 border-b border-muted/30">
                                                 <span className="font-medium text-foreground">Student Information System:</span>
                                                 <span className="text-muted-foreground break-words">
                                                   {(request.organizations as any).student_information_system}
                                                 </span>
                                               </div>
                                             )}
                                             
                                             {(request.organizations as any)?.financial_system && (
                                               <div className="grid grid-cols-2 gap-2 py-1 border-b border-muted/30">
                                                 <span className="font-medium text-foreground">Financial System:</span>
                                                 <span className="text-muted-foreground break-words">
                                                   {(request.organizations as any).financial_system}
                                                 </span>
                                               </div>
                                             )}
                                             
                                             {(request.organizations as any)?.financial_aid && (
                                               <div className="grid grid-cols-2 gap-2 py-1 border-b border-muted/30">
                                                 <span className="font-medium text-foreground">Financial Aid:</span>
                                                 <span className="text-muted-foreground break-words">
                                                   {(request.organizations as any).financial_aid}
                                                 </span>
                                               </div>
                                             )}
                                             
                                             {(request.organizations as any)?.learning_management && (
                                               <div className="grid grid-cols-2 gap-2 py-1 border-b border-muted/30">
                                                 <span className="font-medium text-foreground">Learning Management:</span>
                                                 <span className="text-muted-foreground break-words">
                                                   {(request.organizations as any).learning_management}
                                                 </span>
                                               </div>
                                             )}
                                             
                                             {(request.organizations as any)?.hcm_hr && (
                                               <div className="grid grid-cols-2 gap-2 py-1 border-b border-muted/30">
                                                 <span className="font-medium text-foreground">HCM HR:</span>
                                                 <span className="text-muted-foreground break-words">
                                                   {(request.organizations as any).hcm_hr}
                                                 </span>
                                               </div>
                                             )}
                                             
                                             {(request.organizations as any)?.payroll_system && (
                                               <div className="grid grid-cols-2 gap-2 py-1 border-b border-muted/30">
                                                 <span className="font-medium text-foreground">Payroll System:</span>
                                                 <span className="text-muted-foreground break-words">
                                                   {(request.organizations as any).payroll_system}
                                                 </span>
                                               </div>
                                             )}
                                             
                                             {(request.organizations as any)?.purchasing_system && (
                                               <div className="grid grid-cols-2 gap-2 py-1 border-b border-muted/30">
                                                 <span className="font-medium text-foreground">Purchasing System:</span>
                                                 <span className="text-muted-foreground break-words">
                                                   {(request.organizations as any).purchasing_system}
                                                 </span>
                                               </div>
                                             )}
                                             
                                             {(request.organizations as any)?.housing_management && (
                                               <div className="grid grid-cols-2 gap-2 py-1 border-b border-muted/30">
                                                 <span className="font-medium text-foreground">Housing Management:</span>
                                                 <span className="text-muted-foreground break-words">
                                                   {(request.organizations as any).housing_management}
                                                 </span>
                                               </div>
                                             )}
                                             
                                             {(request.organizations as any)?.admissions_crm && (
                                               <div className="grid grid-cols-2 gap-2 py-1 border-b border-muted/30">
                                                 <span className="font-medium text-foreground">Admissions CRM:</span>
                                                 <span className="text-muted-foreground break-words">
                                                   {(request.organizations as any).admissions_crm}
                                                 </span>
                                               </div>
                                             )}
                                             
                                             {(request.organizations as any)?.alumni_advancement_crm && (
                                               <div className="grid grid-cols-2 gap-2 py-1 border-b border-muted/30">
                                                 <span className="font-medium text-foreground">Alumni Advancement CRM:</span>
                                                 <span className="text-muted-foreground break-words">
                                                   {(request.organizations as any).alumni_advancement_crm}
                                                 </span>
                                               </div>
                                             )}
                                             
                                             {(request.organizations as any)?.notes && (
                                               <div className="grid grid-cols-2 gap-2 py-1">
                                                 <span className="font-medium text-foreground">Notes:</span>
                                                 <span className="text-muted-foreground break-words">
                                                   {(request.organizations as any).notes}
                                                 </span>
                                               </div>
                                             )}
                                           </div>
                                         </div>

                                         {/* Updated Organization Information */}
                                         <div className="space-y-2">
                                           <h5 className="font-medium text-xs text-muted-foreground uppercase tracking-wider">Updated Information</h5>
                                           <div className="bg-blue-50/50 border border-blue-200/50 rounded-md p-3 space-y-2 text-sm">
                                             {Object.entries(request.new_organization_data as Record<string, any>)
                                               .filter(([key, value]) => value !== null && value !== undefined && value !== '')
                                               .map(([key, value]) => {
                                                 const displayKey = key
                                                   .replace(/_/g, ' ')
                                                   .replace(/\b\w/g, l => l.toUpperCase());
                                                 
                                                 let displayValue = value;
                                                 if (typeof value === 'boolean') {
                                                   displayValue = value ? 'Yes' : 'No';
                                                 } else if (Array.isArray(value)) {
                                                   displayValue = value.join(', ');
                                                 } else if (typeof value === 'object') {
                                                   displayValue = JSON.stringify(value, null, 2);
                                                 }
                                                 
                                                 return (
                                                   <div key={key} className="grid grid-cols-2 gap-2 py-1 border-b border-blue-200/30 last:border-0">
                                                     <span className="font-medium text-foreground">{displayKey}:</span>
                                                     <span className="text-muted-foreground break-words">
                                                       {String(displayValue)}
                                                     </span>
                                                   </div>
                                                 );
                                               })}
                                           </div>
                                         </div>
                                       </div>
                                       
                                       {/* Summary Note */}
                                       <div className="bg-amber-50/50 border border-amber-200 rounded-md p-3">
                                         <div className="flex items-start gap-2">
                                           <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                           <div className="text-sm">
                                             <p className="font-medium text-amber-800">Approval Impact</p>
                                             <p className="text-amber-700 mt-1">
                                               Approving this request will completely replace all current organization information with the updated data shown above.
                                               The current contact will lose access and the new contact will become the primary administrator.
                                             </p>
                                           </div>
                                         </div>
                                       </div>
                                     </div>
                                   )}

                                  {/* Actions */}
                                  {request.status === 'pending' && (
                                    <div className="flex gap-2 justify-end">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => approveReassignment.mutate({ id: request.id })}
                                        disabled={approveReassignment.isPending}
                                        className="flex items-center gap-1"
                                      >
                                        <CheckCircle className="h-3 w-3" />
                                        Approve
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => deleteReassignment.mutate(request.id)}
                                        disabled={deleteReassignment.isPending}
                                        className="flex items-center gap-1 text-destructive hover:text-destructive"
                                      >
                                        <XCircle className="h-3 w-3" />
                                        Delete
                                      </Button>
                                    </div>
                                  )}
                                </CardContent>
                              </CollapsibleContent>
                            </Card>
                          </Collapsible>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="users" className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-semibold">User Management</h2>
                      <Badge variant="secondary" className="text-sm">
                        {filteredUsers.length} of {users.length} users shown
                      </Badge>
                    </div>

                    {/* Search Bar for Users */}
                    <div className="relative max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search users by email or role..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="pl-10 bg-white"
                      />
                    </div>

                    <Card>
                      <CardContent className="p-6">
                        {filteredUsers.length === 0 ? (
                          <div className="text-center text-muted-foreground py-8">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            {userSearchTerm ? (
                              <p>No users match your search "{userSearchTerm}".</p>
                            ) : (
                              <p>No users found.</p>
                            )}
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredUsers.map((user) => (
                              <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.email}</TableCell>
                                <TableCell>
                                  <Badge variant={user.user_roles?.[0]?.role === 'admin' ? 'default' : 'secondary'}>
                                    {user.user_roles?.[0]?.role || 'member'}
                                  </Badge>
                                </TableCell>
                                 <TableCell>
                                   {new Date(user.created_at).toLocaleDateString()}
                                 </TableCell>
                                 <TableCell className="text-right">
                                   <DropdownMenu>
                                     <DropdownMenuTrigger asChild>
                                       <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                         <MoreVertical className="h-4 w-4" />
                                       </Button>
                                     </DropdownMenuTrigger>
                                     <DropdownMenuContent align="end" className="bg-background border border-border shadow-lg z-50">
                                       <DropdownMenuItem
                                         onClick={() => handleRoleUpdate(user.id, user.user_roles?.[0]?.role || 'member')}
                                         disabled={updatingUser === user.id}
                                         className="flex items-center gap-2"
                                       >
                                         {updatingUser === user.id ? (
                                           <Loader2 className="h-4 w-4 animate-spin" />
                                         ) : (
                                           <KeyRound className="h-4 w-4" />
                                         )}
                                         {user.user_roles?.[0]?.role === 'admin' ? 'Make Member' : 'Make Admin'}
                                       </DropdownMenuItem>
                                       <DropdownMenuItem
                                         onClick={() => handlePasswordReset(user.email)}
                                         className="flex items-center gap-2"
                                       >
                                         <RefreshCw className="h-4 w-4" />
                                         Reset Password
                                       </DropdownMenuItem>
                                       <DropdownMenuItem
                                         onClick={() => handleOpenChangePassword(user.id, user.email)}
                                         className="flex items-center gap-2"
                                       >
                                         <Lock className="h-4 w-4" />
                                         Change Password
                                       </DropdownMenuItem>
                                       <DropdownMenuSeparator />
                                       <AlertDialog>
                                         <AlertDialogTrigger asChild>
                                           <DropdownMenuItem
                                             className="text-destructive focus:text-destructive flex items-center gap-2"
                                             onSelect={(e) => e.preventDefault()}
                                           >
                                             <UserMinus className="h-4 w-4" />
                                             Delete User
                                           </DropdownMenuItem>
                                         </AlertDialogTrigger>
                                         <AlertDialogContent>
                                           <AlertDialogHeader>
                                             <AlertDialogTitle>Delete User</AlertDialogTitle>
                                             <AlertDialogDescription>
                                               Are you sure you want to delete {user.email}? This action cannot be undone.
                                             </AlertDialogDescription>
                                           </AlertDialogHeader>
                                           <AlertDialogFooter>
                                             <AlertDialogCancel>Cancel</AlertDialogCancel>
                                             <AlertDialogAction
                                               onClick={() => handleDeleteUser(user.id)}
                                               className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                             >
                                               Delete
                                             </AlertDialogAction>
                                           </AlertDialogFooter>
                                         </AlertDialogContent>
                                       </AlertDialog>
                                     </DropdownMenuContent>
                                   </DropdownMenu>
                                 </TableCell>
                              </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
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