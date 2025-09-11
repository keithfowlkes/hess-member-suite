import { useState, useEffect } from 'react';
import * as React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useMembers } from '@/hooks/useMembers';
import { useInvoices } from '@/hooks/useInvoices';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useResendInvoice } from '@/hooks/useResendInvoice';
import { useSystemSettings, useUpdateSystemSetting } from '@/hooks/useSystemSettings';
import { setupDefaultInvoiceTemplate } from '@/utils/setupDefaultInvoiceTemplate';
import { ProfessionalInvoice } from '@/components/ProfessionalInvoice';
import { InvoiceDialog } from '@/components/InvoiceDialog';
import { InvoiceTemplateEditor } from '@/components/InvoiceTemplateEditor';
import { PendingOrganizationsModal } from '@/components/PendingOrganizationsModal';
import { supabase } from '@/integrations/supabase/client';
import { 
  DollarSign, 
  Calendar as CalendarIcon, 
  Users, 
  TrendingUp, 
  FileText,
  Settings,
  Download,
  Send,
  CheckSquare,
  Eye,
  Plus,
  Search,
  Building2,
  ChevronDown,
  CheckCircle,
  Mail,
  Printer,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface FeesStats {
  totalOrganizations: number;
  totalRevenue: number;
  paidFees: number;
  pendingFees: number;
  overdueRenewals: number;
  averageFeeAmount: number;
}

export default function MembershipFees() {
  const { organizations, loading, updateOrganization, markAllOrganizationsActive } = useMembers();
  const { invoices, createInvoice, markAsPaid, sendInvoice, markAllInvoicesAsPaid } = useInvoices();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const resendInvoice = useResendInvoice();
  const { data: systemSettings } = useSystemSettings();
  const updateSystemSetting = useUpdateSystemSetting();
  
  // Fee management states
  const [bulkFeeAmount, setBulkFeeAmount] = useState<string>('');
  const [bulkRenewalDate, setBulkRenewalDate] = useState<Date>();
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedOrganizations, setSelectedOrganizations] = useState<Set<string>>(new Set());
  const [isSendingInvoices, setIsSendingInvoices] = useState(false);
  
  // Invoice management states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewOrganization, setPreviewOrganization] = useState(null);
  
  const [activeTab, setActiveTab] = useState("overview");

  // Test email states
  const [testEmailData, setTestEmailData] = useState({
    to: '',
    subject: 'HESS Consortium - Test Invoice',
    message: 'Please find attached your test membership invoice from the HESS Consortium.'
  });
  const [isTestEmailLoading, setIsTestEmailLoading] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{
    success: boolean;
    message: string;
    timestamp?: string;
    emailId?: string;
  } | null>(null);

  // Overdue modal states
  const [overdueModalOpen, setOverdueModalOpen] = useState(false);
  const [sendingReminders, setSendingReminders] = useState<Set<string>>(new Set());

  // Pending modal states
  const [pendingModalOpen, setPendingModalOpen] = useState(false);

  // Prorated fee states
  const [standardRenewalDate, setStandardRenewalDate] = useState<Date>(new Date(new Date().getFullYear(), 11, 31)); // Dec 31st by default
  const [proratedOrganizations, setProratedOrganizations] = useState<any[]>([]);
  const [updatingProrated, setUpdatingProrated] = useState<Set<string>>(new Set());

  // Fee tier states
  const [fullMemberFee, setFullMemberFee] = useState<string>('1000');
  const [affiliateMemberFee, setAffiliateMemberFee] = useState<string>('500');
  const [organizationFeeTiers, setOrganizationFeeTiers] = useState<Record<string, string>>({});
  const [additionalFeeTiers, setAdditionalFeeTiers] = useState<Array<{id: string, name: string, amount: string}>>([]);
  const [addTierModalOpen, setAddTierModalOpen] = useState(false);
  const [newTierName, setNewTierName] = useState('');
  const [newTierAmount, setNewTierAmount] = useState('');
  const [deleteTierConfirmOpen, setDeleteTierConfirmOpen] = useState(false);
  const [tierToDelete, setTierToDelete] = useState<string | null>(null);
  const [organizationSearchTerm, setOrganizationSearchTerm] = useState('');

  // Setup default invoice template with HESS logo on component mount
  React.useEffect(() => {
    setupDefaultInvoiceTemplate();
  }, []);

  // Load fee tier settings on mount
  React.useEffect(() => {
    if (systemSettings) {
      const fullFee = systemSettings.find(s => s.setting_key === 'full_member_fee')?.setting_value;
      const affiliateFee = systemSettings.find(s => s.setting_key === 'affiliate_member_fee')?.setting_value;
      const additionalTiers = systemSettings.find(s => s.setting_key === 'additional_fee_tiers')?.setting_value;
      
      if (fullFee) setFullMemberFee(fullFee);
      if (affiliateFee) setAffiliateMemberFee(affiliateFee);
      if (additionalTiers) {
        try {
          setAdditionalFeeTiers(JSON.parse(additionalTiers));
        } catch (error) {
          console.error('Error parsing additional fee tiers:', error);
        }
      }
    }
  }, [systemSettings]);

  // Create sample invoice data for preview
  const createSampleInvoice = (organization: any) => {
    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + 30);
    
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);

    return {
      id: `preview-${organization.id}`,
      organization_id: organization.id,
      invoice_number: `INV-PREVIEW-${Date.now()}`,
      amount: organization.annual_fee_amount || 1000,
      invoice_date: format(today, 'yyyy-MM-dd'),
      due_date: format(dueDate, 'yyyy-MM-dd'),
      period_start_date: format(periodStart, 'yyyy-MM-dd'),
      period_end_date: format(periodEnd, 'yyyy-MM-dd'),
      status: 'draft' as const,
      notes: `Annual membership fee for ${organization.name}`,
      created_at: today.toISOString(),
      updated_at: today.toISOString(),
      organizations: {
        id: organization.id,
        name: organization.name,
        email: organization.email,
        membership_status: organization.membership_status
      }
    };
  };

  // Calculate prorated fee based on membership start date
  const calculateProratedFee = (membershipStartDate: string, annualFee: number, renewalDate: Date): number => {
    const startDate = new Date(membershipStartDate);
    const endDate = new Date(renewalDate);
    
    // If start date is after renewal date, use next year's renewal date
    if (startDate > endDate) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    
    const totalDays = 365; // Standard year
    const remainingDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate prorated amount (minimum 25% of annual fee)
    const proratedAmount = Math.max((remainingDays / totalDays) * annualFee, annualFee * 0.25);
    
    return Math.round(proratedAmount);
  };

  // Get organizations that need prorated calculation
  const getOrganizationsNeedingProration = () => {
    const currentYear = new Date().getFullYear();
    const renewalYear = standardRenewalDate.getFullYear();
    
    return organizations.filter(org => {
      if (!org.membership_start_date || !org.annual_fee_amount) return false;
      
      const startDate = new Date(org.membership_start_date);
      const startYear = startDate.getFullYear();
      
      // Check if they joined mid-year (after January 1st)
      const yearStart = new Date(startYear, 0, 1);
      const isNewMember = startDate > yearStart;
      
      // Check if they joined in current renewal period
      const isCurrentPeriod = startYear === currentYear || startYear === renewalYear;
      
      return isNewMember && isCurrentPeriod;
    }).map(org => {
      const calculatedProrated = calculateProratedFee(
        org.membership_start_date!, 
        org.annual_fee_amount!, 
        standardRenewalDate
      );
      
      return {
        ...org,
        calculatedProratedFee: calculatedProrated,
        remainingDays: Math.ceil((standardRenewalDate.getTime() - new Date(org.membership_start_date!).getTime()) / (1000 * 60 * 60 * 24))
      };
    });
  };

  // Update prorated fee for an organization
  const updateProratedFee = async (organizationId: string, proratedAmount: number) => {
    setUpdatingProrated(prev => new Set([...prev, organizationId]));
    
    try {
      // Store prorated amount in state for now (could be saved to a separate table later)
      setProratedOrganizations(prev => {
        const existing = prev.find(p => p.id === organizationId);
        if (existing) {
          return prev.map(p => p.id === organizationId ? { ...p, proratedAmount } : p);
        } else {
          return [...prev, { id: organizationId, proratedAmount }];
        }
      });
      
      toast({
        title: "Success",
        description: "Prorated fee updated successfully."
      });
    } catch (error) {
      console.error('Error updating prorated fee:', error);
      toast({
        title: "Error",
        description: "Failed to update prorated fee.",
        variant: "destructive"
      });
    } finally {
      setUpdatingProrated(prev => {
        const newSet = new Set(prev);
        newSet.delete(organizationId);
        return newSet;
      });
    }
  };

  // Bulk apply calculated prorated fees
  const applyBulkProratedFees = async () => {
    const orgsNeedingProration = getOrganizationsNeedingProration();
    if (orgsNeedingProration.length === 0) return;
    
    setIsUpdating(true);
    try {
      // Store all prorated amounts in state
      const proratedData = orgsNeedingProration.map(org => ({
        id: org.id,
        proratedAmount: org.calculatedProratedFee
      }));
      
      setProratedOrganizations(proratedData);
      
      toast({
        title: "Success",
        description: `Applied prorated fees to ${orgsNeedingProration.length} organizations.`
      });
    } catch (error) {
      console.error('Error applying bulk prorated fees:', error);
      toast({
        title: "Error", 
        description: "Failed to apply prorated fees.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Get prorated amount for an organization
  const getProratedAmount = (organizationId: string): number | null => {
    const proratedOrg = proratedOrganizations.find(p => p.id === organizationId);
    return proratedOrg?.proratedAmount || null;
  };

  // Save fee tier settings
  const handleSaveFeeTiers = async () => {
    try {
      await updateSystemSetting.mutateAsync({
        settingKey: 'full_member_fee',
        settingValue: fullMemberFee,
        description: 'Annual fee amount for full members'
      });
      
      await updateSystemSetting.mutateAsync({
        settingKey: 'affiliate_member_fee', 
        settingValue: affiliateMemberFee,
        description: 'Annual fee amount for affiliate members'
      });

      if (additionalFeeTiers.length > 0) {
        await updateSystemSetting.mutateAsync({
          settingKey: 'additional_fee_tiers',
          settingValue: JSON.stringify(additionalFeeTiers),
          description: 'Additional custom fee tiers'
        });
      }

      toast({
        title: "Success",
        description: "Fee tier pricing updated successfully."
      });
    } catch (error) {
      console.error('Error saving fee tiers:', error);
      toast({
        title: "Error",
        description: "Failed to save fee tier pricing.",
        variant: "destructive"
      });
    }
  };

  // Set organization fee tier
  const setOrganizationFeeTier = (organizationId: string, tier: string) => {
    setOrganizationFeeTiers(prev => ({
      ...prev,
      [organizationId]: tier
    }));
  };

  // Get fee amount for tier
  const getFeeAmountForTier = (tier: string): number => {
    if (tier === 'full') return parseFloat(fullMemberFee);
    if (tier === 'affiliate') return parseFloat(affiliateMemberFee);
    
    const additionalTier = additionalFeeTiers.find(t => t.id === tier);
    return additionalTier ? parseFloat(additionalTier.amount) : 0;
  };

  // Add new fee tier
  const handleAddFeeTier = () => {
    if (!newTierName || !newTierAmount) {
      toast({
        title: "Invalid Input",
        description: "Please provide both tier name and amount.",
        variant: "destructive"
      });
      return;
    }

    const newTier = {
      id: `custom_${Date.now()}`,
      name: newTierName,
      amount: newTierAmount
    };

    setAdditionalFeeTiers(prev => [...prev, newTier]);
    setNewTierName('');
    setNewTierAmount('');
    setAddTierModalOpen(false);
    
    toast({
      title: "Success",
      description: `Fee tier "${newTierName}" added successfully.`
    });
  };

  // Remove fee tier
  const handleRemoveFeeTier = (tierId: string) => {
    setAdditionalFeeTiers(prev => prev.filter(tier => tier.id !== tierId));
    // Remove tier assignments for this tier
    setOrganizationFeeTiers(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(orgId => {
        if (updated[orgId] === tierId) {
          delete updated[orgId];
        }
      });
      return updated;
    });
    
    toast({
      title: "Success",
      description: "Fee tier deleted successfully."
    });
  };

  // Confirm delete fee tier
  const confirmDeleteFeeTier = (tierId: string) => {
    setTierToDelete(tierId);
    setDeleteTierConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (tierToDelete) {
      handleRemoveFeeTier(tierToDelete);
      setTierToDelete(null);
      setDeleteTierConfirmOpen(false);
    }
  };

  // Get tier display name
  const getTierDisplayName = (tier: string): string => {
    if (tier === 'full') return 'Full Member';
    if (tier === 'affiliate') return 'Affiliate';
    
    const additionalTier = additionalFeeTiers.find(t => t.id === tier);
    return additionalTier ? additionalTier.name : 'Unknown Tier';
  };

  // Filter organizations based on search term
  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(organizationSearchTerm.toLowerCase()) ||
    org.email?.toLowerCase().includes(organizationSearchTerm.toLowerCase()) ||
    org.membership_status.toLowerCase().includes(organizationSearchTerm.toLowerCase())
  );

  // Calculate fee statistics
  const calculateStats = (): FeesStats => {
    const total = organizations.length;
    const totalRevenue = organizations.reduce((sum, org) => sum + (parseFloat(org.annual_fee_amount?.toString() || '0')), 0);
    const paid = organizations.filter(org => org.membership_status === 'active').length;
    const pending = organizations.filter(org => org.membership_status === 'pending').length;
    const overdue = organizations.filter(org => {
      if (!org.membership_end_date) return false;
      return new Date(org.membership_end_date) < new Date() && org.membership_status !== 'active';
    }).length;
    
    // Calculate average fee only for organizations with fee amounts set
    const orgsWithFees = organizations.filter(org => org.annual_fee_amount && org.annual_fee_amount > 0);
    const averageFee = orgsWithFees.length > 0 ? totalRevenue / orgsWithFees.length : 0;

    return {
      totalOrganizations: total,
      totalRevenue,
      paidFees: paid,
      pendingFees: pending,
      overdueRenewals: overdue,
      averageFeeAmount: averageFee
    };
  };

  const stats = calculateStats();

  // Get overdue organizations
  const overdueOrganizations = organizations.filter(org => {
    if (!org.membership_end_date) return false;
    return new Date(org.membership_end_date) < new Date() && org.membership_status !== 'active';
  });

  // Get organizations with their payment status
  const getPaymentStatus = (organizationId: string) => {
    const orgInvoices = invoices.filter(inv => inv.organization_id === organizationId);
    if (orgInvoices.length === 0) return 'pending';
    
    const latestInvoice = orgInvoices.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    return latestInvoice.status === 'paid' ? 'paid' : 'pending';
  };

  // Filter invoices for search
  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.organizations?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'active': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'sent': return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'overdue': return 'bg-red-500/10 text-red-700 border-red-200';
      case 'cancelled': return 'bg-gray-500/10 text-gray-700 border-gray-200';
      case 'draft': return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'pending': return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'expired': return 'bg-red-500/10 text-red-700 border-red-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const handleBulkUpdate = async () => {
    if (!bulkFeeAmount && !bulkRenewalDate) {
      toast({
        title: "Invalid Input",
        description: "Please provide either a fee amount or renewal date.",
        variant: "destructive"
      });
      return;
    }

    setIsUpdating(true);
    try {
      const updates = [];
      
      for (const org of organizations) {
        const updateData: any = {};
        
        if (bulkFeeAmount) {
          updateData.annual_fee_amount = parseFloat(bulkFeeAmount);
        }
        
        if (bulkRenewalDate) {
          updateData.membership_end_date = format(bulkRenewalDate, 'yyyy-MM-dd');
          // Also set start date to one year before if not set
          if (!org.membership_start_date) {
            const startDate = new Date(bulkRenewalDate);
            startDate.setFullYear(startDate.getFullYear() - 1);
            updateData.membership_start_date = format(startDate, 'yyyy-MM-dd');
          }
        }
        
        updates.push(updateOrganization(org.id, updateData));
      }
      
      await Promise.all(updates);
      
      toast({
        title: "Success",
        description: `Updated ${organizations.length} organization${organizations.length !== 1 ? 's' : ''}.`
      });
      
      setBulkFeeAmount('');
      setBulkRenewalDate(undefined);
    } catch (error) {
      console.error('Error updating organizations:', error);
      toast({
        title: "Error",
        description: "Failed to update organizations. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrganizations(new Set(organizations.map(org => org.id)));
    } else {
      setSelectedOrganizations(new Set());
    }
  };

  const handleSelectOrganization = (organizationId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrganizations);
    if (checked) {
      newSelected.add(organizationId);
    } else {
      newSelected.delete(organizationId);
    }
    setSelectedOrganizations(newSelected);
  };

  const handleSendSelectedInvoices = async () => {
    if (selectedOrganizations.size === 0) {
      toast({
        title: "No organizations selected",
        description: "Please select organizations to send invoices to.",
        variant: "destructive"
      });
      return;
    }

    setIsSendingInvoices(true);
    try {
      const today = new Date();
      const dueDate = new Date();
      dueDate.setDate(today.getDate() + 30); // 30 days from now

      const periodStart = new Date();
      const periodEnd = new Date();
      periodEnd.setFullYear(periodEnd.getFullYear() + 1); // 1 year period

      let successCount = 0;
      let errorCount = 0;

      for (const organizationId of selectedOrganizations) {
        try {
          const organization = organizations.find(org => org.id === organizationId);
          if (!organization) continue;

          // Check if there's a prorated amount set for this organization
          const proratedAmount = getProratedAmount(organizationId);
          // Check if organization has a specific fee tier set
          const feeTier = organizationFeeTiers[organizationId];
          const tierAmount = feeTier ? getFeeAmountForTier(feeTier) : null;
          const invoiceAmount = proratedAmount || tierAmount || organization.annual_fee_amount || 1000;

          await createInvoice({
            organization_id: organizationId,
            amount: invoiceAmount,
            prorated_amount: proratedAmount,
            due_date: format(dueDate, 'yyyy-MM-dd'),
            period_start_date: format(periodStart, 'yyyy-MM-dd'),
            period_end_date: format(periodEnd, 'yyyy-MM-dd'),
            notes: proratedAmount 
              ? `Prorated membership fee for ${organization.name} (${Math.round((proratedAmount / (organization.annual_fee_amount || 1000)) * 100)}% of annual fee)`
              : `Annual membership fee for ${organization.name}`
          });

          successCount++;
        } catch (error) {
          console.error(`Failed to create invoice for organization ${organizationId}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Invoices created successfully",
          description: `${successCount} invoice${successCount !== 1 ? 's' : ''} created successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}.`
        });
      }

      if (errorCount > 0 && successCount === 0) {
        toast({
          title: "Failed to create invoices",
          description: "All invoice creation attempts failed. Please try again.",
          variant: "destructive"
        });
      }

      // Clear selection after sending
      setSelectedOrganizations(new Set());
    } catch (error) {
      console.error('Error creating invoices:', error);
      toast({
        title: "Error",
        description: "Failed to create invoices. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSendingInvoices(false);
    }
  };

  const handleMarkAsPaid = async (invoiceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await markAsPaid(invoiceId);
  };

  const handleSendInvoice = async (invoiceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await sendInvoice(invoiceId);
  };

  const handleResendInvoice = async (invoiceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    resendInvoice.mutate({ invoiceId });
  };

  // Test email function
  const handleSendTestInvoice = async () => {
    if (!testEmailData.to.trim()) {
      toast({
        title: 'Email Required',
        description: 'Please enter an email address to send the test invoice to.',
        variant: 'destructive',
      });
      return;
    }

    setIsTestEmailLoading(true);
    setTestEmailResult(null);

    try {
      // Create dummy organization and invoice data
      const dummyOrg = {
        id: 'test-org-123',
        name: 'Test University',
        email: testEmailData.to.trim(),
        annual_fee_amount: 1000,
        membership_status: 'active' as const,
        membership_start_date: format(new Date(), 'yyyy-MM-dd'),
        membership_end_date: format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
      };

      const dummyInvoice = createSampleInvoice(dummyOrg);

      // Generate HTML content for the invoice
      const invoiceHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #6b7280; padding-bottom: 20px;">
            <h1 style="color: #6b7280; margin: 0; font-size: 2.5rem;">INVOICE</h1>
            <p style="color: #666; margin: 10px 0;">#${dummyInvoice.invoice_number}</p>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
            <div>
              <h3 style="color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Bill To:</h3>
              <p><strong>${dummyOrg.name}</strong></p>
              <p>Organization Address</p>
              <p>${dummyOrg.email}</p>
            </div>
            <div>
              <h3 style="color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Invoice Details:</h3>
              <p><strong>Invoice Date:</strong> ${format(new Date(dummyInvoice.invoice_date), 'MMM dd, yyyy')}</p>
              <p><strong>Due Date:</strong> ${format(new Date(dummyInvoice.due_date), 'MMM dd, yyyy')}</p>
              <p><strong>Period:</strong> ${format(new Date(dummyInvoice.period_start_date), 'MMM dd, yyyy')} - ${format(new Date(dummyInvoice.period_end_date), 'MMM dd, yyyy')}</p>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin: 30px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <thead>
              <tr style="background: linear-gradient(135deg, #6b7280, #4b5563);">
                <th style="color: white; padding: 15px; text-align: left; font-weight: 600;">Description</th>
                <th style="color: white; padding: 15px; text-align: left; font-weight: 600;">Period</th>
                <th style="color: white; padding: 15px; text-align: right; font-weight: 600;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 15px; border-bottom: 1px solid #e5e7eb;">
                  <strong>Annual Membership Fee</strong>
                </td>
                <td style="padding: 15px; border-bottom: 1px solid #e5e7eb;">
                  ${format(new Date(dummyInvoice.period_start_date), 'MMM dd, yyyy')} - ${format(new Date(dummyInvoice.period_end_date), 'MMM dd, yyyy')}
                </td>
                <td style="padding: 15px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
                  $${dummyInvoice.amount.toLocaleString()}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr style="background: #f8fafc; font-weight: bold; font-size: 1.1rem;">
                <td colspan="2" style="padding: 15px;"><strong>Total Due:</strong></td>
                <td style="padding: 15px; text-align: right;">
                  <strong>$${dummyInvoice.amount.toLocaleString()}</strong>
                </td>
              </tr>
            </tfoot>
          </table>

          <div style="background: #f9fafb; padding: 20px; border-left: 4px solid #6b7280; margin: 30px 0;">
            <h3 style="color: #6b7280; margin-bottom: 10px;">Payment Information</h3>
            <p>Please remit payment within 30 days of the invoice date.</p>
            <p><strong>Contact:</strong> billing@hessconsortium.org</p>
          </div>

          <div style="text-align: center; padding: 15px; background: #f8fafc; border-radius: 8px; margin-top: 30px;">
            <p style="color: #666; margin: 0;">Thank you for your membership in the HESS Consortium!</p>
          </div>
        </div>
      `;

      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Test Invoice from HESS Consortium</h2>
          <p>${testEmailData.message}</p>
          <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 8px;">
            <p><strong>This is a test email.</strong> Below is a sample invoice for demonstration purposes.</p>
          </div>
          ${invoiceHtml}
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
          <p style="color: #999; font-size: 12px; text-align: center;">
            This is a test email from the HESS Consortium system.
          </p>
        </div>
      `;

      const { data, error } = await supabase.functions.invoke('test-email', {
        body: {
          to: testEmailData.to.trim(),
          subject: testEmailData.subject.trim() || 'HESS Consortium - Test Invoice',
          message: emailContent
        }
      });

      if (error) {
        console.error('Test invoice email error:', error);
        setTestEmailResult({
          success: false,
          message: error.message || 'Failed to send test invoice'
        });
        toast({
          title: 'Test Invoice Failed',
          description: error.message || 'Failed to send test invoice',
          variant: 'destructive',
        });
      } else {
        setTestEmailResult({
          success: true,
          message: data.message || 'Test invoice sent successfully',
          timestamp: data.timestamp,
          emailId: data.emailId
        });

        toast({
          title: 'Test Invoice Sent',
          description: `Test invoice sent to ${testEmailData.to}`,
        });
      }
    } catch (error: any) {
      console.error('Test invoice email error:', error);
      setTestEmailResult({
        success: false,
        message: error.message || 'An unexpected error occurred'
      });
      toast({
        title: 'Test Invoice Failed',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsTestEmailLoading(false);
    }
  };

  // Send overdue reminder
  const handleSendOverdueReminder = async (organization: any) => {
    setSendingReminders(prev => new Set([...prev, organization.id]));
    
    try {
      // Find the latest invoice for this organization
      const orgInvoices = invoices.filter(inv => inv.organization_id === organization.id);
      const latestInvoice = orgInvoices.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      const { data, error } = await supabase.functions.invoke('organization-emails', {
        body: {
          type: 'overdue_reminder',
          to: organization.email,
          organizationName: organization.name,
          invoiceData: latestInvoice ? {
            invoice_number: latestInvoice.invoice_number,
            amount: latestInvoice.amount,
            due_date: latestInvoice.due_date
          } : null
        }
      });

      if (error) throw error;

      toast({
        title: 'Reminder sent',
        description: `Overdue payment reminder sent to ${organization.name}`,
      });
    } catch (error: any) {
      console.error('Error sending reminder:', error);
      toast({
        title: 'Failed to send reminder',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSendingReminders(prev => {
        const newSet = new Set(prev);
        newSet.delete(organization.id);
        return newSet;
      });
    }
  };

  // Print overdue list
  const handlePrintOverdueList = () => {
    const printContent = `
      <html>
        <head>
          <title>Overdue Organizations Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .overdue { color: #dc2626; font-weight: bold; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <h1>Overdue Organizations Report</h1>
          <p>Generated on: ${format(new Date(), 'PPP')}</p>
          <p>Total overdue organizations: ${overdueOrganizations.length}</p>
          
          <table>
            <thead>
              <tr>
                <th>Organization Name</th>
                <th>Email</th>
                <th>Membership End Date</th>
                <th>Annual Fee</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${overdueOrganizations.map(org => `
                <tr>
                  <td>${org.name}</td>
                  <td>${org.email || 'N/A'}</td>
                  <td class="overdue">${org.membership_end_date ? format(new Date(org.membership_end_date), 'MMM dd, yyyy') : 'N/A'}</td>
                  <td>$${org.annual_fee_amount?.toLocaleString() || '0'}</td>
                  <td class="overdue">${org.membership_status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>HESS Consortium - Membership Fee Management System</p>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const generatePDFReport = () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    
    // Title
    pdf.setFontSize(20);
    pdf.text('Membership Fees Report', pageWidth / 2, 20, { align: 'center' });
    
    // Report date
    pdf.setFontSize(10);
    pdf.text(`Generated on: ${format(new Date(), 'MMMM dd, yyyy')}`, pageWidth / 2, 30, { align: 'center' });
    
    // Summary statistics
    pdf.setFontSize(14);
    pdf.text('Summary Statistics', 20, 50);
    
    const summaryData = [
      ['Total Organizations', stats.totalOrganizations.toString()],
      ['Total Annual Revenue', `$${stats.totalRevenue.toLocaleString()}`],
      ['Active Memberships', stats.paidFees.toString()],
      ['Pending Memberships', stats.pendingFees.toString()],
      ['Overdue Renewals', stats.overdueRenewals.toString()],
      ['Average Fee Amount', `$${stats.averageFeeAmount.toLocaleString()}`]
    ];
    
    (pdf as any).autoTable({
      head: [['Metric', 'Value']],
      body: summaryData,
      startY: 60,
      theme: 'striped',
      headStyles: { fillColor: [66, 139, 202] }
    });
    
    // Detailed organization data
    const finalY = (pdf as any).lastAutoTable.finalY + 20;
    pdf.setFontSize(14);
    pdf.text('Organization Details', 20, finalY);
    
    const organizationData = organizations.map(org => [
      org.name,
      org.membership_status,
      `$${org.annual_fee_amount || 0}`,
      org.membership_start_date || 'Not set',
      org.membership_end_date || 'Not set'
    ]);
    
    (pdf as any).autoTable({
      head: [['Organization', 'Status', 'Annual Fee', 'Start Date', 'End Date']],
      body: organizationData,
      startY: finalY + 10,
      theme: 'striped',
      headStyles: { fillColor: [66, 139, 202] }
    });
    
    pdf.save('membership-fees-report.pdf');
  };

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
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Membership Fees & Invoices</h1>
                <p className="text-muted-foreground mt-2">
                  Manage membership fees, generate invoices, and track payment status
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={generatePDFReport}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setTemplateEditorOpen(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Invoice Templates
                </Button>
              </div>
            </div>

            {/* Stats Overview */}
            {/* Redesigned Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
              {/* Organizations Card */}
              <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-blue-100/50 hover:shadow-md hover:shadow-blue-100/20 transition-all duration-300 hover:scale-105 group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/10"></div>
                <CardContent className="relative p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-xs font-medium text-blue-600/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Total Count
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-gray-900 mb-1">{stats.totalOrganizations}</div>
                    <div className="text-xs font-medium text-blue-600">Organizations</div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Revenue Card */}
              <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-green-50 border-emerald-100/50 hover:shadow-md hover:shadow-emerald-100/20 transition-all duration-300 hover:scale-105 group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/10"></div>
                <CardContent className="relative p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg shadow-md">
                      <DollarSign className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-xs font-medium text-emerald-600/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Annual Total
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-gray-900 mb-1">${stats.totalRevenue.toLocaleString()}</div>
                    <div className="text-xs font-medium text-emerald-600">Total Revenue</div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Active Card */}
              <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 via-white to-emerald-50 border-green-100/50 hover:shadow-md hover:shadow-green-100/20 transition-all duration-300 hover:scale-105 group">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/10"></div>
                <CardContent className="relative p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-md">
                      <CheckSquare className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-xs font-medium text-green-600/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Paid Members
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-green-700 mb-1">{stats.paidFees}</div>
                    <div className="text-xs font-medium text-green-600">Active</div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Pending Card */}
              <Card 
                className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-yellow-50 border-amber-100/50 hover:shadow-md hover:shadow-amber-100/20 transition-all duration-300 hover:scale-105 group cursor-pointer"
                onClick={() => setPendingModalOpen(true)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-yellow-500/10"></div>
                <CardContent className="relative p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-lg shadow-md">
                      <TrendingUp className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-xs font-medium text-amber-600/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Click to View
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-amber-700 mb-1">{stats.pendingFees}</div>
                    <div className="text-xs font-medium text-amber-600">Pending</div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Overdue Card */}
              <Card 
                className="relative overflow-hidden bg-gradient-to-br from-red-50 via-white to-rose-50 border-red-100/50 hover:shadow-md hover:shadow-red-100/20 transition-all duration-300 hover:scale-105 group cursor-pointer"
                onClick={() => setOverdueModalOpen(true)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-rose-500/10"></div>
                <CardContent className="relative p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg shadow-md">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-xs font-medium text-red-600/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Click to View
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-red-700 mb-1">{stats.overdueRenewals}</div>
                    <div className="text-xs font-medium text-red-600">Overdue</div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Average Fee Card */}
              <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-white to-violet-50 border-purple-100/50 hover:shadow-md hover:shadow-purple-100/20 transition-all duration-300 hover:scale-105 group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-violet-500/10"></div>
                <CardContent className="relative p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg shadow-md">
                      <DollarSign className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-xs font-medium text-purple-600/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Per Member
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-gray-900 mb-1">${stats.averageFeeAmount.toLocaleString()}</div>
                    <div className="text-xs font-medium text-purple-600">Average Fee</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="invoices">Invoices</TabsTrigger>
                <TabsTrigger value="management">Fee Management</TabsTrigger>
                <TabsTrigger value="prorated">Prorated Fees</TabsTrigger>
                <TabsTrigger value="testing">Testing</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                {/* Annual Fee Tier Pricing Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Annual Fee Tier Pricing
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="full-member-fee">Full Member Fee ($)</Label>
                          <Input
                            id="full-member-fee"
                            type="number"
                            placeholder="e.g., 1000"
                            value={fullMemberFee}
                            onChange={(e) => setFullMemberFee(e.target.value)}
                          />
                          <p className="text-sm text-muted-foreground">
                            Annual fee for full consortium members
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="affiliate-member-fee">Affiliate Member Fee ($)</Label>
                          <Input
                            id="affiliate-member-fee"
                            type="number"
                            placeholder="e.g., 500"
                            value={affiliateMemberFee}
                            onChange={(e) => setAffiliateMemberFee(e.target.value)}
                          />
                          <p className="text-sm text-muted-foreground">
                            Annual fee for affiliate members
                          </p>
                        </div>
                      </div>

                      {/* Additional Fee Tiers */}
                      {additionalFeeTiers.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">Additional Fee Tiers</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {additionalFeeTiers.map((tier) => (
                              <div key={tier.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{tier.name}</div>
                                  <div className="text-sm text-muted-foreground">${parseFloat(tier.amount).toLocaleString()}</div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => confirmDeleteFeeTier(tier.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center pt-4 border-t">
                        <Button 
                          variant="outline"
                          onClick={() => setAddTierModalOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Fee Tier
                        </Button>
                        <Button 
                          onClick={handleSaveFeeTiers}
                          disabled={updateSystemSetting.isPending}
                        >
                          {updateSystemSetting.isPending ? "Saving..." : "Save Fee Tiers"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Fee Update Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Bulk Fee Updates
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="bulk-fee">Annual Fee Amount ($)</Label>
                        <Input
                          id="bulk-fee"
                          type="number"
                          placeholder="e.g., 1000"
                          value={bulkFeeAmount}
                          onChange={(e) => setBulkFeeAmount(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Renewal Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !bulkRenewalDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {bulkRenewalDate ? format(bulkRenewalDate, "PPP") : "Select renewal date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={bulkRenewalDate}
                              onSelect={setBulkRenewalDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <Button 
                        onClick={handleBulkUpdate} 
                        disabled={isUpdating || (!bulkFeeAmount && !bulkRenewalDate)}
                        className="w-full"
                      >
                        {isUpdating ? "Updating..." : "Update All Organizations"}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full">
                              <Plus className="h-4 w-4 mr-2" />
                              Create Invoice
                              <ChevronDown className="h-4 w-4 ml-2" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-full">
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedInvoice(null);
                                setBulkMode(false);
                                setDialogOpen(true);
                              }}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Individual Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedInvoice(null);
                                setBulkMode(true);
                                setDialogOpen(true);
                              }}
                            >
                              <Users className="h-4 w-4 mr-2" />
                              Bulk for All Organizations
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                          variant="outline"
                          onClick={markAllOrganizationsActive}
                          className="w-full"
                        >
                          <Building2 className="h-4 w-4 mr-2" />
                          Mark All Organizations Active
                        </Button>

                        <Button
                          variant="outline"
                          onClick={markAllInvoicesAsPaid}
                          className="w-full"
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Mark All Invoices Paid
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="invoices">
                <div className="space-y-6">
                  {/* Search and Filters */}
                  <div className="flex gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search invoices..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Invoices List */}
                  <div className="space-y-4">
                    {filteredInvoices.map((invoice) => (
                      <Card 
                        key={invoice.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setBulkMode(false);
                          setDialogOpen(true);
                        }}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <FileText className="h-8 w-8 text-primary" />
                              <div>
                                <div className="flex items-center space-x-2">
                                  <h3 className="font-semibold text-lg">{invoice.invoice_number}</h3>
                                  <Badge className={getStatusColor(invoice.status)}>
                                    {invoice.status}
                                  </Badge>
                                </div>
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                                  {invoice.organizations && (
                                    <div className="flex items-center">
                                      <Building2 className="h-4 w-4 mr-1" />
                                      {invoice.organizations.name}
                                    </div>
                                  )}
                                  <div className="flex items-center">
                                    <CalendarIcon className="h-4 w-4 mr-1" />
                                    Due: {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <div className="flex items-center text-2xl font-bold">
                                  <DollarSign className="h-5 w-5" />
                                  {invoice.prorated_amount ? invoice.prorated_amount.toLocaleString() : invoice.amount.toLocaleString()}
                                </div>
                                {invoice.prorated_amount && (
                                  <div className="text-sm text-muted-foreground line-through">
                                    ${invoice.amount.toLocaleString()}
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex space-x-2">
                                {invoice.status === 'draft' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => handleSendInvoice(invoice.id, e)}
                                  >
                                    <Send className="h-4 w-4 mr-1" />
                                    Send
                                  </Button>
                                )}
                                {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => handleResendInvoice(invoice.id, e)}
                                      disabled={resendInvoice.isPending}
                                    >
                                      <Mail className="h-4 w-4 mr-1" />
                                      Send Again
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={(e) => handleMarkAsPaid(invoice.id, e)}
                                    >
                                      <DollarSign className="h-4 w-4 mr-1" />
                                      Mark Paid
                                    </Button>
                                  </>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedInvoice(invoice);
                                    setBulkMode(false);
                                    setDialogOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          {invoice.notes && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-sm text-muted-foreground">{invoice.notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {filteredInvoices.length === 0 && (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground">No invoices found</h3>
                      <p className="text-muted-foreground">
                        Try adjusting your search or create a new invoice.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="management">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Send className="h-5 w-5" />
                      Generate Invoices for Selected Organizations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Search Field */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search organizations by name, email, or status..."
                        value={organizationSearchTerm}
                        onChange={(e) => setOrganizationSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="selectAll"
                          checked={selectedOrganizations.size === filteredOrganizations.length && filteredOrganizations.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedOrganizations(new Set(filteredOrganizations.map(org => org.id)));
                            } else {
                              setSelectedOrganizations(new Set());
                            }
                          }}
                        />
                        <Label htmlFor="selectAll" className="text-sm font-medium">
                          Select All Organizations ({filteredOrganizations.length}{organizationSearchTerm && ` of ${organizations.length}`})
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Label className="text-sm font-medium">Set Fee Tier for Selected:</Label>
                        <DropdownMenu key={`fee-tiers-${additionalFeeTiers.length}-${fullMemberFee}-${affiliateMemberFee}`}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" disabled={selectedOrganizations.size === 0}>
                              Set Fee Tier
                              <ChevronDown className="h-4 w-4 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => {
                              const newTiers = { ...organizationFeeTiers };
                              selectedOrganizations.forEach(orgId => {
                                newTiers[orgId] = 'full';
                              });
                              setOrganizationFeeTiers(newTiers);
                            }}>
                              Full Member (${fullMemberFee})
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              const newTiers = { ...organizationFeeTiers };
                              selectedOrganizations.forEach(orgId => {
                                newTiers[orgId] = 'affiliate';
                              });
                              setOrganizationFeeTiers(newTiers);
                            }}>
                              Affiliate (${affiliateMemberFee})
                            </DropdownMenuItem>
                            {additionalFeeTiers.map((tier) => (
                              <DropdownMenuItem 
                                key={tier.id}
                                onClick={() => {
                                  const newTiers = { ...organizationFeeTiers };
                                  selectedOrganizations.forEach(orgId => {
                                    newTiers[orgId] = tier.id;
                                  });
                                  setOrganizationFeeTiers(newTiers);
                                }}
                              >
                                {tier.name} (${parseFloat(tier.amount).toLocaleString()})
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-4">
                      <div className="grid grid-cols-12 gap-2 p-2 font-medium text-sm text-muted-foreground border-b">
                        <div className="col-span-1"></div>
                        <div className="col-span-4">Organization</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2">Current Fee</div>
                        <div className="col-span-2">Assigned Tier</div>
                        <div className="col-span-1">Payment Status</div>
                      </div>
                      {filteredOrganizations.map((org) => (
                        <div key={org.id} className="grid grid-cols-12 gap-2 items-center p-2 hover:bg-gray-50 rounded">
                          <div className="col-span-1">
                            <Checkbox
                              id={`org-${org.id}`}
                              checked={selectedOrganizations.has(org.id)}
                              onCheckedChange={(checked) => handleSelectOrganization(org.id, checked as boolean)}
                            />
                          </div>
                          <div className="col-span-4">
                            <Label htmlFor={`org-${org.id}`} className="text-sm cursor-pointer">
                              {org.name}
                            </Label>
                          </div>
                          <div className="col-span-2">
                            <Badge className={getStatusColor(org.membership_status)}>
                              {org.membership_status}
                            </Badge>
                          </div>
                          <div className="col-span-2">
                            <span className="text-sm">
                              ${organizationFeeTiers[org.id] ? 
                                getFeeAmountForTier(organizationFeeTiers[org.id]).toLocaleString() : 
                                (org.annual_fee_amount?.toLocaleString() || '1,000')}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <Badge variant={organizationFeeTiers[org.id] ? "default" : "secondary"} className="text-xs">
                              {organizationFeeTiers[org.id] ? getTierDisplayName(organizationFeeTiers[org.id]) : 'No Tier Set'}
                            </Badge>
                          </div>
                          <div className="col-span-1">
                            <Badge className={getStatusColor(getPaymentStatus(org.id))}>
                              {getPaymentStatus(org.id)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-between items-center pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        {selectedOrganizations.size} organization{selectedOrganizations.size !== 1 ? 's' : ''} selected
                        {organizationSearchTerm && ` (${filteredOrganizations.length} shown of ${organizations.length} total)`}
                      </p>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline"
                          onClick={() => {
                            if (selectedOrganizations.size > 0) {
                              const firstOrgId = Array.from(selectedOrganizations)[0];
                              const org = organizations.find(o => o.id === firstOrgId);
                              if (org) {
                                setPreviewOrganization(org);
                                setPreviewDialogOpen(true);
                              }
                            }
                          }}
                          disabled={selectedOrganizations.size === 0}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview Invoice
                        </Button>
                        <Button 
                          onClick={handleSendSelectedInvoices}
                          disabled={selectedOrganizations.size === 0 || isSendingInvoices}
                        >
                          {isSendingInvoices ? "Creating Invoices..." : "Create Selected Invoices"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="prorated">
                <div className="space-y-6">
                  {/* Standard Renewal Date Setting */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5" />
                        Standard Renewal Date Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Standard Annual Renewal Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal max-w-sm",
                                !standardRenewalDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {standardRenewalDate ? format(standardRenewalDate, "PPP") : "Select renewal date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={standardRenewalDate}
                              onSelect={(date) => date && setStandardRenewalDate(date)}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <p className="text-sm text-muted-foreground">
                          This date is used to calculate prorated fees for organizations that join mid-year.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Organizations Needing Prorated Fees */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Organizations Needing Prorated Fees
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {(() => {
                        const orgsNeedingProration = getOrganizationsNeedingProration();
                        
                        if (orgsNeedingProration.length === 0) {
                          return (
                            <div className="text-center py-12">
                              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                              <h3 className="text-lg font-medium text-muted-foreground">No organizations need proration</h3>
                              <p className="text-muted-foreground">
                                All organizations have full-year memberships or no start dates set.
                              </p>
                            </div>
                          );
                        }

                        return (
                          <>
                            <div className="flex justify-between items-center">
                              <p className="text-sm text-muted-foreground">
                                {orgsNeedingProration.length} organization{orgsNeedingProration.length !== 1 ? 's' : ''} need prorated fee calculation
                              </p>
                              <Button 
                                onClick={applyBulkProratedFees}
                                disabled={isUpdating}
                                variant="outline"
                              >
                                {isUpdating ? "Applying..." : "Apply All Calculated Fees"}
                              </Button>
                            </div>
                            
                            <div className="space-y-4">
                              <div className="grid grid-cols-12 gap-2 p-3 font-medium text-sm text-muted-foreground border-b">
                                <div className="col-span-3">Organization</div>
                                <div className="col-span-2">Start Date</div>
                                <div className="col-span-2">Days Remaining</div>
                                <div className="col-span-2">Annual Fee</div>
                                <div className="col-span-2">Calculated Prorated</div>
                                <div className="col-span-1">Actions</div>
                              </div>
                              
                              {orgsNeedingProration.map((org) => {
                                const customProrated = getProratedAmount(org.id);
                                return (
                                  <div key={org.id} className="grid grid-cols-12 gap-2 items-center p-3 border rounded-lg hover:bg-gray-50">
                                    <div className="col-span-3">
                                      <div>
                                        <p className="font-medium">{org.name}</p>
                                        <Badge className={getStatusColor(org.membership_status)}>
                                          {org.membership_status}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-sm">
                                        {format(new Date(org.membership_start_date!), 'MMM dd, yyyy')}
                                      </span>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-sm">
                                        {org.remainingDays} days
                                      </span>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-sm font-medium">
                                        ${org.annual_fee_amount?.toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="col-span-2">
                                      <div className="space-y-1">
                                        <div className="text-sm font-medium text-green-600">
                                          ${(customProrated || org.calculatedProratedFee).toLocaleString()}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {Math.round(((customProrated || org.calculatedProratedFee) / org.annual_fee_amount!) * 100)}% of annual
                                        </div>
                                      </div>
                                    </div>
                                    <div className="col-span-1">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button 
                                            variant="ghost" 
                                            size="sm"
                                            disabled={updatingProrated.has(org.id)}
                                          >
                                            <ChevronDown className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem 
                                            onClick={() => {
                                              const newAmount = prompt(
                                                `Enter custom prorated amount for ${org.name}:`,
                                                (customProrated || org.calculatedProratedFee).toString()
                                              );
                                              if (newAmount && !isNaN(Number(newAmount))) {
                                                updateProratedFee(org.id, Number(newAmount));
                                              }
                                            }}
                                          >
                                            Set Custom Amount
                                          </DropdownMenuItem>
                                          <DropdownMenuItem 
                                            onClick={() => updateProratedFee(org.id, org.calculatedProratedFee)}
                                          >
                                            Use Calculated Amount
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  {/* Prorated Fee Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        How Prorated Fees Work
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>
                          <strong>Prorated fees</strong> are calculated for organizations that join after the membership year has started.
                        </p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>Fees are calculated based on the remaining days until the standard renewal date</li>
                          <li>Organizations pay for the portion of the year they'll be members</li>
                          <li>Minimum fee is 25% of the annual amount</li>
                          <li>Custom amounts can be set for special circumstances</li>
                        </ul>
                        <p>
                          <strong>Example:</strong> If an organization joins 6 months into the membership year, 
                          they would pay approximately 50% of the annual fee.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="testing">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Send className="h-5 w-5" />
                      Test Invoice Email
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="test-email">Test Email Address</Label>
                      <Input
                        id="test-email"
                        type="email"
                        placeholder="test@example.com"
                        value={testEmailData.to}
                        onChange={(e) => setTestEmailData(prev => ({ ...prev, to: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="test-subject">Subject</Label>
                      <Input
                        id="test-subject"
                        value={testEmailData.subject}
                        onChange={(e) => setTestEmailData(prev => ({ ...prev, subject: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="test-message">Message</Label>
                      <Input
                        id="test-message"
                        value={testEmailData.message}
                        onChange={(e) => setTestEmailData(prev => ({ ...prev, message: e.target.value }))}
                      />
                    </div>
                    
                    <Button 
                      onClick={handleSendTestInvoice}
                      disabled={isTestEmailLoading || !testEmailData.to}
                      className="w-full"
                    >
                      {isTestEmailLoading ? "Sending..." : "Send Test Invoice"}
                    </Button>
                    
                    {testEmailResult && (
                      <div className={cn(
                        "p-4 rounded-md",
                        testEmailResult.success 
                          ? "bg-green-50 text-green-700 border border-green-200" 
                          : "bg-red-50 text-red-700 border border-red-200"
                      )}>
                        <p className="font-medium">
                          {testEmailResult.success ? "✅ Success" : "❌ Error"}
                        </p>
                        <p className="text-sm">{testEmailResult.message}</p>
                        {testEmailResult.timestamp && (
                          <p className="text-xs mt-1">Sent at: {testEmailResult.timestamp}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <InvoiceDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            invoice={selectedInvoice}
            bulkMode={bulkMode}
          />

          <InvoiceTemplateEditor
            open={templateEditorOpen}
            onOpenChange={setTemplateEditorOpen}  
          />

          {/* Preview Dialog */}
          <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Invoice Preview {previewOrganization ? `- ${previewOrganization.name}` : ''}
                </DialogTitle>
              </DialogHeader>
              {previewOrganization && (
                <div className="mt-4">
                  <div className="border rounded-lg p-4 bg-white">
                    <ProfessionalInvoice 
                      invoice={createSampleInvoice(previewOrganization)} 
                    />
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Overdue Organizations Modal */}
          {overdueModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-lg w-[90vw] max-w-4xl max-h-[80vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-red-600" />
                    <h2 className="text-xl font-semibold">Overdue Organizations ({overdueOrganizations.length})</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrintOverdueList}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print List
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOverdueModalOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                  {overdueOrganizations.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-green-700">No overdue organizations!</h3>
                      <p className="text-muted-foreground">All organizations are up to date with their memberships.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {overdueOrganizations.map((org) => (
                        <Card key={org.id} className="border-red-100">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold text-lg">{org.name}</h3>
                                  <Badge className="bg-red-100 text-red-700 border-red-200">
                                    OVERDUE
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                                  <div>
                                    <strong>Email:</strong> {org.email || 'N/A'}
                                  </div>
                                  <div>
                                    <strong>Annual Fee:</strong> ${org.annual_fee_amount?.toLocaleString() || '0'}
                                  </div>
                                  <div>
                                    <strong>Membership End:</strong>{' '}
                                    <span className="text-red-600 font-medium">
                                      {org.membership_end_date ? format(new Date(org.membership_end_date), 'MMM dd, yyyy') : 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <strong>Status:</strong>{' '}
                                    <span className="text-red-600 font-medium capitalize">
                                      {org.membership_status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex flex-col gap-2 ml-4">
                                <Button
                                  size="sm"
                                  onClick={() => handleSendOverdueReminder(org)}
                                  disabled={sendingReminders.has(org.id) || !org.email}
                                >
                                  {sendingReminders.has(org.id) ? (
                                    "Sending..."
                                  ) : (
                                    <>
                                      <Mail className="h-4 w-4 mr-2" />
                                      Send Reminder
                                    </>
                                  )}
                                </Button>
                                {!org.email && (
                                  <p className="text-xs text-red-600">No email address</p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pending Organizations Modal */}
          <PendingOrganizationsModal
            isOpen={pendingModalOpen}
            onClose={() => setPendingModalOpen(false)}
            organizations={organizations}
          />

          {/* Delete Fee Tier Confirmation Dialog */}
          <Dialog open={deleteTierConfirmOpen} onOpenChange={setDeleteTierConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Fee Tier</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete this fee tier? This action cannot be undone. 
                  Any organizations currently assigned to this tier will have their tier assignment removed.
                </p>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setDeleteTierConfirmOpen(false);
                      setTierToDelete(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleConfirmDelete}
                  >
                    Delete Tier
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Fee Tier Modal */}
          <Dialog open={addTierModalOpen} onOpenChange={setAddTierModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Fee Tier</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tier-name">Tier Name</Label>
                  <Input
                    id="tier-name"
                    placeholder="e.g., Associate Member"
                    value={newTierName}
                    onChange={(e) => setNewTierName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tier-amount">Annual Fee Amount ($)</Label>
                  <Input
                    id="tier-amount"
                    type="number"
                    placeholder="e.g., 750"
                    value={newTierAmount}
                    onChange={(e) => setNewTierAmount(e.target.value)}
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setAddTierModalOpen(false);
                      setNewTierName('');
                      setNewTierAmount('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddFeeTier}>
                    Add Tier
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </SidebarProvider>
  );
}