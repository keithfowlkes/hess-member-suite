import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PartnerProgramInterestNotifications } from '@/components/PartnerProgramInterestNotifications';
import { useCohortStatistics } from '@/hooks/useCohortStatistics';
import { supabase } from '@/integrations/supabase/client';
import { Users, Building2, MapPin, Mail, BarChart3, Search, User, Download, Eye } from 'lucide-react';
import anthologyLogo from '@/assets/anthology-logo.png';
import ellucianLogo from '@/assets/ellucian-logo.jpg';
import jenzabarLogo from '@/assets/jenzabar-logo.avif';
import oracleLogo from '@/assets/oracle-logo.png';
import workdayLogo from '@/assets/workday-logo.png';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

interface CohortMemberPreview {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  organization: string;
  city?: string;
  state?: string;
  primary_contact_title?: string;
  cohort?: string;
}

interface CohortLeaderPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CohortLeaderPreviewModal({ isOpen, onClose }: CohortLeaderPreviewModalProps) {
  const { toast } = useToast();
  const { data: cohortStats } = useCohortStatistics();
  const [selectedCohort, setSelectedCohort] = useState<string>('');
  const [cohortMembers, setCohortMembers] = useState<CohortMemberPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Get available cohorts from cohortStats
  const availableCohorts = cohortStats?.map(c => c.cohortName) || [];

