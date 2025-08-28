import { useState, useEffect } from 'react';
import * as React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMembers } from '@/hooks/useMembers';
import { useInvoices } from '@/hooks/useInvoices';
import { useToast } from '@/hooks/use-toast';
import { setupDefaultInvoiceTemplate } from '@/utils/setupDefaultInvoiceTemplate';
import { ProfessionalInvoice } from '@/components/ProfessionalInvoice';
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
  Eye
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
  const { organizations, loading, updateOrganization } = useMembers();
  const { createInvoice } = useInvoices();
  const { toast } = useToast();
  const [bulkFeeAmount, setBulkFeeAmount] = useState<string>('');
  const [bulkRenewalDate, setBulkRenewalDate] = useState<Date>();
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedOrganizations, setSelectedOrganizations] = useState<Set<string>>(new Set());
  const [isSendingInvoices, setIsSendingInvoices] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

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
      org.membership_end_date || 'Not set',
      org.profiles ? `${org.profiles.first_name} ${org.profiles.last_name}` : 'No contact'
    ]);
    
    (pdf as any).autoTable({
      head: [['Organization', 'Status', 'Annual Fee', 'Start Date', 'End Date', 'Contact']],
      body: organizationData,
      startY: finalY + 10,
      theme: 'striped',
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 8 }
    });
    
    // Save the PDF
    pdf.save(`membership-fees-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    
    toast({
      title: "Success",
      description: "PDF report generated and downloaded successfully."
    });
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
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Membership Fees Management</h1>
                <p className="text-muted-foreground mt-2">
                  Manage annual fees, renewal dates, and generate reports for member organizations
                </p>
              </div>
              <Button onClick={generatePDFReport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download PDF Report
              </Button>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalOrganizations}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.paidFees} active memberships
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Annual Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    ${stats.averageFeeAmount.toLocaleString()} average per organization
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Fees</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{stats.pendingFees}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.overdueRenewals} overdue renewals
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Bulk Update Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Bulk Update Fees & Renewal Dates
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Update annual fees and renewal dates for all member organizations at once
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="bulk-fee">Annual Fee Amount ($)</Label>
                    <Input
                      id="bulk-fee"
                      type="number"
                      placeholder="e.g., 1000"
                      value={bulkFeeAmount}
                      onChange={(e) => setBulkFeeAmount(e.target.value)}
                      step="0.01"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to keep current individual fees
                    </p>
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
                          {bulkRenewalDate ? format(bulkRenewalDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={bulkRenewalDate}
                          onSelect={setBulkRenewalDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground">
                      Leave empty to keep current individual renewal dates
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    This will update {organizations.length} organization{organizations.length !== 1 ? 's' : ''}
                  </p>
                  <Button 
                    onClick={handleBulkUpdate} 
                    disabled={isUpdating || (!bulkFeeAmount && !bulkRenewalDate)}
                  >
                    {isUpdating ? 'Updating...' : 'Apply Bulk Update'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tabs for Overview and Invoice Preview */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Organization Fees Overview
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Invoice Preview ({selectedOrganizations.size})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                {/* Organization Fees Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Organization Fees Overview
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {selectedOrganizations.size} selected
                    </span>
                    <Button
                      onClick={handleSendSelectedInvoices}
                      disabled={selectedOrganizations.size === 0 || isSendingInvoices}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      {isSendingInvoices ? 'Creating Invoices...' : `Send Invoices (${selectedOrganizations.size})`}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-6 py-3 border-b">
                    <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
                      <div className="col-span-1 flex items-center">
                        <Checkbox
                          checked={selectedOrganizations.size === organizations.length && organizations.length > 0}
                          onCheckedChange={handleSelectAll}
                          className="mr-2"
                        />
                        <CheckSquare className="h-4 w-4" />
                      </div>
                      <div className="col-span-3">Organization</div>
                      <div className="col-span-1">Status</div>
                      <div className="col-span-2">Annual Fee</div>
                      <div className="col-span-2">Start Date</div>
                      <div className="col-span-2">End Date</div>
                      <div className="col-span-1">Days Left</div>
                    </div>
                  </div>
                  <div className="divide-y max-h-96 overflow-y-auto">
                    {organizations.map((organization) => {
                      const endDate = organization.membership_end_date ? new Date(organization.membership_end_date) : null;
                      const today = new Date();
                      const daysLeft = endDate ? Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24)) : null;
                      
                      return (
                        <div key={organization.id} className="px-6 py-4 hover:bg-muted/30 transition-colors">
                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-1">
                              <Checkbox
                                checked={selectedOrganizations.has(organization.id)}
                                onCheckedChange={(checked) => handleSelectOrganization(organization.id, !!checked)}
                              />
                            </div>
                            <div className="col-span-3">
                              <div className="font-medium text-foreground">{organization.name}</div>
                            </div>
                            <div className="col-span-1">
                              <span className={cn(
                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                organization.membership_status === 'active' && "bg-green-100 text-green-800",
                                organization.membership_status === 'pending' && "bg-yellow-100 text-yellow-800",
                                organization.membership_status === 'expired' && "bg-red-100 text-red-800",
                                organization.membership_status === 'cancelled' && "bg-gray-100 text-gray-800"
                              )}>
                                {organization.membership_status}
                              </span>
                            </div>
                            <div className="col-span-2">
                              <div className="font-medium">${organization.annual_fee_amount || 0}</div>
                            </div>
                            <div className="col-span-2">
                              <div className="text-sm text-muted-foreground">
                                {organization.membership_start_date 
                                  ? format(new Date(organization.membership_start_date), 'MMM dd, yyyy')
                                  : 'Not set'
                                }
                              </div>
                            </div>
                            <div className="col-span-2">
                              <div className="text-sm text-muted-foreground">
                                {organization.membership_end_date 
                                  ? format(new Date(organization.membership_end_date), 'MMM dd, yyyy')
                                  : 'Not set'
                                }
                              </div>
                            </div>
                            <div className="col-span-1">
                              {daysLeft !== null ? (
                                <span className={cn(
                                  "text-sm font-medium",
                                  daysLeft < 0 && "text-red-600",
                                  daysLeft >= 0 && daysLeft <= 30 && "text-yellow-600",
                                  daysLeft > 30 && "text-green-600"
                                )}>
                                  {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d`}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
              </TabsContent>

              <TabsContent value="preview" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Invoice Preview
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Preview invoices for selected organizations before sending
                    </p>
                  </CardHeader>
                  <CardContent>
                    {selectedOrganizations.size === 0 ? (
                      <div className="text-center py-12">
                        <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                          No Organizations Selected
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Select organizations from the Overview tab to preview their invoices
                        </p>
                        <Button 
                          onClick={() => setActiveTab("overview")} 
                          variant="outline"
                        >
                          Go to Overview
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {Array.from(selectedOrganizations).map((orgId) => {
                          const organization = organizations.find(org => org.id === orgId);
                          if (!organization) return null;

                          const sampleInvoice = createSampleInvoice(organization);
                          
                          return (
                            <div key={orgId} className="border rounded-lg p-6 bg-muted/20">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">
                                  Invoice Preview: {organization.name}
                                </h3>
                                <div className="text-sm text-muted-foreground">
                                  Amount: ${organization.annual_fee_amount || 1000}
                                </div>
                              </div>
                              
                              {/* Invoice Preview */}
                              <div className="bg-white border rounded-lg overflow-hidden">
                                <div className="max-h-[600px] overflow-y-auto">
                                  <ProfessionalInvoice invoice={sampleInvoice} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-6 border-t">
                          <div className="text-sm text-muted-foreground">
                            {selectedOrganizations.size} invoice{selectedOrganizations.size !== 1 ? 's' : ''} ready to send
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => setActiveTab("overview")}
                              variant="outline"
                            >
                              Back to Overview
                            </Button>
                            <Button
                              onClick={handleSendSelectedInvoices}
                              disabled={isSendingInvoices}
                              className="flex items-center gap-2"
                            >
                              <Send className="h-4 w-4" />
                              {isSendingInvoices ? 'Creating Invoices...' : `Send All Invoices (${selectedOrganizations.size})`}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}