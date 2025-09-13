import { useState, useEffect, useMemo } from 'react';
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
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '@/styles/quill-custom.css';
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
import { Switch } from '@/components/ui/switch';
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
import { useOrganizationProfileEditRequests, useApproveOrganizationProfileEditRequest, useRejectOrganizationProfileEditRequest } from '@/hooks/useOrganizationProfileEditRequests';
import { usePendingRegistrations } from '@/hooks/usePendingRegistrations';

// Components
import { OrganizationApprovalDialog } from '@/components/OrganizationApprovalDialog';
import { UnifiedComparisonModal } from '@/components/UnifiedComparisonModal';
import { InvitationManagementDialog } from '@/components/InvitationManagementDialog';
import { MemberInfoUpdateRequestsDialog } from '@/components/MemberInfoUpdateRequestsDialog';
import { PendingRegistrationApprovalDialog } from '@/components/PendingRegistrationApprovalDialog';
import { AddExternalUserDialog } from '@/components/AddExternalUserDialog';
import { DebugRequestsComponent } from '@/components/DebugRequestsComponent';
import type { PendingRegistration } from '@/hooks/usePendingRegistrations';

// Icons
import { 
  Users, 
  Building2, 
  Clock, 
  Mail, 
  CheckCircle, 
  XCircle,
  Eye,
  Edit,
  AlertCircle,
  RefreshCw,
  FileText, 
  DollarSign, 
  LogOut, 
  Loader2,
  Shield, 
  UserMinus, 
  UserPlus,
  BarChart3,
  KeyRound,
  Lock,
  Settings as SettingsIcon,
  Search,
  MoreVertical,
  ChevronDown,
  Activity
} from 'lucide-react';
import { SystemHealthStatus } from '@/components/SystemHealthStatus';
import { format } from 'date-fns';

