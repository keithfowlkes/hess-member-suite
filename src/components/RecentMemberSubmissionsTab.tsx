import { useState, useEffect } from 'react';
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
import { Loader2, Mail, Building2, Calendar } from 'lucide-react';
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

export function RecentMemberSubmissionsTab() {
  const [submissions, setSubmissions] = useState<RecentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [showOrgModal, setShowOrgModal] = useState(false);

  useEffect(() => {
    fetchRecentSubmissions();
  }, []);

  const fetchRecentSubmissions = async () => {
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
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching recent submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (submission: RecentSubmission) => {
    // Fetch full organization data for the modal
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
            <Badge variant="secondary" className="ml-2">{submissions.length}</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            The 15 most recently approved organizations through registration or member updates
          </p>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No recent submissions found.</p>
          ) : (
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
                {submissions.map((submission) => {
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
