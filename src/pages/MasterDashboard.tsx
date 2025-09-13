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
import SystemMessageEditor from '@/components/SystemMessageEditor';
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
  ChevronDown
} from 'lucide-react';
import { ConnectionTest } from '@/components/ConnectionTest';
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

  const handleSaveCcRecipients = async () => {
    setSavingCcRecipients(true);
    await updateSetting('welcome_message_cc_recipients', JSON.stringify(welcomeCcRecipients));
    await updateSetting('welcome_message_default_recipients', JSON.stringify(defaultRecipients));
    setSavingCcRecipients(false);
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
  // Initialize password reset message, welcome message, profit update message, and CC recipients when settings load
  useEffect(() => {
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

    // Initialize profile update message
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

    // Load CC recipients
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
    
    // Load default recipients settings
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
    console.log('Dashboard loading state:', { 
      statsLoading, 
      settingsLoading, 
      approvalsLoading, 
      invitationsLoading, 
      memberInfoUpdateLoading,
      pendingRegistrationsLoading 
    });
    
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 p-8">
            <ConnectionTest />
            <div className="mt-8 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">
                Loading dashboard... (stats: {statsLoading ? 'loading' : 'done'}, settings: {settingsLoading ? 'loading' : 'done'})
              </p>
            </div>
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
                    Logged in as: 
                    <a 
                      href={`mailto:${user.email}`}
                      className="font-medium text-primary hover:underline ml-1"
                    >
                      {user.email}
                    </a>
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
                  Organizations/Users
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
                    <TabsTrigger value="users">User Management</TabsTrigger>
                  </TabsList>

                  <TabsContent value="approvals" className="space-y-6">
                    {/* New Member Applications Section */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Pending New Member Applications</h2>
                        <div className="flex items-center gap-2">
                          {(pendingOrganizations.length + pendingRegistrations.length + memberInfoUpdateRequests.length + profileEditRequests.length) > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                              <AlertCircle className="h-4 w-4" />
                              <span className="font-medium">{pendingOrganizations.length + pendingRegistrations.length + memberInfoUpdateRequests.length + profileEditRequests.length} Pending Review</span>
                            </div>
                          )}
                          <Badge variant="secondary" className="text-sm">
                            {filteredPendingOrganizations.length + filteredPendingRegistrations.length + memberInfoUpdateRequests.length + profileEditRequests.length} of {pendingOrganizations.length + pendingRegistrations.length + memberInfoUpdateRequests.length + profileEditRequests.length} shown
                          </Badge>
                        </div>
                      </div>

                      {/* Search Bar */}
                      <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          placeholder="Search applications, contacts, or locations..."
                          value={organizationSearchTerm}
                          onChange={(e) => setOrganizationSearchTerm(e.target.value)}
                          className="pl-10 bg-white"
                        />
                      </div>

                      {(approvalsLoading || pendingRegistrationsLoading || profileEditRequestsLoading) ? (
                        <Card>
                          <CardContent className="p-6">
                            <div className="text-center">Loading pending applications...</div>
                          </CardContent>
                        </Card>
                      ) : (filteredPendingOrganizations.length === 0 && filteredPendingRegistrations.length === 0 && memberInfoUpdateRequests.length === 0 && profileEditRequests.length === 0) ? (
                        <Card>
                          <CardContent className="p-6">
                            <div className="text-center text-muted-foreground">
                              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              {organizationSearchTerm ? (
                                <p>No applications match your search "{organizationSearchTerm}".</p>
                              ) : (
                                <p>No pending new member applications.</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="grid gap-4">
                        {/* Existing Organization Applications */}
                        {filteredPendingOrganizations.map((org) => (
                          <Card key={`org-${org.id}`} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-semibold">{org.name}</h3>
                                    <Badge variant="secondary">Organization Update</Badge>
                                    <Badge variant={org.profiles?.is_private_nonprofit ? "default" : "destructive"}>
                                      {org.profiles?.is_private_nonprofit ? "Private Non-Profit" : "Not Approved"}
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
                    Review Changes
                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        
                        {/* New Registration Applications */}
                        {filteredPendingRegistrations.map((reg) => (
                          <Card key={`reg-${reg.id}`} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-semibold">{reg.organization_name}</h3>
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                      New Registration
                                    </Badge>
                                  </div>
                                  
                                  <div className="text-sm text-muted-foreground space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Users className="h-3 w-3" />
                                      <span>
                                        Contact: {reg.first_name} {reg.last_name}
                                        {reg.primary_contact_title && ` - ${reg.primary_contact_title}`}
                                      </span>
                                    </div>
                                    <div>
                                      Email: {reg.email} | Location: {reg.city}, {reg.state}
                                    </div>
                                    <div>
                                      Student FTE: {reg.student_fte?.toLocaleString() || 'Not specified'} | 
                                      Submitted: {new Date(reg.created_at).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedPendingRegistration(reg);
                                      setShowRegistrationApprovalDialog(true);
                                    }}
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

                        {/* Member Info Update Requests */}
                        {memberInfoUpdateRequests.map((request) => (
                          <Card key={`update-${request.id}`} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-semibold">
                                      {request.new_organization_data?.name || 'Organization Update'}
                                    </h3>
                                     <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                       Member Info Update
                                     </Badge>
                                  </div>
                                  
                                  <div className="text-sm text-muted-foreground space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Users className="h-3 w-3" />
                                      <span>New Contact: {request.new_contact_email}</span>
                                    </div>
                                    <div>
                                      Status: {request.status} | 
                                      Requested: {new Date(request.created_at).toLocaleDateString()}
                                    </div>
                                    {request.admin_notes && (
                                      <div>
                                        Notes: {request.admin_notes}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                   <Button
                                     variant="outline"
                                     size="sm"
                                     onClick={() => {
                                       setSelectedMemberInfoUpdate(request);
                                       setShowMemberInfoUpdateComparisonDialog(true);
                                     }}
                                     className="flex items-center gap-2"
                                   >
                                     <Eye className="h-3 w-3" />
                                     Review Changes
                                   </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          ))}

                        {/* Profile Update Requests */}
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
                                     <div className="flex items-center gap-2">
                                       <Users className="h-3 w-3" />
                                       <span>
                                         Requested by: {request.requester_profile?.first_name} {request.requester_profile?.last_name}
                                         {request.organization?.name && (
                                           <span className="text-muted-foreground"> ({request.organization.name})</span>
                                         )}
                                       </span>
                                     </div>
                                    <div>
                                      Email: {request.requester_profile?.email} | 
                                      Status: {request.status}
                                    </div>
                                    <div>
                                      Requested: {new Date(request.created_at).toLocaleDateString()}
                                    </div>
                                    {request.admin_notes && (
                                      <div>
                                        Admin Notes: {request.admin_notes}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                 <div className="flex gap-2">
                                   <Button
                                     variant="outline"
                                     size="sm"
                                     onClick={() => {
                                       setSelectedProfileEditRequest(request);
                                       setShowProfileEditComparisonDialog(true);
                                       setAdminNotes('');
                                     }}
                                     className="flex items-center gap-2"
                                   >
                                     <Eye className="h-3 w-3" />
                                     Review Changes
                                   </Button>
                                  <Button
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        const success = await approveProfileEditRequest(request.id);
                                        if (success) {
                                          // Force immediate refresh of the requests list
                                          refetchProfileEditRequests();
                                        }
                                      } catch (error) {
                                        console.error('Error approving profile edit request:', error);
                                      }
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        const success = await rejectProfileEditRequest(request.id, 'Rejected from dashboard');
                                        if (success) {
                                          // Force immediate refresh of the requests list
                                          refetchProfileEditRequests();
                                        }
                                      }
                                      catch (error) {
                                        console.error('Error rejecting profile edit request:', error);
                                      }
                                    }}
                                  >
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                         </div>
                      )}
                     </div>
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
                        {memberInfoUpdateRequests.length > 0 && (
                           <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                             <AlertCircle className="h-4 w-4" />
                             <span className="font-medium">{memberInfoUpdateRequests.length} Pending</span>
                           </div>
                        )}
                        <Button onClick={() => refetchRequests()}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh List
                        </Button>
                      </div>
                    </div>

                    {memberInfoUpdateLoading ? (
                      <Card>
                        <CardContent className="p-6">
                          <div className="text-center">Loading reassignment requests...</div>
                        </CardContent>
                      </Card>
                    ) : memberInfoUpdateRequests.length === 0 ? (
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
                        {memberInfoUpdateRequests.map((request) => (
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
                                       
                                       {(() => {
                                         const currentOrg = request.organizations as any;
                                         const newOrgData = request.new_organization_data as Record<string, any>;
                                         
                                         // Define field mappings for consistent display
                                         const fieldMappings = [
                                           { key: 'name', label: 'Organization Name', current: currentOrg?.name, new: newOrgData?.name },
                                           { 
                                             key: 'address', 
                                             label: 'Address', 
                                             current: [currentOrg?.address_line_1, currentOrg?.address_line_2].filter(Boolean).join(', '),
                                             new: [newOrgData?.address_line_1, newOrgData?.address_line_2].filter(Boolean).join(', ')
                                           },
                                           { key: 'city', label: 'City', current: currentOrg?.city, new: newOrgData?.city },
                                           { key: 'state', label: 'State', current: currentOrg?.state, new: newOrgData?.state },
                                           { key: 'zip_code', label: 'ZIP Code', current: currentOrg?.zip_code, new: newOrgData?.zip_code },
                                           { key: 'country', label: 'Country', current: currentOrg?.country, new: newOrgData?.country },
                                           { 
                                             key: 'primary_contact', 
                                             label: 'Primary Contact', 
                                             current: currentOrg?.contact_person_id && currentOrg?.profiles
                                               ? `${currentOrg.profiles.first_name} ${currentOrg.profiles.last_name}` 
                                               : 'Not set',
                                             new: newOrgData?.primary_contact_name || 'Not specified'
                                           },
                                           { key: 'primary_contact_title', label: 'Primary Contact Title', current: currentOrg?.primary_contact_title, new: newOrgData?.primary_contact_title },
                                           { key: 'phone', label: 'Phone', current: currentOrg?.phone, new: newOrgData?.phone },
                                           { key: 'email', label: 'Email', current: currentOrg?.email, new: newOrgData?.email },
                                           { key: 'website', label: 'Website', current: currentOrg?.website, new: newOrgData?.website },
                                           { 
                                             key: 'secondary_contact', 
                                             label: 'Secondary Contact', 
                                             current: `${currentOrg?.secondary_first_name || ''} ${currentOrg?.secondary_last_name || ''}`.trim() || 'Not set',
                                             new: `${newOrgData?.secondary_first_name || ''} ${newOrgData?.secondary_last_name || ''}`.trim() || 'Not set'
                                           },
                                           { key: 'secondary_contact_email', label: 'Secondary Contact Email', current: currentOrg?.secondary_contact_email, new: newOrgData?.secondary_contact_email },
                                           { key: 'secondary_contact_title', label: 'Secondary Contact Title', current: currentOrg?.secondary_contact_title, new: newOrgData?.secondary_contact_title },
                                           { key: 'student_fte', label: 'Student FTE', current: currentOrg?.student_fte?.toLocaleString(), new: newOrgData?.student_fte?.toLocaleString() },
                                           { key: 'membership_status', label: 'Membership Status', current: currentOrg?.membership_status, new: newOrgData?.membership_status },
                                           { key: 'student_information_system', label: 'Student Information System', current: currentOrg?.student_information_system, new: newOrgData?.student_information_system },
                                           { key: 'financial_system', label: 'Financial System', current: currentOrg?.financial_system, new: newOrgData?.financial_system },
                                           { key: 'financial_aid', label: 'Financial Aid', current: currentOrg?.financial_aid, new: newOrgData?.financial_aid },
                                           { key: 'learning_management', label: 'Learning Management', current: currentOrg?.learning_management, new: newOrgData?.learning_management },
                                           { key: 'hcm_hr', label: 'HCM HR', current: currentOrg?.hcm_hr, new: newOrgData?.hcm_hr },
                                           { key: 'payroll_system', label: 'Payroll System', current: currentOrg?.payroll_system, new: newOrgData?.payroll_system },
                                           { key: 'purchasing_system', label: 'Purchasing System', current: currentOrg?.purchasing_system, new: newOrgData?.purchasing_system },
                                           { key: 'housing_management', label: 'Housing Management', current: currentOrg?.housing_management, new: newOrgData?.housing_management },
                                           { key: 'admissions_crm', label: 'Admissions CRM', current: currentOrg?.admissions_crm, new: newOrgData?.admissions_crm },
                                           { key: 'alumni_advancement_crm', label: 'Alumni Advancement CRM', current: currentOrg?.alumni_advancement_crm, new: newOrgData?.alumni_advancement_crm },
                                           { key: 'notes', label: 'Notes', current: currentOrg?.notes, new: newOrgData?.notes }
                                         ];
                                         
                                         // Filter to show only fields that have values or changes
                                         const relevantFields = fieldMappings.filter(field => 
                                           field.current || field.new
                                         );
                                         
                                         return (
                                           <div className="border border-border rounded-lg overflow-hidden">
                                             <Table>
                                               <TableHeader>
                                                 <TableRow className="bg-muted/50">
                                                   <TableHead className="font-semibold">Field</TableHead>
                                                   <TableHead className="font-semibold">Current Value</TableHead>
                                                   <TableHead className="font-semibold">Updated Value</TableHead>
                                                 </TableRow>
                                               </TableHeader>
                                               <TableBody>
                                                 {relevantFields.map((field) => {
                                                   const currentValue = field.current || 'Not set';
                                                   const newValue = field.new || 'Not set';
                                                   const hasChanged = currentValue !== newValue;
                                                   
                                                   return (
                                                     <TableRow 
                                                       key={field.key} 
                                                       className={hasChanged ? "bg-amber-50/50" : ""}
                                                     >
                                                       <TableCell className="font-medium text-foreground">
                                                         {field.label}
                                                         {hasChanged && (
                                                           <Badge variant="outline" className="ml-2 text-xs bg-amber-100 text-amber-800 border-amber-300">
                                                             Changed
                                                           </Badge>
                                                         )}
                                                       </TableCell>
                                                       <TableCell className="text-muted-foreground break-words max-w-xs">
                                                         {currentValue}
                                                       </TableCell>
                                                       <TableCell className={`break-words max-w-xs ${hasChanged ? 'text-blue-700 font-medium' : 'text-muted-foreground'}`}>
                                                         {newValue}
                                                       </TableCell>
                                                     </TableRow>
                                                   );
                                                 })}
                                               </TableBody>
                                             </Table>
                                           </div>
                                         );
                                       })()}
                                     </div>
                                   )}

                                  {/* Actions */}
                                  {request.status === 'pending' && (
                                    <div className="flex gap-2 justify-end">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => approveMemberInfoUpdate.mutate({ id: request.id })}
                                        disabled={approveMemberInfoUpdate.isPending}
                                        className="flex items-center gap-1"
                                      >
                                        <CheckCircle className="h-3 w-3" />
                                        Approve
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => deleteMemberInfoUpdate.mutate(request.id)}
                                        disabled={deleteMemberInfoUpdate.isPending}
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
                    <div className="flex gap-4 items-center">
                      <div className="relative max-w-md flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          placeholder="Search users by email or role..."
                          value={userSearchTerm}
                          onChange={(e) => setUserSearchTerm(e.target.value)}
                          className="pl-10 bg-white"
                        />
                      </div>
                      <Button
                        onClick={() => setShowAddExternalUser(true)}
                        className="whitespace-nowrap"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add External User
                      </Button>
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
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <a 
                                      href={`mailto:${user.email}`}
                                      className="text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                      {user.email}
                                    </a>
                                    {user.organization && (
                                      <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-700 border-gray-300">
                                        {user.organization}
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
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
                                          onClick={(e) => {
                                            e.preventDefault();
                                            handleRoleUpdate(user.user_id || user.id, user.user_roles?.[0]?.role || 'member');
                                          }}
                                          disabled={updatingUser === (user.user_id || user.id)}
                                          className="flex items-center gap-2 cursor-pointer"
                                        >
                                          {updatingUser === (user.user_id || user.id) ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <KeyRound className="h-4 w-4" />
                                          )}
                                          {user.user_roles?.[0]?.role === 'admin' ? 'Make Member' : 'Make Admin'}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={(e) => {
                                            e.preventDefault();
                                            handlePasswordReset(user.email);
                                          }}
                                          className="flex items-center gap-2 cursor-pointer"
                                        >
                                          <RefreshCw className="h-4 w-4" />
                                          Reset Password
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={(e) => {
                                            e.preventDefault();
                                            handleOpenChangePassword(user.user_id || user.id, user.email);
                                          }}
                                          className="flex items-center gap-2 cursor-pointer"
                                        >
                                          <Lock className="h-4 w-4" />
                                          Change Password
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <DropdownMenuItem
                                              className="text-destructive focus:text-destructive flex items-center gap-2 cursor-pointer"
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
                                                Are you sure you want to delete {user.email}? This action cannot be undone and will remove all associated data.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                               <AlertDialogAction
                                                 onClick={(e) => {
                                                   e.preventDefault();
                                                   handleDeleteUser(user.user_id || user.id, user.email);
                                                 }}
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

                <Tabs defaultValue="system-messages" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="system-messages">System Messages</TabsTrigger>
                    <TabsTrigger value="password-reset">Password Reset</TabsTrigger>
                    <TabsTrigger value="welcome-template">Welcome Template</TabsTrigger>
                  </TabsList>

                  {/* System Messages Subtab */}
                  <TabsContent value="system-messages" className="space-y-6">
                    <SystemMessageEditor />
                  </TabsContent>

                  {/* Password Reset Subtab */}
                  <TabsContent value="password-reset" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Password Reset Message</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Customize the message shown to users when their password is reset
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="password-reset-message">Password Reset Message</Label>
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

                  {/* Welcome Template Subtab */}
                  <TabsContent value="welcome-template" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Welcome Message for Approved Organizations</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Customize the welcome email sent to newly approved organizations
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="welcome-message">Welcome Message Template</Label>
                          <div className="mt-2">
                            <ReactQuill
                              theme="snow"
                              value={welcomeMessage}
                              onChange={setWelcomeMessage}
                              style={{ minHeight: '300px' }}
                            />
                          </div>
                        </div>
                        <Button 
                          onClick={handleSaveWelcomeMessage}
                          disabled={savingWelcomeMessage}
                        >
                          {savingWelcomeMessage ? "Saving..." : "Save Welcome Message"}
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>
                 </Tabs>
               </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default MasterDashboard;