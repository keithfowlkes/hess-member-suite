import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCohortStatistics } from '@/hooks/useCohortStatistics';
import { useCohortLeaderData } from '@/hooks/useCohortLeaderData';
import { useOrganizationByName } from '@/hooks/useOrganizationByName';
import { OrganizationDetailsDialog } from '@/components/OrganizationDetailsDialog';
import { Users, GraduationCap, Building2, MapPin, Calendar, Mail, BarChart3, TrendingUp, ChevronDown, ChevronUp, PieChart, Search, User, Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PieChart as RechartsPieChart, Cell, ResponsiveContainer, Pie, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface CohortMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  organization: string;
  city?: string;
  state?: string;
  primary_contact_title?: string;
  user_roles: {
    role: 'admin' | 'member' | 'cohort_leader';
  }[];
}

const CohortInformation = () => {
  const { user, isAdmin, isViewingAsAdmin } = useAuth();
  const { toast } = useToast();
  const [cohortMembers, setCohortMembers] = useState<CohortMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('member');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrganizationName, setSelectedOrganizationName] = useState<string | null>(null);
  const [isOrganizationDialogOpen, setIsOrganizationDialogOpen] = useState(false);
  const { data: cohortStats, isLoading: statsLoading, error: statsError } = useCohortStatistics();
  const { data: cohortLeaderData, loading: cohortLeaderLoading, error: cohortLeaderError } = useCohortLeaderData();
  const { data: selectedOrganization, isLoading: organizationLoading } = useOrganizationByName(selectedOrganizationName);

  useEffect(() => {
    const fetchCohortInformation = async () => {
      if (!user) return;

      try {
        // First, get the current user's role
        const { data: userRoleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (roleError) {
          console.error('Error fetching user role:', roleError);
          return;
        }

        // Determine the user's primary role (admin > cohort_leader > member)
        let primaryRole = 'member';
        if (userRoleData && userRoleData.length > 0) {
          const roles = userRoleData.map(r => r.role);
          if (roles.includes('admin')) {
            primaryRole = 'admin';
          } else if (roles.includes('cohort_leader')) {
            primaryRole = 'cohort_leader';
          }
        }

        setUserRole(primaryRole);
        console.log('CohortInformation - User roles:', userRoleData, 'Primary role:', primaryRole);

        // Check if user is admin or cohort leader
        if (primaryRole === 'admin' || primaryRole === 'cohort_leader') {
          // Fetch all users with their roles and organization data for city/state
          const { data: usersData, error: usersError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, organization, primary_contact_title, user_id');

          if (usersError) {
            console.error('Error fetching users:', usersError);
            toast({
              title: 'Error',
              description: 'Failed to load cohort information',
              variant: 'destructive'
            });
            return;
          }

          // Fetch organization data for city and state
          const { data: organizationsData, error: orgsError } = await supabase
            .from('organizations')
            .select('name, city, state')
            .eq('membership_status', 'active');

          if (orgsError) {
            console.error('Error fetching organizations:', orgsError);
          }

          // Create a map of organization name to city/state
          const orgMap = new Map(
            organizationsData?.map(org => [org.name, { city: org.city, state: org.state }]) || []
          );

          // Fetch user roles for cohort leaders
          const { data: rolesData, error: rolesError } = await supabase
            .from('user_roles')
            .select('user_id, role')
            .eq('role', 'cohort_leader');

          if (rolesError) {
            console.error('Error fetching roles:', rolesError);
            toast({
              title: 'Error',
              description: 'Failed to load cohort information',
              variant: 'destructive'
            });
            return;
          }

          // Combine users with their roles and org data
          const cohortLeaders = usersData
            ?.filter(user => 
              rolesData?.some(role => role.user_id === user.user_id && role.role === 'cohort_leader')
            )
            .map(user => {
              const orgData = user.organization ? orgMap.get(user.organization) : null;
              return {
                ...user,
                city: orgData?.city,
                state: orgData?.state,
                user_roles: rolesData
                  ?.filter(role => role.user_id === user.user_id)
                  .map(role => ({ role: role.role })) || []
              };
            }) || [];
          
          setCohortMembers(cohortLeaders);
        }
      } catch (error) {
        console.error('Error in fetchCohortInformation:', error);
        toast({
          title: 'Error',
          description: 'Failed to load cohort information',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCohortInformation();
  }, [user, toast]);

  // Filter cohort stats based on search term
  const filteredCohortStats = cohortStats?.map(cohort => ({
    ...cohort,
    organizations: cohort.organizations.filter(org =>
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.primaryContactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${org.city || ''} ${org.state || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(cohort => cohort.organizations.length > 0 || searchTerm === '') || [];

  // CSV download function for cohort members
  const downloadCohortMembersCSV = () => {
    if (!cohortLeaderData?.cohortMembers) return;

    const headers = [
      'First Name',
      'Last Name', 
      'Email',
      'Organization',
      'Title',
      'City',
      'State'
    ];

    const csvData = [...cohortLeaderData.cohortMembers]
      .sort((a, b) => (a.last_name || '').localeCompare(b.last_name || ''))
      .map(member => [
      member.first_name || '',
      member.last_name || '',
      member.email || '',
      member.organization || '',
      member.primary_contact_title || '',
      member.city || '',
      member.state || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cohort-members-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Handle member card click to show organization details
const handleMemberCardClick = (organizationName: string) => {
  if (organizationName && organizationName !== 'No organization') {
    setSelectedOrganizationName(organizationName);
    setIsOrganizationDialogOpen(true);
  }
};

// Handle organization dialog close
const handleOrganizationDialogClose = () => {
  setIsOrganizationDialogOpen(false);
  setSelectedOrganizationName(null);
};

  // Redirect if user doesn't have appropriate role (only for non-admin view)
  if (!loading && !isViewingAsAdmin && userRole !== 'admin' && userRole !== 'cohort_leader') {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 p-8">
            <div className="min-h-screen flex items-center justify-center">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle className="text-red-600">Access Denied</CardTitle>
                  <CardDescription>
                    You don't have permission to view cohort information.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => window.history.back()}
                    variant="outline"
                    className="w-full"
                  >
                    Go Back
                  </Button>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  // Show cohort leader view for cohort leaders (not viewing as admin)
  if (!isViewingAsAdmin && userRole === 'cohort_leader') {
    if (cohortLeaderLoading) {
      return (
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <main className="flex-1 p-8">
              <div className="space-y-6">
                <div className="animate-pulse">
                  <div className="h-8 bg-muted rounded mb-4"></div>
                  <div className="h-4 bg-muted rounded mb-8 w-2/3"></div>
                  <div className="grid gap-4 md:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-24 bg-muted rounded"></div>
                    ))}
                  </div>
                </div>
              </div>
            </main>
          </div>
        </SidebarProvider>
      );
    }

    if (cohortLeaderError) {
      return (
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <main className="flex-1 p-8">
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-destructive">Failed to load cohort information: {cohortLeaderError}</p>
                </CardContent>
              </Card>
            </main>
          </div>
        </SidebarProvider>
      );
    }

    // Check if user is an Ellucian Banner or Colleague cohort leader
    const isEllucianCohortLeader = cohortLeaderData?.userCohorts.some(
      cohort => cohort === 'Ellucian Banner' || cohort === 'Ellucian Colleague'
    );

    // Filter members by cohort for Ellucian cohort leaders
    const bannerMembers = cohortLeaderData?.cohortMembers.filter(member => 
      member.organization && cohortLeaderData.cohortStats.cohortsBySystem['Ellucian Banner']
    ) || [];
    
    const colleagueMembers = cohortLeaderData?.cohortMembers.filter(member =>
      member.organization && cohortLeaderData.cohortStats.cohortsBySystem['Ellucian Colleague']
    ) || [];

    // Helper function to render member grid
    const renderMemberGrid = (cohortFilter?: string) => {
      const membersToDisplay = cohortFilter
        ? cohortLeaderData?.cohortMembers.filter(m => m.cohort === cohortFilter) || []
        : cohortLeaderData?.cohortMembers || [];

      if (membersToDisplay.length === 0) {
        return (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No cohort members found</p>
          </div>
        );
      }

      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...membersToDisplay]
            .filter((member) => {
              if (!searchTerm) return true;
              const search = searchTerm.toLowerCase();
              return (
                member.organization?.toLowerCase().includes(search) ||
                member.first_name?.toLowerCase().includes(search) ||
                member.last_name?.toLowerCase().includes(search) ||
                `${member.first_name} ${member.last_name}`.toLowerCase().includes(search) ||
                member.email?.toLowerCase().includes(search)
              );
            })
            .sort((a, b) => {
              // Define role priority
              const getRolePriority = (roles: {role: 'admin' | 'member' | 'cohort_leader'}[]) => {
                if (roles.some(r => r.role === 'admin')) return 1;
                if (roles.some(r => r.role === 'cohort_leader')) return 2;
                return 3; // member
              };
              
              const aPriority = getRolePriority(a.user_roles || []);
              const bPriority = getRolePriority(b.user_roles || []);
              
              // Sort by role priority first, then by last name
              if (aPriority !== bPriority) {
                return aPriority - bPriority;
              }
              return (a.last_name || '').localeCompare(b.last_name || '');
            })
            .map((member) => (
              <Card 
                key={member.id} 
                className="border bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => handleMemberCardClick(member.organization || '')}
              >
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {member.first_name} {member.last_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{member.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>{member.organization || 'No organization'}</span>
                    </div>
                    {member.primary_contact_title && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Title:</span> {member.primary_contact_title}
                      </div>
                    )}
                    {(member.city || member.state) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {[member.city, member.state].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                    {member.organization && member.organization !== 'No organization' && (
                      <div className="text-xs text-primary font-medium mt-2">
                        Click to view organization details →
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      );
    };

    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 p-8">
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight">Your Cohort Information</h1>
                    <p className="text-muted-foreground">
                      Manage and view information for your cohort group members
                    </p>
                  </div>
                  <Badge variant="secondary">Cohort Leader</Badge>
                </div>
              </div>

              {/* Cohort Leader Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Your {cohortLeaderData?.userCohorts.join(', ')} Cohort Overview
                  </CardTitle>
                  <CardDescription>
                    Statistics for the cohort groups you lead: {cohortLeaderData?.userCohorts.join(', ')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">
                        {cohortLeaderData?.cohortStats.totalMembers || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Members</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">
                        {cohortLeaderData?.cohortStats.totalOrganizations || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Organizations</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">
                        {cohortLeaderData?.cohortStats.representedStates || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">States Represented</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">
                        {cohortLeaderData?.userCohorts.length || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Cohort Systems</div>
                    </div>
                  </div>
                </CardContent>
              </Card>


              {/* Cohort Members Directory */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Cohort Members Directory
                    </div>
                    {cohortLeaderData?.cohortMembers && cohortLeaderData.cohortMembers.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadCohortMembersCSV}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download CSV
                      </Button>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {isEllucianCohortLeader 
                      ? 'All members in Ellucian Banner and Ellucian Colleague cohorts'
                      : 'All members in your cohort groups'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isEllucianCohortLeader ? (
                    <Tabs defaultValue="banner" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="banner">Ellucian Banner ({cohortLeaderData?.cohortMembers.filter(m => m.cohort === 'Ellucian Banner').length || 0})</TabsTrigger>
                        <TabsTrigger value="colleague">Ellucian Colleague ({cohortLeaderData?.cohortMembers.filter(m => m.cohort === 'Ellucian Colleague').length || 0})</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="banner" className="space-y-4">
                        <div className="relative w-full max-w-md mb-4">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input
                            type="text"
                            placeholder="Search organizations or contacts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        {renderMemberGrid('Ellucian Banner')}
                      </TabsContent>
                      
                      <TabsContent value="colleague" className="space-y-4">
                        <div className="relative w-full max-w-md mb-4">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input
                            type="text"
                            placeholder="Search organizations or contacts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        {renderMemberGrid('Ellucian Colleague')}
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <div className="space-y-4">
                      {renderMemberGrid()}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Organization Details Dialog */}
              <OrganizationDetailsDialog
                organization={selectedOrganization}
                isOpen={isOrganizationDialogOpen}
                onClose={handleOrganizationDialogClose}
                canEdit={false}
              />
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  // Show admin view when viewing as admin
  if (isViewingAsAdmin) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 p-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Software System Cohorts</h1>
                  <p className="text-muted-foreground">
                    View organization membership statistics by software systems (Ellucian Banner, Ellucian Colleague, Jenzabar, Oracle Cloud, etc.)
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative w-80">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Search organizations or contacts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Badge variant="default">Admin View</Badge>
                </div>
              </div>

              {statsLoading ? (
                <div className="grid gap-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-6 bg-muted rounded mb-2"></div>
                        <div className="h-4 bg-muted rounded mb-1"></div>
                        <div className="h-4 bg-muted rounded w-2/3"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : statsError ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-destructive">Failed to load cohort statistics</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Overview Statistics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Software System Cohort Overview
                      </CardTitle>
                      <CardDescription>
                        Statistics showing organization membership by software systems
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-4">
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold">
                            {cohortStats?.reduce((sum, cohort) => sum + cohort.memberCount, 0) || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">Total Members</div>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold">
                            {cohortStats?.reduce((sum, cohort) => sum + cohort.organizationCount, 0) || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">Participating Organizations</div>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold">
                            {cohortStats?.length || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">Software Systems</div>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold">
                            {cohortStats && cohortStats.length > 0 ? 
                              Math.round((cohortStats.reduce((sum, cohort) => sum + cohort.memberCount, 0) / 
                                Math.max(cohortStats.reduce((sum, cohort) => sum + cohort.organizationCount, 0), 1)) * 10) / 10 
                              : 0}
                          </div>
                          <div className="text-sm text-muted-foreground">Avg Members/Org</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Charts Section */}
                  {cohortStats && cohortStats.length > 0 && (
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Pie Chart */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <PieChart className="h-5 w-5" />
                            Member Distribution by Software System
                          </CardTitle>
                          <CardDescription>
                            Percentage breakdown of members across cohorts
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsPieChart>
                                <Pie
                                  data={cohortStats.map(cohort => ({
                                    name: cohort.cohortName,
                                    value: cohort.memberCount,
                                    percentage: ((cohort.memberCount / cohortStats.reduce((sum, c) => sum + c.memberCount, 0)) * 100).toFixed(1)
                                  }))}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="value"
                                  style={{ fontSize: '10px' }}
                                >
                                  {cohortStats.map((cohort, index) => (
                                    <Cell key={`cell-${index}`} fill={
                                      cohort.cohortName === 'Workday' ? '#FF8C00' : // Orange for Workday
                                      [
                                        '#FF6B6B', // Red
                                        '#4ECDC4', // Teal
                                        '#45B7D1', // Blue
                                        '#96CEB4', // Green
                                        '#FFEAA7', // Yellow
                                        '#DDA0DD', // Plum
                                        '#98D8C8', // Mint
                                        '#F7DC6F', // Light Yellow
                                        '#BB8FCE', // Light Purple
                                        '#85C1E9', // Light Blue
                                        '#F8C471', // Orange
                                        '#82E0AA', // Light Green
                                        '#F1948A', // Light Red
                                        '#85CCDA', // Cyan
                                        '#D2B4DE'  // Lavender
                                      ][index]
                                    } />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  formatter={(value: number, name: string) => [
                                    `${value} members (${((value / cohortStats.reduce((sum, c) => sum + c.memberCount, 0)) * 100).toFixed(1)}%)`,
                                    name
                                  ]}
                                />
                                <Legend />
                              </RechartsPieChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Bar Chart */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Members & Organizations by System
                          </CardTitle>
                          <CardDescription>
                            Comparison of member and organization counts
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={cohortStats.map(cohort => ({
                                  name: cohort.cohortName.length > 15 ? 
                                    cohort.cohortName.substring(0, 12) + '...' : 
                                    cohort.cohortName,
                                  fullName: cohort.cohortName,
                                  members: cohort.memberCount,
                                  organizations: cohort.organizationCount
                                }))}
                                margin={{
                                  top: 5,
                                  right: 30,
                                  left: 20,
                                  bottom: 60
                                }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  dataKey="name" 
                                  angle={-45}
                                  textAnchor="end"
                                  height={80}
                                  interval={0}
                                  fontSize={12}
                                />
                                <YAxis />
                                <Tooltip 
                                  labelFormatter={(label, payload) => {
                                    const item = payload?.[0]?.payload;
                                    return item?.fullName || label;
                                  }}
                                  formatter={(value: number, name: string) => [
                                    value,
                                    name === 'members' ? 'Members' : 'Organizations'
                                  ]}
                                />
                                <Legend />
                                <Bar dataKey="members" fill="hsl(var(--primary))" name="Members" />
                                <Bar dataKey="organizations" fill="hsl(var(--secondary))" name="Organizations" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Individual Cohort Statistics */}
                  <div className="grid gap-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Software System Cohorts
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Cohort numbers are based on financial system reporting.
                    </p>
                    
                    {(!cohortStats || cohortStats.length === 0) ? (
                      <Card>
                        <CardContent className="p-6 text-center">
                          <p className="text-muted-foreground">No cohort data available. Members need to join software system cohorts from their profiles.</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div>
                        {searchTerm && filteredCohortStats.length === 0 ? (
                          <Card>
                            <CardContent className="p-6 text-center">
                              <p className="text-muted-foreground">No organizations found matching "{searchTerm}"</p>
                            </CardContent>
                          </Card>
                        ) : (
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {(searchTerm ? filteredCohortStats : cohortStats).map((cohort) => (
                          <Card key={cohort.cohortName} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-semibold text-base">{cohort.cohortName}</h3>
                                  <Badge variant="secondary" className="text-xs">
                                    {cohort.memberCount} {cohort.memberCount === 1 ? 'member' : 'members'}
                                  </Badge>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="text-center p-2 bg-primary/5 rounded">
                                    <div className="text-lg font-bold text-primary">{cohort.memberCount}</div>
                                    <div className="text-xs text-muted-foreground">Members</div>
                                  </div>
                                  <div className="text-center p-2 bg-secondary/5 rounded">
                                    <div className="text-lg font-bold text-secondary-foreground">{cohort.organizationCount}</div>
                                    <div className="text-xs text-muted-foreground">Organizations</div>
                                  </div>
                                </div>
                                
                                {/* Organization Dropdown */}
                                {cohort.organizations.length > 0 && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="w-full justify-between text-xs h-8"
                                      >
                                        <span className="flex items-center gap-1">
                                          <Building2 className="h-3 w-3" />
                                          View Organizations ({cohort.organizationCount})
                                        </span>
                                        <ChevronDown className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent 
                                      align="start" 
                                      className="w-80 max-h-60 overflow-y-auto bg-background border shadow-lg z-50"
                                    >
                                      <div className="p-2 space-y-1">
                                        <div className="text-sm font-medium text-muted-foreground px-2 py-1">
                                          Member Organizations
                                        </div>
                                         {cohort.organizations.map((org) => (
                                           <div key={org.id} className="flex justify-between items-start p-2 hover:bg-muted/50 rounded text-xs">
                                             <div className="flex-1 min-w-0">
                                               <div className="font-medium truncate">{org.name}</div>
                                               {org.primaryContactName && (
                                                 <div className="text-muted-foreground flex items-center gap-1 mt-0.5">
                                                   <User className="h-3 w-3 flex-shrink-0" />
                                                   <span className="truncate">{org.primaryContactName}</span>
                                                 </div>
                                               )}
                                               {(org.city || org.state) && (
                                                 <div className="text-muted-foreground flex items-center gap-1 mt-1">
                                                   <MapPin className="h-3 w-3 flex-shrink-0" />
                                                   <span className="truncate">
                                                     {org.city}{org.city && org.state && ', '}{org.state}
                                                   </span>
                                                 </div>
                                               )}
                                             </div>
                                             <Badge variant="outline" className="ml-2 text-xs flex-shrink-0">
                                               {org.memberCount}
                                             </Badge>
                                           </div>
                                         ))}
                                      </div>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Your Cohort Information</h1>
                <p className="text-muted-foreground">
                  View and manage cohort leader information across the HESS Consortium
                </p>
              </div>
              <Badge variant={userRole === 'admin' ? 'default' : 'secondary'}>
                {userRole === 'admin' ? 'Admin' : 'Cohort Leader'}
              </Badge>
            </div>

          {loading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-muted rounded mb-2"></div>
                    <div className="h-4 bg-muted rounded mb-1"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Cohort Leader Overview
                  </CardTitle>
                  <CardDescription>
                    Current cohort leaders in the HESS Consortium
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 md:grid-cols-3">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">{cohortMembers.length}</div>
                      <div className="text-sm text-muted-foreground">Total Cohort Leaders</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">
                        {new Set(cohortMembers.map(m => m.state).filter(Boolean)).size}
                      </div>
                      <div className="text-sm text-muted-foreground">States Represented</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">
                        {new Set(cohortMembers.map(m => m.organization).filter(Boolean)).size}
                      </div>
                      <div className="text-sm text-muted-foreground">Organizations</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Cohort Leaders Directory
                </h2>
                
                {cohortMembers.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground">No cohort leaders found.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[...cohortMembers]
                      .sort((a, b) => {
                        // Define role priority
                        const getRolePriority = (roles: {role: 'admin' | 'member' | 'cohort_leader'}[]) => {
                          if (roles.some(r => r.role === 'admin')) return 1;
                          if (roles.some(r => r.role === 'cohort_leader')) return 2;
                          return 3; // member
                        };
                        
                        const aPriority = getRolePriority(a.user_roles || []);
                        const bPriority = getRolePriority(b.user_roles || []);
                        
                        // Sort by role priority first, then by last name
                        if (aPriority !== bPriority) {
                          return aPriority - bPriority;
                        }
                        return (a.last_name || '').localeCompare(b.last_name || '');
                      })
                      .map((member) => (
                      <Card key={member.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-medium">
                                  {member.first_name} {member.last_name}
                                </h3>
                                <Badge variant="secondary" className="text-xs">
                                  Cohort Leader
                                </Badge>
                              </div>
                            </div>
                            
                            {member.primary_contact_title && (
                              <p className="text-sm text-muted-foreground">
                                {member.primary_contact_title}
                              </p>
                            )}

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="truncate">{member.organization || 'No organization'}</span>
                              </div>
                              
                              {(member.city || member.state) && (
                                <div className="flex items-center gap-2 text-sm">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span>{member.city}{member.city && member.state && ', '}{member.state}</span>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="truncate">{member.email}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  </SidebarProvider>
  );
};

export default CohortInformation;