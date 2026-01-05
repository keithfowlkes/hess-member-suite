import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Mail, Building2, Calendar, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { OrganizationViewModal } from '@/components/OrganizationViewModal';
import { Organization } from '@/hooks/useMembers';
import { format } from 'date-fns';

interface RecentSubmission {
  id: string;
  name: string;
  email: string | null;
  city: string | null;
  state: string | null;
  membership_status: string;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    primary_contact_title: string | null;
  } | null;
}

const ITEMS_PER_PAGE = 15;

export function RecentMemberSubmissionsTab() {
  const [allSubmissions, setAllSubmissions] = useState<RecentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchAllSubmissions();
  }, []);

  // Reset to page 1 when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy]);

  const fetchAllSubmissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          email,
          city,
          state,
          membership_status,
          created_at,
          address_line_1,
          address_line_2,
          zip_code,
          country,
          phone,
          website,
          student_fte,
          annual_fee_amount,
          membership_start_date,
          membership_end_date,
          notes,
          student_information_system,
          financial_system,
          financial_aid,
          hcm_hr,
          payroll_system,
          purchasing_system,
          housing_management,
          learning_management,
          admissions_crm,
          alumni_advancement_crm,
          payment_platform,
          meal_plan_management,
          identity_management,
          door_access,
          document_management,
          voip,
          network_infrastructure,
          primary_office_apple,
          primary_office_lenovo,
          primary_office_dell,
          primary_office_hp,
          primary_office_microsoft,
          primary_office_other,
          primary_office_other_details,
          other_software_comments,
          contact_person_id,
          profiles!organizations_contact_person_id_fkey (
            id,
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
        .eq('membership_status', 'active')
        .or('organization_type.eq.member,organization_type.is.null')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (submission: RecentSubmission) => {
    const { data, error } = await supabase
      .from('organizations')
      .select(`
        *,
        profiles!organizations_contact_person_id_fkey (
          id,
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
      .eq('id', submission.id)
      .single();

    if (!error && data) {
      setSelectedOrganization(data as Organization);
      setShowOrgModal(true);
    }
  };

  const getContactName = (submission: RecentSubmission) => {
    if (submission.profiles) {
      return `${submission.profiles.first_name || ''} ${submission.profiles.last_name || ''}`.trim();
    }
    return '—';
  };

  const getContactEmail = (submission: RecentSubmission) => {
    return submission.profiles?.email || submission.email || null;
  };

  // Filter and sort ALL submissions (search works across everything)
  const filteredSubmissions = useMemo(() => {
    return allSubmissions
      .filter(submission => {
        const contactName = getContactName(submission);
        const contactEmail = getContactEmail(submission);
        const matchesSearch = 
          submission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (contactEmail && contactEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (submission.city && submission.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (submission.state && submission.state.toLowerCase().includes(searchTerm.toLowerCase()));
        
        return matchesSearch;
      })
      .sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
      });
  }, [allSubmissions, searchTerm, sortBy]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredSubmissions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedSubmissions = filteredSubmissions.slice(startIndex, endIndex);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Most Recent Member Submissions
            <Badge variant="secondary" className="ml-2">{filteredSubmissions.length}</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Browse member organizations by submission date
          </p>
          
          {/* Search and Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name, contact, email, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSubmissions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {allSubmissions.length === 0 ? 'No submissions found.' : 'No submissions match your search criteria.'}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Primary Contact</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSubmissions.map((submission) => {
                    const contactEmail = getContactEmail(submission);
                    return (
                      <TableRow 
                        key={submission.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRowClick(submission)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {submission.name}
                          </div>
                        </TableCell>
                        <TableCell>{getContactName(submission)}</TableCell>
                        <TableCell>
                          {contactEmail ? (
                            <a
                              href={`mailto:${contactEmail}`}
                              className="flex items-center gap-1 text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Mail className="h-3 w-3" />
                              {contactEmail}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {[submission.city, submission.state].filter(Boolean).join(', ') || '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(submission.created_at), 'MMM d, yyyy')}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredSubmissions.length)} of {filteredSubmissions.length} organizations
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <OrganizationViewModal
        organization={selectedOrganization}
        isOpen={showOrgModal}
        onClose={() => {
          setShowOrgModal(false);
          setSelectedOrganization(null);
        }}
      />
    </>
  );
}
