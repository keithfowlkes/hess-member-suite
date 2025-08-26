import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useMembers } from '@/hooks/useMembers';
import { Plus, Search, Building2, Mail, Phone, MapPin, User, Grid3X3, List, Upload } from 'lucide-react';
import { OrganizationDialog } from '@/components/OrganizationDialog';
import { ImportMembersDialog } from '@/components/ImportMembersDialog';

export default function Members() {
  const { organizations, loading } = useMembers();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (org.profiles?.email && org.profiles.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (org.profiles?.first_name && org.profiles.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (org.profiles?.last_name && org.profiles.last_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
            <h1 className="text-3xl font-bold text-foreground">Member Organizations</h1>
            <p className="text-muted-foreground mt-2">
              Manage member organizations and their membership details
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setImportDialogOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Member Organizations
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
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setSelectedOrganization(organization);
                  setDialogOpen(true);
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Building2 className="h-8 w-8 text-primary" />
                      <div>
                        <CardTitle className="text-lg">{organization.name}</CardTitle>
                        <Badge className={`mt-1 ${getStatusColor(organization.membership_status)}`}>
                          {organization.membership_status}
                        </Badge>
                      </div>
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
                          {organization.profiles.first_name} {organization.profiles.last_name}
                        </div>
                      </div>
                    )}
                    {organization.email && (
                      <div className="flex items-center text-muted-foreground">
                        <Mail className="h-4 w-4 mr-2" />
                        {organization.email}
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
                    <div className="pt-2 border-t">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Annual Fee:</span>
                        <span className="font-medium">${organization.annual_fee_amount}</span>
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
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
                <div className="col-span-3">Organization</div>
                <div className="col-span-2">Primary Contact</div>
                <div className="col-span-2">Email</div>
                <div className="col-span-2">Location</div>
                <div className="col-span-2">Status</div>
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
                    setDialogOpen(true);
                  }}
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-3">
                      <div className="flex items-center space-x-3">
                        <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
                        <div>
                          <div className="font-medium text-foreground">{organization.name}</div>
                          {organization.phone && (
                            <div className="text-sm text-muted-foreground">{organization.phone}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2">
                      {organization.profiles ? (
                        <div className="text-sm">
                          <div className="font-medium">{organization.profiles.first_name} {organization.profiles.last_name}</div>
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
                        <div className="text-sm text-muted-foreground">{organization.email}</div>
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
            <p className="text-muted-foreground">Try adjusting your search or add a new organization.</p>
          </div>
        )}
      </div>

      <OrganizationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        organization={selectedOrganization}
      />

      <ImportMembersDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
        </main>
      </div>
    </SidebarProvider>
  );
}