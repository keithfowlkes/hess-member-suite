import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useMembers } from '@/hooks/useMembers';
import { Search, Building2, Mail, Phone, MapPin, User, Grid3X3, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function MemberOrganizationsView() {
  const { organizations, loading } = useMembers();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Search and View Toggle */}
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
              className="transition-shadow hover:shadow-md overflow-hidden bg-[#f1f2e4]"
            >
              <CardHeader className="pb-3">
                <div className="space-y-2">
                  <CardTitle className="text-base font-medium leading-tight truncate" title={organization.name}>
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
                    <div className="text-sm font-medium text-foreground truncate" title={`${organization.profiles.first_name} ${organization.profiles.last_name}`}>
                      {organization.profiles.first_name} {organization.profiles.last_name}
                    </div>
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
              <div className="col-span-2">Organization</div>
              <div className="col-span-2">Primary Contact</div>
              <div className="col-span-2">Email</div>
              <div className="col-span-2">Location</div>
              <div className="col-span-1">Student FTE</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1">Annual Fee</div>
            </div>
          </div>
          <div className="divide-y">
            {filteredOrganizations.map((organization) => (
              <div 
                key={organization.id}
                className="px-6 py-4 hover:bg-muted/30 transition-colors"
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-2 min-w-0">
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
                      <div className="text-sm min-w-0">
                        <div className="font-medium text-foreground truncate" title={`${organization.profiles.first_name} ${organization.profiles.last_name}`}>
                          {organization.profiles.first_name} {organization.profiles.last_name}
                        </div>
                        {organization.profiles.phone && (
                          <div className="text-muted-foreground truncate" title={organization.profiles.phone}>{organization.profiles.phone}</div>
                        )}
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
                    <div className="text-sm font-medium">
                      {organization.student_fte || '—'}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Badge className={`${getStatusColor(organization.membership_status)} text-xs`}>
                      {organization.membership_status}
                    </Badge>
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
          <p className="text-muted-foreground">Try adjusting your search criteria.</p>
        </div>
      )}
    </div>
  );
}