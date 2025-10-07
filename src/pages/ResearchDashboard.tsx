import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMembers } from '@/hooks/useMembers';
import { useOrganizationTotals } from '@/hooks/useOrganizationTotals';
import { Search, Building2, Mail, Phone, MapPin, User, Grid3X3, List, RefreshCw } from 'lucide-react';


export default function ResearchDashboard() {
  const { 
    organizations, 
    loading, 
    refresh
  } = useMembers();
  
  const { data: totals, isLoading: totalsLoading } = useOrganizationTotals();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Local filtering for loaded organizations
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


  const renderSkeletons = (count: number) => (
    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "border rounded-lg overflow-hidden"}>
      {viewMode === 'list' && (
        <div className="bg-muted/50 px-6 py-3 border-b">
          <div className="grid grid-cols-11 gap-4 text-sm font-medium text-muted-foreground">
            <div className="col-span-2">Organization</div>
            <div className="col-span-2">Primary Contact</div>
            <div className="col-span-2">Email</div>
            <div className="col-span-2">Location</div>
            <div className="col-span-1">Student FTE</div>
            <div className="col-span-2">Status</div>
          </div>
        </div>
      )}
      <div className={viewMode === 'list' ? "divide-y" : ""}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={viewMode === 'grid' ? "" : "px-6 py-4"}>
            {viewMode === 'grid' ? (
              <Card className="bg-[#f1f2e4]">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-8 w-8 rounded" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="pt-2 border-t space-y-2">
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-11 gap-4 items-center">
                <div className="col-span-2">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <div className="col-span-2"><Skeleton className="h-4 w-20" /></div>
                <div className="col-span-2"><Skeleton className="h-4 w-28" /></div>
                <div className="col-span-2"><Skeleton className="h-4 w-16" /></div>
                <div className="col-span-1"><Skeleton className="h-4 w-12" /></div>
                <div className="col-span-2"><Skeleton className="h-6 w-16 rounded-full" /></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 p-8">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">HESS Member Information</h1>
                  <p className="text-muted-foreground mt-2">
                    Browse member organizations and their membership details
                  </p>
                </div>
              </div>

              {/* Statistics Cards Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-[#f1f2e4]">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-40" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
                <Card className="bg-[#f1f2e4]">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-24" />
                  </CardContent>
                </Card>
              </div>

              {/* Search, State Filter and View Toggle Skeleton */}
              <div className="flex gap-4 items-center">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-20" />
              </div>

              {renderSkeletons(6)}
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
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-foreground">HESS Member Information</h1>
                <p className="text-muted-foreground mt-2">
                  Browse member organizations and their membership details
                </p>
              </div>
              <Button variant="outline" onClick={refresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-[#f1f2e4]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Member Organizations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {totalsLoading ? '...' : totals?.totalOrganizations?.toLocaleString() || 0}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#f1f2e4]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Student FTE Represented by HESS Member Institutions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {totalsLoading ? '...' : totals?.totalStudentFte?.toLocaleString() || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search, State Filter and View Toggle */}
            <div className="flex gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search organizations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
              </div>
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
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
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
                    className="hover:shadow-md transition-shadow bg-[#f1f2e4]"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base leading-tight">{organization.name}</CardTitle>
                          <Badge className={`mt-1 ${getStatusColor(organization.membership_status)}`}>
                            {organization.membership_status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        {organization.profiles && (
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Primary Contact</div>
                            <div className="flex items-center text-foreground">
                              <User className="h-4 w-4 mr-2" />
                              <span className="font-medium">
                                {organization.profiles.first_name} {organization.profiles.last_name}
                              </span>
                            </div>
                          </div>
                        )}
                        {organization.email && (
                          <div className="flex items-center text-muted-foreground">
                            <Mail className="h-4 w-4 mr-2" />
                            <a 
                              href={`mailto:${organization.email}`}
                              className="text-primary hover:underline"
                            >
                              {organization.email}
                            </a>
                          </div>
                        )}
                        {organization.phone && (
                          <div className="flex items-center text-muted-foreground">
                            <Phone className="h-4 w-4 mr-2" />
                            {organization.phone}
                          </div>
                        )}
                        {(organization.city || organization.state) && (
                          <div className="flex items-center text-muted-foreground">
                            <MapPin className="h-4 w-4 mr-2" />
                            {organization.city}{organization.city && organization.state && ', '}{organization.state}
                          </div>
                        )}
                        <div className="pt-2 border-t space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Student FTE:</span>
                            <span className="font-medium">{organization.student_fte || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-6 py-3 border-b">
                  <div className="grid grid-cols-11 gap-4 text-sm font-medium text-muted-foreground">
                    <div className="col-span-2">Organization</div>
                    <div className="col-span-2">Primary Contact</div>
                    <div className="col-span-2">Email</div>
                    <div className="col-span-2">Location</div>
                    <div className="col-span-1">Student FTE</div>
                    <div className="col-span-2">Status</div>
                  </div>
                </div>
                <div className="divide-y">
                  {filteredOrganizations.map((organization) => (
                    <div 
                      key={organization.id}
                      className="px-6 py-4 hover:bg-muted/30 transition-colors"
                    >
                       <div className="grid grid-cols-11 gap-4 items-center">
                          <div className="col-span-2">
                            <div>
                              <div className="font-medium text-foreground text-sm leading-tight">{organization.name}</div>
                              {organization.phone && (
                                <div className="text-sm text-muted-foreground">{organization.phone}</div>
                              )}
                            </div>
                          </div>
                         <div className="col-span-2">
                           {organization.profiles ? (
                             <div className="text-sm">
                               <div className="font-medium text-foreground">
                                 {organization.profiles.first_name} {organization.profiles.last_name}
                               </div>
                               {organization.profiles.phone && (
                                 <div className="text-muted-foreground">{organization.profiles.phone}</div>
                               )}
                             </div>
                           ) : (
                             <span className="text-muted-foreground text-sm">—</span>
                           )}
                         </div>
                         <div className="col-span-2">
                           {organization.email ? (
                             <a 
                               href={`mailto:${organization.email}`}
                               className="text-sm text-primary hover:underline"
                             >
                               {organization.email}
                             </a>
                           ) : (
                             <span className="text-muted-foreground text-sm">—</span>
                           )}
                         </div>
                         <div className="col-span-2">
                           {(organization.city || organization.state) ? (
                             <div className="text-sm text-muted-foreground">
                               {organization.city}{organization.city && organization.state && ', '}{organization.state}
                             </div>
                           ) : (
                             <span className="text-muted-foreground text-sm">—</span>
                           )}
                         </div>
                         <div className="col-span-1">
                           <div className="text-sm font-medium">
                             {organization.student_fte || '—'}
                           </div>
                         </div>
                         <div className="col-span-2">
                           <Badge className={`${getStatusColor(organization.membership_status)} text-xs`}>
                             {organization.membership_status}
                           </Badge>
                         </div>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredOrganizations.length === 0 && !loading && (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">No organizations found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try adjusting your search criteria.' : 'No organizations available.'}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}