  // Fetch cohort members when cohort is selected
  useEffect(() => {
    const fetchCohortMembers = async () => {
      if (!selectedCohort) {
        setCohortMembers([]);
        return;
      }

      setLoading(true);
      try {
        // Determine cohorts to fetch (special handling for Ellucian)
        const cohortsToFetch = selectedCohort === 'Ellucian Banner' || selectedCohort === 'Ellucian Colleague'
          ? ['Ellucian Banner', 'Ellucian Colleague']
          : [selectedCohort];

        // Fetch users in the selected cohort(s)
        const { data: cohortMembersData, error: membersError } = await supabase
          .from('user_cohorts')
          .select('user_id, cohort')
          .in('cohort', cohortsToFetch);

        if (membersError) throw membersError;

        if (!cohortMembersData || cohortMembersData.length === 0) {
          setCohortMembers([]);
          setLoading(false);
          return;
        }

        // Get unique user IDs
        const userIds = [...new Set(cohortMembersData.map(item => item.user_id))];

        // Fetch profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, user_id, first_name, last_name, email, organization, primary_contact_title')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        // Fetch organizations for city/state
        const { data: organizationsData, error: orgsError } = await supabase
          .from('organizations')
          .select('name, city, state')
          .eq('membership_status', 'active');

        if (orgsError) {
          console.error('Error fetching organizations:', orgsError);
        }

        // Create org map
        const orgMap = new Map(
          organizationsData?.map(org => [org.name, { city: org.city, state: org.state }]) || []
        );

        // Create user_id to cohort map
        const cohortMap = new Map(cohortMembersData.map(item => [item.user_id, item.cohort]));

        // Build members list
        const members: CohortMemberPreview[] = (profilesData || []).map(profile => {
          const orgData = profile.organization ? orgMap.get(profile.organization) : null;
          return {
            id: profile.id,
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            email: profile.email || '',
            organization: profile.organization || '',
            city: orgData?.city,
            state: orgData?.state,
            primary_contact_title: profile.primary_contact_title,
            cohort: cohortMap.get(profile.user_id),
          };
        });

        setCohortMembers(members);
      } catch (err) {
        console.error('Error fetching cohort members:', err);
        toast({
          title: 'Error',
          description: 'Failed to load cohort members',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCohortMembers();
  }, [selectedCohort, toast]);

  // Filter members by search
  const filteredMembers = cohortMembers.filter(member => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      member.organization?.toLowerCase().includes(search) ||
      member.first_name?.toLowerCase().includes(search) ||
      member.last_name?.toLowerCase().includes(search) ||
      `${member.first_name} ${member.last_name}`.toLowerCase().includes(search) ||
      member.email?.toLowerCase().includes(search)
    );
  });

  // Get stats for selected cohort
  const selectedCohortStats = selectedCohort
    ? cohortStats?.find(c => c.cohortName === selectedCohort)
    : null;

  // For Ellucian, combine stats
  const isEllucian = selectedCohort === 'Ellucian Banner' || selectedCohort === 'Ellucian Colleague';
  const bannerStats = cohortStats?.find(c => c.cohortName === 'Ellucian Banner');
  const colleagueStats = cohortStats?.find(c => c.cohortName === 'Ellucian Colleague');

  // Download Excel
  const downloadCohortMembersExcel = () => {
    if (filteredMembers.length === 0) {
      toast({
        title: 'No Data',
        description: 'No member data available to export',
        variant: 'destructive',
      });
      return;
    }

    const sortedMembers = [...filteredMembers].sort((a, b) => 
      (a.organization || '').localeCompare(b.organization || '')
    );

    const worksheetData = sortedMembers.map(member => ({
      'First Name': member.first_name || '',
      'Last Name': member.last_name || '',
      'Email': member.email || '',
      'Organization': member.organization || '',
      'Title': member.primary_contact_title || '',
      'City': member.city || '',
      'State': member.state || '',
      'Cohort': member.cohort || selectedCohort,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(worksheetData);
    ws['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 35 },
      { wch: 30 }, { wch: 20 }, { wch: 10 }, { wch: 20 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Cohort Members');
    const filename = `${selectedCohort.toLowerCase().replace(/\s+/g, '-')}-members-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);

    toast({
      title: 'Success',
      description: 'Cohort members exported to Excel successfully',
    });
  };

  // Get logo for cohort
  const getCohortLogo = (cohort: string) => {
    switch (cohort) {
      case 'Anthology':
        return <img src={anthologyLogo} alt="Anthology Logo" className="h-8 w-auto object-contain" />;
      case 'Ellucian Banner':
      case 'Ellucian Colleague':
        return <img src={ellucianLogo} alt="Ellucian Logo" className="h-10 w-auto object-contain" />;
      case 'Jenzabar ONE':
        return <img src={jenzabarLogo} alt="Jenzabar Logo" className="h-10 w-auto object-contain" />;
      case 'Oracle Cloud':
        return <img src={oracleLogo} alt="Oracle Logo" className="h-6 w-auto object-contain" />;
      case 'Workday':
        return <img src={workdayLogo} alt="Workday Logo" className="h-10 w-auto object-contain" />;
      default:
        return null;
    }
  };

  // Render member grid
  const renderMemberGrid = (cohortFilter?: string) => {
    const membersToDisplay = cohortFilter
      ? filteredMembers.filter(m => m.cohort === cohortFilter)
      : filteredMembers;

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
          .sort((a, b) => (a.organization || '').localeCompare(b.organization || ''))
          .map((member) => (
            <Card key={member.id} className="border bg-muted/20">
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
                      <span>{[member.city, member.state].filter(Boolean).join(', ')}</span>
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Cohort Leader View Preview
          </DialogTitle>
          <DialogDescription>
            This is what a cohort leader would see on their "Your Cohort Information" page. Select a cohort to preview.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cohort Selector */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Select Cohort to Preview:</label>
            <Select value={selectedCohort} onValueChange={setSelectedCohort}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Choose a cohort..." />
              </SelectTrigger>
              <SelectContent>
                {availableCohorts.map(cohort => (
                  <SelectItem key={cohort} value={cohort}>
                    {cohort}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCohort && (
            <>
              {/* Partner Program Interest Notifications Preview */}
              <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 bg-primary/5">
                <div className="flex items-center gap-2 mb-3 text-sm text-primary font-medium">
                  <Eye className="h-4 w-4" />
                  Partner Program Interest Notifications (Cohort Leader View)
                </div>
                <PartnerProgramInterestNotifications />
              </div>

              {/* Cohort Overview Stats */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {getCohortLogo(selectedCohort)}
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5" />
                          {selectedCohort} Cohort Overview
                        </CardTitle>
                        <CardDescription>
                          Statistics for {selectedCohort} cohort members
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary">Cohort Leader Preview</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">
                        {isEllucian 
                          ? (bannerStats?.memberCount || 0) + (colleagueStats?.memberCount || 0)
                          : selectedCohortStats?.memberCount || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Members</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">
                        {isEllucian
                          ? (bannerStats?.organizationCount || 0) + (colleagueStats?.organizationCount || 0)
                          : selectedCohortStats?.organizationCount || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Organizations</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">
                        {isEllucian
                          ? new Set([
                              ...(bannerStats?.organizations.map(o => o.state).filter(Boolean) || []),
                              ...(colleagueStats?.organizations.map(o => o.state).filter(Boolean) || [])
                            ]).size
                          : new Set(selectedCohortStats?.organizations.map(o => o.state).filter(Boolean) || []).size}
                      </div>
                      <div className="text-sm text-muted-foreground">States Represented</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cohort Members Directory */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Cohort Members Directory
                    </CardTitle>
                    {filteredMembers.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadCohortMembersExcel}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download Excel
                      </Button>
                    )}
                  </div>
                  <CardDescription>
                    {isEllucian 
                      ? 'All members in Ellucian Banner and Ellucian Colleague cohorts'
                      : `All members in ${selectedCohort} cohort`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading members...</p>
                    </div>
                  ) : (
                    <>
                      {isEllucian ? (
                        <Tabs defaultValue="banner" className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="banner">
                              Ellucian Banner ({filteredMembers.filter(m => m.cohort === 'Ellucian Banner').length})
                            </TabsTrigger>
                            <TabsTrigger value="colleague">
                              Ellucian Colleague ({filteredMembers.filter(m => m.cohort === 'Ellucian Colleague').length})
                            </TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="banner" className="space-y-4">
                            <div className="relative w-full max-w-md my-4">
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
                            <div className="relative w-full max-w-md my-4">
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
                          <div className="relative w-full max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input
                              type="text"
                              placeholder="Search organizations or contacts..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                          {renderMemberGrid()}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {!selectedCohort && (
            <div className="text-center py-12 text-muted-foreground">
              <Eye className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Select a cohort to preview the cohort leader view</p>
              <p className="text-sm mt-2">You'll see the same information a cohort leader would see for their assigned cohort.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
