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
import { Loader2, Mail, Building2, Calendar, Search, ChevronLeft, ChevronRight, Download, CalendarIcon, Sparkles, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { OrganizationViewModal } from '@/components/OrganizationViewModal';
import { Organization } from '@/hooks/useMembers';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

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
  const [downloadFrom, setDownloadFrom] = useState<Date | undefined>();
  const [downloadTo, setDownloadTo] = useState<Date | undefined>();
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [welcomeLoading, setWelcomeLoading] = useState(false);
  const [welcomeOrg, setWelcomeOrg] = useState<RecentSubmission | null>(null);
  const [welcomeText, setWelcomeText] = useState('');

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

  const handleGenerateWelcome = async (submission: RecentSubmission) => {
    setWelcomeOrg(submission);
    setWelcomeText('');
    setWelcomeOpen(true);
    setWelcomeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-welcome-message', {
        body: {
          organizationName: submission.name,
          city: submission.city,
          state: submission.state,
          contactName: getContactName(submission),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setWelcomeText((data as any)?.message || '');
    } catch (e: any) {
      console.error('Welcome generation failed:', e);
      toast.error(e?.message || 'Failed to generate welcome message');
      setWelcomeOpen(false);
    } finally {
      setWelcomeLoading(false);
    }
  };

  const handleEmailWelcome = () => {
    if (!welcomeOrg) return;
    const to = getContactEmail(welcomeOrg) || '';
    const subject = `Welcome to the HESS Consortium, ${welcomeOrg.name}`;
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(welcomeText)}`;
  };


  const handleDownload = () => {
    if (!downloadFrom || !downloadTo) {
      toast.error('Please select both start and end dates');
      return;
    }
    const from = new Date(downloadFrom); from.setHours(0, 0, 0, 0);
    const to = new Date(downloadTo); to.setHours(23, 59, 59, 999);
    const rows = allSubmissions.filter(s => {
      const d = new Date(s.created_at).getTime();
      return d >= from.getTime() && d <= to.getTime();
    });
    if (rows.length === 0) {
      toast.error('No submissions found in that date range');
      return;
    }
    const headers = ['Organization', 'Primary Contact', 'Title', 'Email', 'City', 'State', 'Membership Status', 'Joined'];
    const escape = (v: any) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      headers.join(','),
      ...rows.map(s => [
        s.name,
        getContactName(s),
        s.profiles?.primary_contact_title || '',
        getContactEmail(s) || '',
        s.city || '',
        s.state || '',
        s.membership_status,
        format(new Date(s.created_at), 'yyyy-MM-dd'),
      ].map(escape).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submissions_${format(downloadFrom, 'yyyy-MM-dd')}_to_${format(downloadTo, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${rows.length} submission${rows.length === 1 ? '' : 's'}`);
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

          {/* Download by date range */}
          <div className="flex flex-col sm:flex-row gap-3 mt-3 sm:items-center">
            <span className="text-sm font-medium text-muted-foreground">Download range:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn('justify-start text-left font-normal', !downloadFrom && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {downloadFrom ? format(downloadFrom, 'MMM d, yyyy') : 'From date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-background" align="start">
                <CalendarComponent
                  mode="single"
                  selected={downloadFrom}
                  onSelect={setDownloadFrom}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn('justify-start text-left font-normal', !downloadTo && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {downloadTo ? format(downloadTo, 'MMM d, yyyy') : 'To date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-background" align="start">
                <CalendarComponent
                  mode="single"
                  selected={downloadTo}
                  onSelect={setDownloadTo}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
            <Button size="sm" onClick={handleDownload} disabled={!downloadFrom || !downloadTo}>
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
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
                    <TableHead className="text-right">Welcome</TableHead>
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
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerateWelcome(submission);
                            }}
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            Welcome
                          </Button>
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
