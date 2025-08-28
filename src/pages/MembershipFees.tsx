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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useMembers } from '@/hooks/useMembers';
import { useInvoices } from '@/hooks/useInvoices';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { setupDefaultInvoiceTemplate } from '@/utils/setupDefaultInvoiceTemplate';
import { ProfessionalInvoice } from '@/components/ProfessionalInvoice';
import { InvoiceDialog } from '@/components/InvoiceDialog';
import { InvoiceTemplateEditor } from '@/components/InvoiceTemplateEditor';
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
  CheckCircle
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

  // Setup default invoice template with HESS logo on component mount
  React.useEffect(() => {
    setupDefaultInvoiceTemplate();
  }, []);

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
    const averageFee = total > 0 ? totalRevenue / total : 0;

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

          await createInvoice({
            organization_id: organizationId,
            amount: organization.annual_fee_amount || 1000,
            due_date: format(dueDate, 'yyyy-MM-dd'),
            period_start_date: format(periodStart, 'yyyy-MM-dd'),
            period_end_date: format(periodEnd, 'yyyy-MM-dd'),
            notes: `Annual membership fee for ${organization.name}`
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalOrganizations}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active</CardTitle>
                  <CheckSquare className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.paidFees}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <TrendingUp className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{stats.pendingFees}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                  <FileText className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats.overdueRenewals}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Fee</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats.averageFeeAmount.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="invoices">Invoices</TabsTrigger>
                <TabsTrigger value="management">Fee Management</TabsTrigger>
                <TabsTrigger value="testing">Testing</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
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
                                  <Button
                                    size="sm"
                                    onClick={(e) => handleMarkAsPaid(invoice.id, e)}
                                  >
                                    <DollarSign className="h-4 w-4 mr-1" />
                                    Mark Paid
                                  </Button>
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
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="selectAll"
                        checked={selectedOrganizations.size === organizations.length && organizations.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                      <Label htmlFor="selectAll" className="text-sm font-medium">
                        Select All Organizations ({organizations.length})
                      </Label>
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-4">
                      {organizations.map((org) => (
                        <div key={org.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`org-${org.id}`}
                            checked={selectedOrganizations.has(org.id)}
                            onCheckedChange={(checked) => handleSelectOrganization(org.id, checked as boolean)}
                          />
                          <Label htmlFor={`org-${org.id}`} className="text-sm flex-1">
                            <div className="flex justify-between items-center">
                              <span>{org.name}</span>
                              <div className="flex items-center space-x-2">
                                <Badge className={getStatusColor(org.membership_status)}>
                                  {org.membership_status}
                                </Badge>
                                <span className="text-muted-foreground">
                                  ${org.annual_fee_amount || 1000}
                                </span>
                              </div>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-between items-center pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        {selectedOrganizations.size} organization{selectedOrganizations.size !== 1 ? 's' : ''} selected
                      </p>
                      <Button 
                        onClick={handleSendSelectedInvoices}
                        disabled={selectedOrganizations.size === 0 || isSendingInvoices}
                      >
                        {isSendingInvoices ? "Creating Invoices..." : "Create Selected Invoices"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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
        </main>
      </div>
    </SidebarProvider>
  );
}