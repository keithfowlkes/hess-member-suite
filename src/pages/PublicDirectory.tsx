import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ExternalLink, MapPin, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { OrganizationDetailsDialog } from '@/components/OrganizationDetailsDialog';

interface PublicOrganization {
  id: string;
  name: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  membership_status: 'active' | 'pending' | 'expired' | 'cancelled';
  membership_start_date?: string;
  membership_end_date?: string;
  annual_fee_amount?: number;
  notes?: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    organization?: string;
    state_association?: string;
    student_fte?: number;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    primary_contact_title?: string;
    secondary_first_name?: string;
    secondary_last_name?: string;
    secondary_contact_title?: string;
    secondary_contact_email?: string;
    student_information_system?: string;
    financial_system?: string;
    financial_aid?: string;
    hcm_hr?: string;
    payroll_system?: string;
    purchasing_system?: string;
    housing_management?: string;
    learning_management?: string;
    admissions_crm?: string;
    alumni_advancement_crm?: string;
    primary_office_apple?: boolean;
    primary_office_asus?: boolean;
    primary_office_dell?: boolean;
    primary_office_hp?: boolean;
    primary_office_microsoft?: boolean;
    primary_office_other?: boolean;
    primary_office_other_details?: string;
    other_software_comments?: string;
  };
}

interface DirectoryContentProps {
  showHeader?: boolean;
  showStats?: boolean;
}

function DirectoryContent({ showHeader = false, showStats = false }: DirectoryContentProps) {
  const [organizations, setOrganizations] = useState<PublicOrganization[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedOrganization, setSelectedOrganization] = useState<PublicOrganization | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          profiles:contact_person_id (
            first_name, last_name, email, phone, organization, state_association,
            student_fte, address, city, state, zip, primary_contact_title,
            secondary_first_name, secondary_last_name, secondary_contact_title,
            secondary_contact_email, student_information_system, financial_system,
            financial_aid, hcm_hr, payroll_system, purchasing_system,
            housing_management, learning_management, admissions_crm,
            alumni_advancement_crm, primary_office_apple, primary_office_asus,
            primary_office_dell, primary_office_hp, primary_office_microsoft,
            primary_office_other, primary_office_other_details, other_software_comments
          )
        `)
        .eq('membership_status', 'active')
        .eq('organization_type', 'member')
        .order('name');

      if (error) {
        console.error('Error fetching organizations:', error);
        setOrganizations([]);
      } else {
        setOrganizations(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.state?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesState = selectedState === 'all' || selectedState === '' || org.state === selectedState;
    
    return matchesSearch && matchesState;
  });

  const uniqueStates = Array.from(new Set(organizations.map(org => org.state).filter(Boolean))).sort();

  const handleOrganizationClick = (org: PublicOrganization) => {
    setSelectedOrganization(org);
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="text-center space-y-2 py-4">
          <h1 className="text-2xl font-bold text-foreground">
            Member Organizations Directory
          </h1>
          <p className="text-muted-foreground">
            Discover our active member organizations
          </p>
        </div>
      )}

      {/* Statistics at top */}
      {showStats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-primary/5 rounded">
            <div className="text-xl font-bold text-primary">{organizations.length}</div>
            <div className="text-xs text-muted-foreground">Active Organizations</div>
          </div>
          <div className="text-center p-3 bg-accent/10 rounded">
            <div className="text-xl font-bold text-foreground">
              {new Set(organizations.map(org => org.state).filter(Boolean)).size}
            </div>
            <div className="text-xs text-muted-foreground">States</div>
          </div>
          <div className="text-center p-3 bg-secondary/10 rounded">
            <div className="text-xl font-bold text-foreground">
              {organizations.reduce((total, org) => {
                const fte = org.profiles?.student_fte || 0;
                return total + fte;
              }, 0).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Total Student FTE</div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex gap-4 items-center max-w-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
      </div>

      {/* Organizations List - More compact */}
      <div className="space-y-1">
        {filteredOrganizations.map((org) => (
          <div 
            key={org.id} 
            className="flex items-center justify-between p-3 border border-border rounded hover:bg-accent/5 transition-colors cursor-pointer"
            onClick={() => handleOrganizationClick(org)}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <h3 className="font-medium text-foreground">
                {org.name}
              </h3>
              {(org.city || org.state) && (
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <MapPin className="h-3 w-3" />
                  <span>
                    {[org.city, org.state].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
            
            {org.website && (
              <Button
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(org.website, '_blank');
                }}
                className="h-8 w-8 p-0 text-primary hover:text-primary/80"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <OrganizationDetailsDialog
        organization={selectedOrganization}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        canEdit={false}
      />

      {filteredOrganizations.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No organizations found matching your search.</p>
        </div>
      )}
    </div>
  );
}

export default function PublicDirectory() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <DirectoryContent showHeader={false} showStats={true} />
      </div>
    </div>
  );
}