const MasterDashboard = () => {
  const { user, signOut } = useAuth();
  const { stats: dashboardStats, loading: statsLoading } = useDashboardStats();
  const { users, stats, settings, loading: settingsLoading, updateUserRole, deleteUser, deleteUserByEmail, resetUserPassword, changeUserPassword, updateSetting, cleanupOrphanedProfiles, cleanupSpecificUser } = useSettings();
  
  // Organization management hooks
  const { 
    pendingOrganizations, 
    loading: approvalsLoading, 
    approveOrganization, 
    rejectOrganization 
  } = useOrganizationApprovals();
  const { invitations, loading: invitationsLoading } = useOrganizationInvitations();
  const { data: memberInfoUpdateRequests = [], isLoading: memberInfoUpdateLoading, refetch: refetchRequests } = useReassignmentRequests();
  const { requests: profileEditRequests, loading: profileEditRequestsLoading, refetch: refetchProfileEditRequests } = useOrganizationProfileEditRequests();
  const { approveRequest: approveProfileEditRequest } = useApproveOrganizationProfileEditRequest();
  const { rejectRequest: rejectProfileEditRequest } = useRejectOrganizationProfileEditRequest();
  const { pendingRegistrations, loading: pendingRegistrationsLoading, approveRegistration, rejectRegistration } = usePendingRegistrations();
  
  // Calculate pending counts
  const pendingApprovalsCount = pendingOrganizations.length + pendingRegistrations.length + memberInfoUpdateRequests.length + profileEditRequests.length;
  const activeInvitationsCount = invitations.filter(inv => !inv.used_at && new Date(inv.expires_at) > new Date()).length;
  const totalOrganizationActions = pendingApprovalsCount + activeInvitationsCount;
  const approveMemberInfoUpdate = useApproveReassignmentRequest();
  const rejectMemberInfoUpdate = useRejectReassignmentRequest();
  const deleteMemberInfoUpdate = useDeleteReassignmentRequest();

  // State management
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [selectedPendingRegistration, setSelectedPendingRegistration] = useState<PendingRegistration | null>(null);
  const [selectedMemberInfoUpdate, setSelectedMemberInfoUpdate] = useState(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRegistrationApprovalDialog, setShowRegistrationApprovalDialog] = useState(false);
  const [showInvitationDialog, setShowInvitationDialog] = useState(false);
  const [showMemberInfoUpdateDialog, setShowMemberInfoUpdateDialog] = useState(false);
  const [showMemberInfoUpdateComparisonDialog, setShowMemberInfoUpdateComparisonDialog] = useState(false);
  const [selectedProfileEditRequest, setSelectedProfileEditRequest] = useState(null);
  const [showProfileEditComparisonDialog, setShowProfileEditComparisonDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  
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
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [profileUpdateMessage, setProfileUpdateMessage] = useState('');
  const [analyticsFeedbackTemplate, setAnalyticsFeedbackTemplate] = useState('');
  const [invoiceEmailTemplate, setInvoiceEmailTemplate] = useState('');
  const [overdueReminderTemplate, setOverdueReminderTemplate] = useState('');
  const [ccRecipients, setCcRecipients] = useState('');
  const [welcomeCcRecipients, setWelcomeCcRecipients] = useState<string[]>([]);
  const [newCcEmail, setNewCcEmail] = useState('');
  const [defaultRecipients, setDefaultRecipients] = useState<{[email: string]: boolean}>({
    'keith.fowlkes@hessconsortium.org': true
  });
  const [savingMessage, setSavingMessage] = useState(false);
  const [savingWelcomeMessage, setSavingWelcomeMessage] = useState(false);
  const [savingProfileUpdateMessage, setSavingProfileUpdateMessage] = useState(false);
  const [savingAnalyticsFeedbackTemplate, setSavingAnalyticsFeedbackTemplate] = useState(false);
  const [savingInvoiceEmailTemplate, setSavingInvoiceEmailTemplate] = useState(false);
  const [savingOverdueReminderTemplate, setSavingOverdueReminderTemplate] = useState(false);
  const [savingCcRecipients, setSavingCcRecipients] = useState(false);
  const [showAddExternalUser, setShowAddExternalUser] = useState(false);

  console.log('Profile edit requests loaded:', profileEditRequests.length);
  
  // Cleanup specific problematic user on mount
  useEffect(() => {
    const cleanupOrphanedJKFowlkes = async () => {
      const orphanedUser = users.find(u => u.email === 'jkfowlkes@gmail.com' && u.organization === 'J.K. Fowlkes University');
      if (orphanedUser) {
        console.log('🧹 Found orphaned J.K. Fowlkes user, cleaning up...');
        try {
          await cleanupSpecificUser('jkfowlkes@gmail.com');
        } catch (error) {
          console.error('Failed to cleanup orphaned J.K. Fowlkes user:', error);
        }
      }
    };

    if (users.length > 0 && !settingsLoading) {
      cleanupOrphanedJKFowlkes();
    }
  }, [users, settingsLoading, cleanupSpecificUser]);

  // Initialize messages from settings
  useEffect(() => {
    if (settings) {
      const passwordSetting = settings.find(s => s.setting_key === 'password_reset_message');
      if (passwordSetting?.setting_value) {
        setPasswordResetMessage(passwordSetting.setting_value);
      }
      
      const welcomeSetting = settings.find(s => s.setting_key === 'welcome_message_template');
      if (welcomeSetting?.setting_value) {
        setWelcomeMessage(welcomeSetting.setting_value);
      } else {
        // Set default welcome message template
        const defaultTemplate = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <center>
              <img src="http://www.hessconsortium.org/new/wp-content/uploads/2023/03/HESSlogoMasterFLAT.png" alt="HESS LOGO" style="width:230px; height:155px;">
            </center>
            
            <p>{{primary_contact_name}},</p>
            
            <p>Thank you for your registration for HESS Consortium membership. I want to welcome you and {{organization_name}} personally to membership in the HESS Consortium!</p>
            
            <p>I've CCed Gwen Pechan, HESS Board President and CIO at Flagler College to welcome you also.</p>
            
            <p>If you have a few minutes, I would love to fill you in on the work we are doing together in the Consortium and with our business partners.</p>
            
            <p>We will make sure to get your contact information into our member listserv asap.</p>
            
            <p>Also, make sure to register for an account on our HESS Online Leadership Community collaboration website to download the latest information and join in conversation with HESS CIOs. You will definitely want to sign up online at <a href="https://www.hessconsortium.org/community">https://www.hessconsortium.org/community</a> and invite your staff to participate also.</p>
            
            <p>You now have access to our HESS / Coalition Educational Discount Program with Insight for computer and network hardware, peripherals and cloud software. Please create an institutional portal account at <a href="https://www.insight.com/HESS">www.insight.com/HESS</a> online now. We hope you will evaluate these special Insight discount pricing and let us know how it looks compared to your current suppliers.</p>
            
            <p>After you have joined the HESS OLC (mentioned above), click the Member Discounts icon at the top of the page to see all of the discount programs you have access to as a HESS member institution.</p>
            
            <p>Again, welcome to our quickly growing group of private, non-profit institutions in technology!</p>
            
            <img src="https://www.hessconsortium.org/new/wp-content/uploads/2023/04/KeithFowlkesshortsig.png" alt="Keith Fowlkes Signature" style="margin: 20px 0;">
            
            <p>Keith Fowlkes, M.A., M.B.A.<br>
            Executive Director and Founder<br>
            The HESS Consortium<br>
            keith.fowlkes@hessconsortium.org | 859.516.3571</p>
          </div>
        `;
        setWelcomeMessage(defaultTemplate);
      }

      const profileUpdateSetting = settings.find(s => s.setting_key === 'profile_update_message_template');
      if (profileUpdateSetting?.setting_value) {
        setProfileUpdateMessage(profileUpdateSetting.setting_value);
      } else {
        // Set default profile update message template
        const defaultProfileUpdateTemplate = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <center>
              <img src="http://www.hessconsortium.org/new/wp-content/uploads/2023/03/HESSlogoMasterFLAT.png" alt="HESS LOGO" style="width:150px; height:auto;">
            </center>
            
            <p>Dear {{primary_contact_name}},</p>
            
            <p>Your profile update request for {{organization_name}} has been approved by our administration team.</p>
            
            <p>The changes you requested have been applied to your organization's profile and are now active in our system.</p>
            
            <p>You can view your updated profile by logging into the HESS Consortium member portal.</p>
            
            <p>If you have any questions about your profile or membership, please don't hesitate to contact us.</p>
            
            <img src="https://www.hessconsortium.org/new/wp-content/uploads/2023/04/KeithFowlkesshortsig.png" alt="Keith Fowlkes Signature" style="margin: 20px 0;">
            
            <p>Keith Fowlkes, M.A., M.B.A.<br>
            Executive Director and Founder<br>
            The HESS Consortium<br>
            keith.fowlkes@hessconsortium.org | 859.516.3571</p>
          </div>
        `;
        setProfileUpdateMessage(defaultProfileUpdateTemplate);
      }

      const ccSetting = settings.find(s => s.setting_key === 'welcome_message_cc_recipients');
      if (ccSetting?.setting_value) {
        try {
          const ccList = JSON.parse(ccSetting.setting_value);
          setWelcomeCcRecipients(ccList);
        } catch (error) {
          console.error('Error parsing CC recipients:', error);
          setWelcomeCcRecipients([]);
        }
      }
      
      const defaultRecipientsSetting = settings.find(s => s.setting_key === 'welcome_message_default_recipients');
      if (defaultRecipientsSetting?.setting_value) {
        try {
          const defaultRecipientsConfig = JSON.parse(defaultRecipientsSetting.setting_value);
          setDefaultRecipients(defaultRecipientsConfig);
        } catch (error) {
          console.error('Error parsing default recipients:', error);
          setDefaultRecipients({
            'keith.fowlkes@hessconsortium.org': true
          });
        }
      }
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

  const filteredPendingRegistrations = pendingRegistrations.filter(reg => {
    const searchLower = organizationSearchTerm.toLowerCase();
    return (
      reg.organization_name.toLowerCase().includes(searchLower) ||
      reg.first_name.toLowerCase().includes(searchLower) ||
      reg.last_name.toLowerCase().includes(searchLower) ||
      reg.email.toLowerCase().includes(searchLower) ||
      reg.city?.toLowerCase().includes(searchLower) ||
      reg.state?.toLowerCase().includes(searchLower)
    );
  });

  const filteredUsers = users.filter(user => {
    const searchLower = userSearchTerm.toLowerCase();
    return (
      user.email.toLowerCase().includes(searchLower) ||
      user.user_roles?.[0]?.role?.toLowerCase().includes(searchLower)
    );
  }).sort((a, b) => {
    // Sort by role first (admin before member), then by email
    const roleA = a.user_roles?.[0]?.role || 'member';
    const roleB = b.user_roles?.[0]?.role || 'member';
    
    if (roleA !== roleB) {
      return roleA === 'admin' ? -1 : 1;
    }
    
    // Then sort by email
    return a.email.localeCompare(b.email);
  });

  if (statsLoading || settingsLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-lg">Loading dashboard...</span>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  if (!user || !user.email || user.email !== 'keith.fowlkes@hessconsortium.org') {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center p-8">
            <Shield className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">You don't have permission to access this dashboard.</p>
            <Button onClick={() => window.history.back()}>Go Back</Button>
          </div>
        </div>
      </SidebarProvider>
    );
  }

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
      value: pendingOrganizations.length + pendingRegistrations.length + memberInfoUpdateRequests.length + profileEditRequests.length,
      icon: Clock,
      color: 'text-orange-600',
      description: 'Organizations, registrations & profile edits awaiting review'
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
      description: `Admin users in system`
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

  const handleRoleUpdate = async (userId: string, currentRole: string = 'member') => {
    setUpdatingUser(userId);
    try {
      const newRole = currentRole === 'admin' ? 'member' : 'admin';
      await updateUserRole(userId, newRole);
    } catch (error) {
      console.error('Role update failed:', error);
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleDeleteUserByEmail = async (email: string) => {
    console.log('🚨 MASTER DASHBOARD: handleDeleteUserByEmail called with email:', email);
    try {
      await deleteUserByEmail(email);
      console.log('🚨 MASTER DASHBOARD: deleteUserByEmail completed successfully');
    } catch (error) {
      console.error('🚨 MASTER DASHBOARD: deleteUserByEmail failed:', error);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail?: string) => {
    try {
      await deleteUser(userId, userEmail);
    } catch (error) {
      console.error('Delete user failed:', error);
    }
  };

  // Create comparison data for profile edit requests
  const createProfileEditComparisonData = (request) => {
    if (!request) return { originalData: null };

    const organizationChanges = [];
    const profileChanges = [];

    // Compare organization data
    if (request.original_organization_data && request.updated_organization_data) {
      const orgFields = [
        { key: 'name', label: 'Organization Name' },
        { key: 'address_line_1', label: 'Address' },
        { key: 'city', label: 'City' },
        { key: 'state', label: 'State' },
        { key: 'zip_code', label: 'ZIP Code' },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email' },
        { key: 'website', label: 'Website' },
        { key: 'student_fte', label: 'Student FTE', type: 'number' },
        { key: 'student_information_system', label: 'Student Information System' },
        { key: 'financial_system', label: 'Financial System' },
        { key: 'financial_aid', label: 'Financial Aid' },
        { key: 'hcm_hr', label: 'HCM/HR System' },
        { key: 'payroll_system', label: 'Payroll System' },
        { key: 'purchasing_system', label: 'Purchasing System' },
        { key: 'housing_management', label: 'Housing Management' },
        { key: 'learning_management', label: 'Learning Management' },
        { key: 'admissions_crm', label: 'Admissions CRM' },
        { key: 'alumni_advancement_crm', label: 'Alumni/Advancement CRM' }
      ];

      orgFields.forEach(field => {
        const oldValue = request.original_organization_data[field.key];
        const newValue = request.updated_organization_data[field.key];
        if (oldValue !== newValue) {
          organizationChanges.push({
            field: field.key,
            label: field.label,
            oldValue: oldValue || '',
            newValue: newValue || '',
            ...(field.type && { type: field.type })
          });
        }
      });
    }

    // Compare profile data
    if (request.original_profile_data && request.updated_profile_data) {
      const profileFields = [
        { key: 'first_name', label: 'First Name' },
        { key: 'last_name', label: 'Last Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'primary_contact_title', label: 'Title' },
        { key: 'secondary_first_name', label: 'Secondary Contact First Name' },
        { key: 'secondary_last_name', label: 'Secondary Contact Last Name' },
        { key: 'secondary_contact_title', label: 'Secondary Contact Title' },
        { key: 'secondary_contact_email', label: 'Secondary Contact Email' }
      ];

      profileFields.forEach(field => {
        const oldValue = request.original_profile_data[field.key];
        const newValue = request.updated_profile_data[field.key];
        if (oldValue !== newValue) {
          profileChanges.push({
            field: field.key,
            label: field.label,
            oldValue: oldValue || '',
            newValue: newValue || ''
          });
        }
      });
    }

    return {
      organizationChanges,
      profileChanges,
      originalData: {
        organization: request.original_organization_data,
        profile: request.original_profile_data
      },
      updatedData: {
        organization: request.updated_organization_data,
        profile: request.updated_profile_data
      }
    };
  };

  const handleApproveProfileEdit = async () => {
    if (!selectedProfileEditRequest) return;
    
    try {
      await approveProfileEditRequest(selectedProfileEditRequest.id);
      setShowProfileEditComparisonDialog(false);
      setSelectedProfileEditRequest(null);
      setAdminNotes('');
      refetchProfileEditRequests();
    } catch (error) {
      console.error('Error approving profile edit request:', error);
    }
  };

  const handleRejectProfileEdit = async () => {
    if (!selectedProfileEditRequest) return;
    
    try {
      await rejectProfileEditRequest(selectedProfileEditRequest.id, adminNotes || 'Rejected');
      setShowProfileEditComparisonDialog(false);
      setSelectedProfileEditRequest(null);
      setAdminNotes('');
      refetchProfileEditRequests();
    } catch (error) {
      console.error('Error rejecting profile edit request:', error);
    }
  };

  const handlePasswordReset = async (email: string) => {
    try {
      await resetUserPassword(email);
    } catch (error) {
      console.error('Password reset failed:', error);
    }
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
    try {
      await changeUserPassword(changePasswordDialog.userId, newPassword);
      setChangePasswordDialog({ open: false, userId: '', userName: '' });
      setNewPassword('');
    } catch (error) {
      console.error('Change password failed:', error);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSavePasswordMessage = async () => {
    setSavingMessage(true);
    await updateSetting('password_reset_message', passwordResetMessage);
    setSavingMessage(false);
  };

  const handleSaveWelcomeMessage = async () => {
    setSavingWelcomeMessage(true);
    await updateSetting('welcome_message_template', welcomeMessage);
    setSavingWelcomeMessage(false);
  };

  const handleSaveProfileUpdateMessage = async () => {
    setSavingProfileUpdateMessage(true);
    await updateSetting('profile_update_message_template', profileUpdateMessage);
    setSavingProfileUpdateMessage(false);
  };

  const handleSaveAnalyticsFeedbackTemplate = async () => {
    setSavingAnalyticsFeedbackTemplate(true);
    await updateSetting('analytics_feedback_template', analyticsFeedbackTemplate);
    setSavingAnalyticsFeedbackTemplate(false);
  };

  const handleSaveInvoiceEmailTemplate = async () => {
    setSavingInvoiceEmailTemplate(true);
    await updateSetting('invoice_email_template', invoiceEmailTemplate);
    setSavingInvoiceEmailTemplate(false);
  };

  const handleSaveOverdueReminderTemplate = async () => {
    setSavingOverdueReminderTemplate(true);
    await updateSetting('overdue_reminder_template', overdueReminderTemplate);
    setSavingOverdueReminderTemplate(false);
  };

  const handleSaveCcRecipients = async () => {
    setSavingCcRecipients(true);
    await updateSetting('welcome_message_cc_recipients', JSON.stringify(welcomeCcRecipients));
    await updateSetting('welcome_message_default_recipients', JSON.stringify(defaultRecipients));
    setSavingCcRecipients(false);
  };

  const handleDeleteDefaultRecipient = async (email: string) => {
    const updated = { ...defaultRecipients };
    delete updated[email];
    setDefaultRecipients(updated);
    try {
      setSavingCcRecipients(true);
      await updateSetting('welcome_message_default_recipients', JSON.stringify(updated));
    } finally {
      setSavingCcRecipients(false);
    }
  };
  const handleAddCcRecipient = () => {
    if (newCcEmail.trim() && !welcomeCcRecipients.includes(newCcEmail.trim())) {
      setWelcomeCcRecipients([...welcomeCcRecipients, newCcEmail.trim()]);
      setNewCcEmail('');
    }
  };

  const handleRemoveCcRecipient = async (email: string) => {
    const updated = welcomeCcRecipients.filter(recipient => recipient !== email);
    setWelcomeCcRecipients(updated);
    try {
      setSavingCcRecipients(true);
      await updateSetting('welcome_message_cc_recipients', JSON.stringify(updated));
    } finally {
      setSavingCcRecipients(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 p-8 space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Master Dashboard</h1>
              <p className="text-muted-foreground">System administration and overview</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => setShowAddExternalUser(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add External User
              </Button>
              <Button onClick={signOut} variant="outline">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
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
              <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-8">
              {/* Main Statistics */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {mainStats.map((stat, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-lg bg-gray-100 ${stat.color}`}>
                          <stat.icon className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                          <p className="text-2xl font-bold">{stat.value}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Admin Statistics */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {adminStats.map((stat, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between space-x-4">
                        <div className="flex items-center space-x-4">
                          <div className={`p-2 rounded-lg bg-gray-100 ${stat.color}`}>
                            <stat.icon className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                            <p className="text-2xl font-bold">{stat.value}</p>
                            <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* System Health Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    System Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SystemHealthStatus />
                </CardContent>
              </Card>
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
                    Organization Invitations
                    {activeInvitationsCount > 0 && (
                      <Badge 
                        variant="outline" 
                        className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                      >
                        {activeInvitationsCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="approvals" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Pending Approvals</h2>
                    <div className="flex items-center gap-2">
                      {pendingApprovalsCount > 0 && (
                        <Badge variant="secondary">
                          {pendingApprovalsCount} pending
                        </Badge>
                      )}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search organizations..."
                          value={organizationSearchTerm}
                          onChange={(e) => setOrganizationSearchTerm(e.target.value)}
                          className="pl-10 w-64"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Organization Approvals */}
                    {filteredPendingOrganizations.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-orange-600 flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          Organization Registrations ({filteredPendingOrganizations.length})
                        </h3>
                        {filteredPendingOrganizations.map((org) => (
                          <Card key={`org-${org.id}`} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-semibold">{org.name}</h3>
                                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                      New Organization
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground space-y-1">
                                    <p>
                                      <strong>Contact:</strong> {org.profiles?.first_name} {org.profiles?.last_name} ({org.profiles?.email})
                                    </p>
                                    <p>
                                      <strong>Location:</strong> {org.city}, {org.state}
                                    </p>
                                    <p>
                                      <strong>Student FTE:</strong> {org.student_fte ? org.student_fte.toLocaleString() : 'Not specified'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleReviewOrganization(org)}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Review
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* Pending Registrations */}
                    {filteredPendingRegistrations.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-blue-600 flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          User Registrations ({filteredPendingRegistrations.length})
                        </h3>
                        {filteredPendingRegistrations.map((registration) => (
                          <Card key={`reg-${registration.id}`} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-semibold">
                                      {registration.first_name} {registration.last_name}
                                    </h3>
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                      User Registration
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground space-y-1">
                                    <p><strong>Email:</strong> {registration.email}</p>
                                    <p><strong>Organization:</strong> {registration.organization_name}</p>
                                    <p><strong>Requested:</strong> {format(new Date(registration.created_at), 'PPp')}</p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => {
                                      setSelectedPendingRegistration(registration);
                                      setShowRegistrationApprovalDialog(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Review
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* Member Info Update Requests */}
                    {memberInfoUpdateRequests.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-green-600 flex items-center gap-2">
                          <Edit className="h-5 w-5" />
                          Member Info Updates ({memberInfoUpdateRequests.length})
                        </h3>
                        {memberInfoUpdateRequests.map((request) => (
                          <Card key={`member-info-${request.id}`} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-semibold">
                                      {request.organizations?.name || 'Member Info Update'}
                                    </h3>
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      Member Info Update
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground space-y-1">
                                    <p><strong>New Contact:</strong> {request.new_contact_email}</p>
                                    <p><strong>Current Contact:</strong> {request.organizations?.profiles?.email}</p>
                                    <p><strong>Requested:</strong> {format(new Date(request.created_at), 'PPp')}</p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => {
                                      console.log('Review Changes clicked for member info:', request.id);
                                      setSelectedMemberInfoUpdate(request);
                                      setShowMemberInfoUpdateComparisonDialog(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Review Changes
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* Profile Update Requests */}
                    {profileEditRequests.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-purple-600 flex items-center gap-2">
                          <Edit className="h-5 w-5" />
                          Profile Updates ({profileEditRequests.length})
                        </h3>
                        {profileEditRequests.map((request) => (
                          <Card key={`profile-edit-${request.id}`} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-semibold">
                                      {request.organization?.name || 'Profile Update Request'}
                                    </h3>
                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                      Profile Update
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground space-y-1">
                                    <p><strong>Contact:</strong> {request.updated_profile_data?.first_name} {request.updated_profile_data?.last_name}</p>
                                    <p><strong>Email:</strong> {request.updated_profile_data?.email}</p>
                                    <p><strong>Requested:</strong> {format(new Date(request.created_at), 'PPp')}</p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => {
                                      console.log('Review Changes clicked for profile edit:', request.id);
                                      setSelectedProfileEditRequest(request);
                                      setShowProfileEditComparisonDialog(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Review Changes
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {pendingApprovalsCount === 0 && (
                      <div className="text-center py-12">
                        <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
                        <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
                        <p className="text-muted-foreground">No pending approvals at this time.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="invitations" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Organization Invitations</h2>
                    <div className="flex items-center gap-2">
                      {activeInvitationsCount > 0 && (
                        <Badge variant="secondary">
                          {activeInvitationsCount} active
                        </Badge>
                      )}
                      <Button onClick={() => setShowInvitationDialog(true)}>
                        <Mail className="h-4 w-4 mr-2" />
                        Manage Invitations
                      </Button>
                    </div>
                  </div>

                  <Card>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">Recent Invitations</h3>
                          <span className="text-sm text-muted-foreground">
                            {invitations.length} total invitations
                          </span>
                        </div>
                        
                        {invitations.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Organization</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Expires</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {invitations.slice(0, 10).map((invitation) => (
                                <TableRow key={invitation.id}>
                                  <TableCell className="font-medium">{invitation.email}</TableCell>
                                  <TableCell>
                                    {typeof invitation.organization === 'string' 
                                      ? invitation.organization 
                                      : invitation.organization?.name || 'N/A'
                                    }
                                  </TableCell>
                                  <TableCell>
                                    {invitation.used_at ? (
                                      <Badge variant="secondary">Used</Badge>
                                    ) : new Date(invitation.expires_at) > new Date() ? (
                                      <Badge variant="outline">Active</Badge>
                                    ) : (
                                      <Badge variant="destructive">Expired</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>{format(new Date(invitation.expires_at), 'PPp')}</TableCell>
                                  <TableCell>
                                    <Button variant="outline" size="sm">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-8">
                            <Mail className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                            <p className="text-muted-foreground">No invitations found</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-semibold">User Management</h2>
                  <p className="text-muted-foreground">Manage system users and their permissions</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{users.length} users</Badge>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search users..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </div>

              <Card>
                <CardContent className="p-6">
                  {filteredUsers.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Organization</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Last Sign In</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{user.email}</p>
                                <p className="text-sm text-muted-foreground">
                                  ID: {user.id}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{user.organization || 'Not specified'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                member
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {user.created_at 
                                ? format(new Date(user.created_at), 'PPp')
                                : 'Never'
                              }
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    onClick={() => handleRoleUpdate(user.id)}
                                    disabled={updatingUser === user.id}
                                  >
                                    {updatingUser === user.id ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <UserPlus className="h-4 w-4 mr-2" />
                                    )}
                                    Toggle Admin Role
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handlePasswordReset(user.email)}>
                                    <KeyRound className="h-4 w-4 mr-2" />
                                    Reset Password
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleOpenChangePassword(user.id, user.email)}>
                                    <Lock className="h-4 w-4 mr-2" />
                                    Change Password
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteUser(user.id, user.email)}
                                    className="text-red-600"
                                  >
                                    <UserMinus className="h-4 w-4 mr-2" />
                                    Delete User
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No users found</h3>
                      <p className="text-muted-foreground">Try adjusting your search criteria.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Member Info Update Comparison Dialog */}
      {selectedMemberInfoUpdate && showMemberInfoUpdateComparisonDialog && (
        <UnifiedComparisonModal
          open={showMemberInfoUpdateComparisonDialog}
          onOpenChange={(open) => {
            console.log('Member info dialog open change:', open);
            setShowMemberInfoUpdateComparisonDialog(open);
            if (!open) {
              setSelectedMemberInfoUpdate(null);
            }
          }}
          title="Review Member Information Update"
          data={{
            originalData: selectedMemberInfoUpdate.original_organization_data || {},
            updatedData: selectedMemberInfoUpdate.new_organization_data || {},
            contactChanges: [{
              field: 'Contact Email',
              oldValue: selectedMemberInfoUpdate.organizations?.profiles?.email || 'N/A',
              newValue: selectedMemberInfoUpdate.new_contact_email || 'N/A'
            }]
          }}
          showActions={true}
          onApprove={async () => {
            console.log('Approving member info update:', selectedMemberInfoUpdate.id);
            try {
              await approveMemberInfoUpdate.mutateAsync({ id: selectedMemberInfoUpdate.id });
              setShowMemberInfoUpdateComparisonDialog(false);
              setSelectedMemberInfoUpdate(null);
            } catch (error) {
              console.error('Error approving member info update:', error);
            }
          }}
          onReject={async () => {
            console.log('Rejecting member info update:', selectedMemberInfoUpdate.id);
            try {
              await deleteMemberInfoUpdate.mutateAsync(selectedMemberInfoUpdate.id);
              setShowMemberInfoUpdateComparisonDialog(false);
              setSelectedMemberInfoUpdate(null);
            } catch (error) {
              console.error('Error rejecting member info update:', error);
            }
          }}
          isSubmitting={approveMemberInfoUpdate.isPending || deleteMemberInfoUpdate.isPending}
        />
      )}

      {/* Profile Edit Comparison Dialog */}
      {selectedProfileEditRequest && showProfileEditComparisonDialog && (
        <UnifiedComparisonModal
          open={showProfileEditComparisonDialog}
          onOpenChange={(open) => {
            console.log('Profile edit dialog open change:', open);
            setShowProfileEditComparisonDialog(open);
            if (!open) {
              setSelectedProfileEditRequest(null);
            }
          }}
          title="Review Profile Update Request"
          data={createProfileEditComparisonData(selectedProfileEditRequest)}
          showActions={true}
          onApprove={() => {
            console.log('Approving profile edit request');
            handleApproveProfileEdit();
          }}
          onReject={() => {
            console.log('Rejecting profile edit request');
            handleRejectProfileEdit();
          }}
          actionNotes={adminNotes}
          onActionNotesChange={setAdminNotes}
          isSubmitting={false}
        />
      )}

      {/* Organization Approval Dialog */}
      {selectedOrganization && (
        <OrganizationApprovalDialog
          organization={selectedOrganization}
          open={showApprovalDialog}
          onOpenChange={setShowApprovalDialog}
          onApprove={approveOrganization}
          onReject={rejectOrganization}
        />
      )}

      {/* Registration Approval Dialog */}
      {selectedPendingRegistration && (
        <PendingRegistrationApprovalDialog
          registration={selectedPendingRegistration}
          open={showRegistrationApprovalDialog}
          onOpenChange={setShowRegistrationApprovalDialog}
          onApprove={approveRegistration}
          onReject={rejectRegistration}
        />
      )}

      {/* Invitation Management Dialog */}
      <InvitationManagementDialog
        open={showInvitationDialog}
        onOpenChange={setShowInvitationDialog}
      />

      {/* Change Password Dialog */}
      <Dialog open={changePasswordDialog.open} onOpenChange={(open) => setChangePasswordDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Set a new password for {changePasswordDialog.userName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
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
              disabled={!newPassword.trim() || changingPassword}
            >
              {changingPassword ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add External User Dialog */}
      <AddExternalUserDialog
        open={showAddExternalUser}
        onOpenChange={setShowAddExternalUser}
        onUserCreated={() => {}}
      />
    </SidebarProvider>
  );
};

export default MasterDashboard;
