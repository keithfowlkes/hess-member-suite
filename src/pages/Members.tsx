import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMembers } from '@/hooks/useMembers';
import { useOrganizationTotals } from '@/hooks/useOrganizationTotals';
import { Plus, Search, Building2, Mail, Phone, MapPin, User, Grid3X3, List, Upload, TrendingUp, Download } from 'lucide-react';
import Papa from 'papaparse';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OrganizationDialog } from '@/components/OrganizationDialog';
import { ComprehensiveOrganizationDialog } from '@/components/ComprehensiveOrganizationDialog';
import { ImportMembersDialog } from '@/components/ImportMembersDialog';
import { OrganizationViewModal } from '@/components/OrganizationViewModal';
import { OrganizationUpdateTrackerDialog } from '@/components/OrganizationUpdateTrackerDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Members() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'expired' | 'cancelled'>('active');
  const { organizations, loading } = useMembers(statusFilter);
  const { data: totals, isLoading: totalsLoading } = useOrganizationTotals();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [updateTrackerOpen, setUpdateTrackerOpen] = useState(false);

  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (org.profiles?.email && org.profiles.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (org.profiles?.first_name && org.profiles.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (org.profiles?.last_name && org.profiles.last_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesState = selectedState === 'all' || selectedState === '' || org.state === selectedState;
    
    return matchesSearch && matchesState;
  });

  const uniqueStates = Array.from(new Set(organizations.map(org => org.state).filter(Boolean))).sort();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'pending': return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'expired': return 'bg-red-500/10 text-red-700 border-red-200';
      case 'cancelled': return 'bg-gray-500/10 text-gray-700 border-gray-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const handleExportCSV = async () => {
    try {
      toast.info('Preparing export...');
      
      // Fetch all organizations with their profiles
      const { data: allOrgs, error } = await supabase
        .from('organizations')
        .select(`
          *,
          profiles:contact_person_id (
            first_name,
            last_name,
            email,
            phone,
            primary_contact_title,
            secondary_first_name,
            secondary_last_name,
            secondary_contact_title,
            secondary_contact_email,
            secondary_contact_phone
          )
        `)
        .order('name');

      if (error) throw error;

      // Transform data for CSV export
      const csvData = allOrgs.map(org => ({
        // Organization Basic Info
        'Organization Name': org.name,
        'Membership Status': org.membership_status,
        'Organization Type': org.organization_type,
        'Membership Start Date': org.membership_start_date || '',
        'Membership End Date': org.membership_end_date || '',
        'Annual Fee Amount': org.annual_fee_amount || '',
        'Date Joined HESS': org.approximate_date_joined_hess || '',
        
        // Address Information
        'Address Line 1': org.address_line_1 || '',
        'Address Line 2': org.address_line_2 || '',
        'City': org.city || '',
        'State': org.state || '',
        'Zip Code': org.zip_code || '',
        'Country': org.country || '',
        'State Association': org.state_association || '',
        
        // Contact Information
        'Organization Phone': org.phone || '',
        'Organization Email': org.email || '',
        'Website': org.website || '',
        
        // Primary Contact
        'Primary Contact First Name': org.profiles?.first_name || '',
        'Primary Contact Last Name': org.profiles?.last_name || '',
        'Primary Contact Email': org.profiles?.email || '',
        'Primary Contact Phone': org.profiles?.phone || '',
        'Primary Contact Title': org.primary_contact_title || '',
        
        // Secondary Contact
        'Secondary Contact First Name': org.secondary_first_name || '',
        'Secondary Contact Last Name': org.secondary_last_name || '',
        'Secondary Contact Title': org.secondary_contact_title || '',
        'Secondary Contact Email': org.secondary_contact_email || '',
        'Secondary Contact Phone': org.secondary_contact_phone || '',
        
        // Student Information
        'Student FTE': org.student_fte || '',
        
        // Systems Information
        'Student Information System': org.student_information_system || '',
        'Financial System': org.financial_system || '',
        'Financial Aid': org.financial_aid || '',
        'HCM/HR': org.hcm_hr || '',
        'Payroll System': org.payroll_system || '',
        'Purchasing System': org.purchasing_system || '',
        'Housing Management': org.housing_management || '',
        'Learning Management': org.learning_management || '',
        'Admissions CRM': org.admissions_crm || '',
        'Alumni/Advancement CRM': org.alumni_advancement_crm || '',
        'Payment Platform': org.payment_platform || '',
        'Meal Plan Management': org.meal_plan_management || '',
        'Identity Management': org.identity_management || '',
        'Door Access': org.door_access || '',
        'Document Management': org.document_management || '',
        'VoIP': org.voip || '',
        'Network Infrastructure': org.network_infrastructure || '',
        
        // Hardware Information
        'Primary Office - Apple': org.primary_office_apple ? 'Yes' : 'No',
        'Primary Office - Lenovo': org.primary_office_lenovo ? 'Yes' : 'No',
        'Primary Office - Dell': org.primary_office_dell ? 'Yes' : 'No',
        'Primary Office - HP': org.primary_office_hp ? 'Yes' : 'No',
        'Primary Office - Microsoft': org.primary_office_microsoft ? 'Yes' : 'No',
        'Primary Office - Other': org.primary_office_other ? 'Yes' : 'No',
        'Primary Office Other Details': org.primary_office_other_details || '',
        
        // Additional Information
        'Other Software Comments': org.other_software_comments || '',
        'Notes': org.notes || '',
      }));

      // Convert to CSV
      const csv = Papa.unparse(csvData);
      
      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `hess-member-organizations-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Successfully exported ${csvData.length} organizations`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
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
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Member Organizations</h1>
                  <p className="text-muted-foreground mt-2">
                    Manage member organizations and their membership details
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="ml-2"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setUpdateTrackerOpen(true)}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Update Tracker
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setImportDialogOpen(true)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import Members
                </Button>
                <Button onClick={() => {
                  setSelectedOrganization(null);
                  setDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Organization
                </Button>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Organizations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {totalsLoading ? '...' : totals?.totalOrganizations || 0}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Student FTE Represented by HESS Member Institutions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {totalsLoading ? '...' : (totals?.totalStudentFte || 0).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="organizations" className="space-y-4">
              <TabsList>
                <TabsTrigger value="organizations">Member Organizations</TabsTrigger>
              </TabsList>

              <TabsContent value="organizations" className="space-y-4">
                {/* Search and View Controls */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex gap-4 items-center flex-1">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search organizations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={selectedState} onValueChange={setSelectedState}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All states</SelectItem>
                        {uniqueStates.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Organizations Display */}
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredOrganizations.map((organization) => (
                      <Card 
                        key={organization.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden bg-[#f1f2e4]"
                        onClick={() => {
                          setSelectedOrganization(organization);
                          setViewModalOpen(true);
                        }}
                      >
                        <CardHeader className="pb-3">
                          <div className="space-y-2">
                            <CardTitle className="text-base font-medium leading-tight" title={organization.name}>
                              {organization.name}
                            </CardTitle>
                            <Badge className={`${getStatusColor(organization.membership_status)} text-xs`}>
                              {organization.membership_status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                          {organization.profiles && (
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Primary Contact</div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/profile/${organization.contact_person_id}`);
                                }}
                                className="text-sm text-primary hover:text-primary/80 hover:underline font-medium block truncate w-full text-left"
                                title={`${organization.profiles.first_name} ${organization.profiles.last_name}`}
                              >
                                {organization.profiles.first_name} {organization.profiles.last_name}
                              </button>
                            </div>
                          )}
                          
                          {organization.email && (
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Email</div>
                              <a 
                                href={`mailto:${organization.email}`}
                                className="text-sm text-primary hover:underline block truncate"
                                title={organization.email}
                              >
                                {organization.email}
                              </a>
                            </div>
                          )}
                          
                          {organization.phone && (
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Phone</div>
                              <div className="text-sm text-foreground truncate" title={organization.phone}>
                                {organization.phone}
                              </div>
                            </div>
                          )}
                          
                          {(organization.city || organization.state) && (
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Location</div>
                              <div className="text-sm text-foreground truncate" title={`${organization.city || ''}${organization.city && organization.state ? ', ' : ''}${organization.state || ''}`}>
                                {organization.city}{organization.city && organization.state && ', '}{organization.state}
                              </div>
                            </div>
                          )}
                          
                          <div className="pt-2 border-t space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Student FTE:</span>
                              <span className="text-sm font-medium">{organization.student_fte || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Annual Fee:</span>
                              <span className="text-sm font-medium">${organization.annual_fee_amount}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-6 py-3 border-b">
                      <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
                        <div className="col-span-3">Organization</div>
                        <div className="col-span-2">Primary Contact</div>
                        <div className="col-span-2">Email</div>
                        <div className="col-span-2">Location</div>
                        <div className="col-span-1">Status</div>
                        <div className="col-span-1">Student FTE</div>
                        <div className="col-span-1">Annual Fee</div>
                      </div>
                    </div>
                    <div className="divide-y">
                      {filteredOrganizations.map((organization) => (
                        <div 
                          key={organization.id}
                          className="px-6 py-4 hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => {
                            setSelectedOrganization(organization);
                            setViewModalOpen(true);
                          }}
                        >
                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-3 min-w-0">
                              <div className="min-w-0">
                                <div className="font-medium text-foreground truncate text-sm" title={organization.name}>
                                  {organization.name}
                                </div>
                                {organization.phone && (
                                  <div className="text-xs text-muted-foreground truncate mt-1" title={organization.phone}>
                                    {organization.phone}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="col-span-2 min-w-0">
                              {organization.profiles ? (
                                <div className="text-sm">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/profile/${organization.contact_person_id}`);
                                    }}
                                    className="font-medium text-primary hover:text-primary/80 hover:underline truncate block"
                                    title={`${organization.profiles.first_name} ${organization.profiles.last_name}`}
                                  >
                                    {organization.profiles.first_name} {organization.profiles.last_name}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </div>
                            <div className="col-span-2 min-w-0">
                              {organization.email ? (
                                <a 
                                  href={`mailto:${organization.email}`}
                                  className="text-sm text-primary hover:underline truncate block"
                                  title={organization.email}
                                >
                                  {organization.email}
                                </a>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </div>
                            <div className="col-span-2 min-w-0">
                              {(organization.city || organization.state) ? (
                                <div className="text-sm text-muted-foreground truncate" title={`${organization.city || ''}${organization.city && organization.state ? ', ' : ''}${organization.state || ''}`}>
                                  {organization.city}{organization.city && organization.state && ', '}{organization.state}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </div>
                            <div className="col-span-1">
                              <Badge className={`${getStatusColor(organization.membership_status)} text-xs`}>
                                {organization.membership_status}
                              </Badge>
                            </div>
                            <div className="col-span-1">
                              <div className="text-sm font-medium">
                                {organization.student_fte || '—'}
                              </div>
                            </div>
                            <div className="col-span-1">
                              <div className="text-sm font-medium">${organization.annual_fee_amount}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {filteredOrganizations.length === 0 && (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground">No organizations found</h3>
                    <p className="text-muted-foreground">Try adjusting your search or add a new organization.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <OrganizationDialog 
            open={dialogOpen} 
            onOpenChange={setDialogOpen}
            organization={selectedOrganization}
          />

          <ComprehensiveOrganizationDialog 
            open={viewModalOpen} 
            onOpenChange={setViewModalOpen}
            organization={selectedOrganization}
          />

          <ImportMembersDialog
            open={importDialogOpen}
            onOpenChange={setImportDialogOpen}
          />

          <OrganizationUpdateTrackerDialog
            open={updateTrackerOpen}
            onOpenChange={setUpdateTrackerOpen}
            organizations={organizations}
          />
        </main>
      </div>
    </SidebarProvider>
  );
}
