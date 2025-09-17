import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { MemberRegistrationUpdate } from '@/hooks/useMemberRegistrationUpdates';
import { SideBySideComparisonModal } from '@/components/SideBySideComparisonModal';
import { supabase } from '@/integrations/supabase/client';

interface MemberRegistrationUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registrationUpdate: MemberRegistrationUpdate | null;
  onApprove: (registrationUpdateId: string, adminUserId: string, adminNotes?: string) => void;
  onReject: (registrationUpdateId: string, adminUserId: string, adminNotes?: string) => void;
  adminUserId?: string;
  isProcessing?: boolean;
}

export function MemberRegistrationUpdateDialog({
  open,
  onOpenChange,
  registrationUpdate,
  onApprove,
  onReject,
  adminUserId,
  isProcessing = false
}: MemberRegistrationUpdateDialogProps) {
  const [adminNotes, setAdminNotes] = useState('');
  const [existingOrganization, setExistingOrganization] = useState<any>(null);
  const [existingContactData, setExistingContactData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch existing organization and contact data for comparison
  useEffect(() => {
    const fetchExistingData = async () => {
      if (!registrationUpdate?.existing_organization_id || !open) return;
      
      setIsLoading(true);
      try {
        // Fetch organization data
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', registrationUpdate.existing_organization_id)
          .single();
        
        if (orgError) {
          console.error('Error fetching existing organization:', orgError);
          return;
        }
        
        setExistingOrganization(orgData);

        // Fetch contact person data if available
        if (orgData.contact_person_id) {
          const { data: contactData, error: contactError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', orgData.contact_person_id)
            .single();
          
          if (!contactError) {
            setExistingContactData(contactData);
          }
        }
      } catch (error) {
        console.error('Failed to fetch existing data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExistingData();
  }, [registrationUpdate?.existing_organization_id, open]);

  // Create comparison data for SideBySideComparisonModal
  const comparisonData = React.useMemo(() => {
    if (!existingOrganization || !registrationUpdate) return { originalData: {}, updatedData: {} };

    const regData = registrationUpdate.registration_data;
    const orgData = registrationUpdate.organization_data;

    // Create enhanced existing organization data with proper field mapping
    const enhancedExistingOrg = {
      // Organization details
      name: existingOrganization.name || '',
      primary_contact_first_name: existingContactData?.first_name || '',
      primary_contact_last_name: existingContactData?.last_name || '',
      address_line_1: existingOrganization.address_line_1 || '',
      address_line_2: existingOrganization.address_line_2 || '',
      city: existingOrganization.city || '',
      state: existingOrganization.state || '',
      zip_code: existingOrganization.zip_code || '',
      phone: existingOrganization.phone || '',
      email: existingOrganization.email || '',
      website: existingOrganization.website || '',
      student_fte: existingOrganization.student_fte || null,
      primary_contact_title: existingOrganization.primary_contact_title || '',
      secondary_first_name: existingOrganization.secondary_first_name || '',
      secondary_last_name: existingOrganization.secondary_last_name || '',
      secondary_contact_title: existingOrganization.secondary_contact_title || '',
      secondary_contact_email: existingOrganization.secondary_contact_email || '',
      // Software systems
      student_information_system: existingOrganization.student_information_system || '',
      financial_system: existingOrganization.financial_system || '',
      financial_aid: existingOrganization.financial_aid || '',
      hcm_hr: existingOrganization.hcm_hr || '',
      payroll_system: existingOrganization.payroll_system || '',
      purchasing_system: existingOrganization.purchasing_system || '',
      housing_management: existingOrganization.housing_management || '',
      learning_management: existingOrganization.learning_management || '',
      admissions_crm: existingOrganization.admissions_crm || '',
      alumni_advancement_crm: existingOrganization.alumni_advancement_crm || '',
      // Hardware preferences
      primary_office_apple: existingOrganization.primary_office_apple || false,
      primary_office_asus: existingOrganization.primary_office_asus || false,
      primary_office_dell: existingOrganization.primary_office_dell || false,
      primary_office_hp: existingOrganization.primary_office_hp || false,
      primary_office_microsoft: existingOrganization.primary_office_microsoft || false,
      primary_office_other: existingOrganization.primary_office_other || false,
      primary_office_other_details: existingOrganization.primary_office_other_details || '',
      other_software_comments: existingOrganization.other_software_comments || ''
    };

    // Map registration data to organization structure for comparison
    const updatedOrgData = {
      // Organization details
      name: orgData.name || regData.organization_name || '',
      primary_contact_first_name: regData.first_name || '',
      primary_contact_last_name: regData.last_name || '',
      address_line_1: orgData.address_line_1 || regData.address || regData.address_line_1 || '',
      address_line_2: orgData.address_line_2 || regData.address_line_2 || '',
      city: orgData.city || regData.city || '',
      state: orgData.state || regData.state || '',
      zip_code: orgData.zip_code || regData.zip || regData.zip_code || '',
      phone: regData.phone || orgData.phone || '',
      email: regData.email || orgData.email || '',
      website: orgData.website || regData.website || '',
      student_fte: orgData.student_fte || regData.student_fte || null,
      primary_contact_title: orgData.primary_contact_title || regData.primary_contact_title || '',
      secondary_first_name: orgData.secondary_first_name || regData.secondary_first_name || '',
      secondary_last_name: orgData.secondary_last_name || regData.secondary_last_name || '',
      secondary_contact_title: orgData.secondary_contact_title || regData.secondary_contact_title || '',
      secondary_contact_email: orgData.secondary_contact_email || regData.secondary_contact_email || '',
      // Software systems
      student_information_system: orgData.student_information_system || regData.student_information_system || '',
      financial_system: orgData.financial_system || regData.financial_system || '',
      financial_aid: orgData.financial_aid || regData.financial_aid || '',
      hcm_hr: orgData.hcm_hr || regData.hcm_hr || '',
      payroll_system: orgData.payroll_system || regData.payroll_system || '',
      purchasing_system: orgData.purchasing_system || regData.purchasing_system || '',
      housing_management: orgData.housing_management || regData.housing_management || '',
      learning_management: orgData.learning_management || regData.learning_management || '',
      admissions_crm: orgData.admissions_crm || regData.admissions_crm || '',
      alumni_advancement_crm: orgData.alumni_advancement_crm || regData.alumni_advancement_crm || '',
      // Hardware preferences
      primary_office_apple: regData.primary_office_apple !== undefined ? regData.primary_office_apple : false,
      primary_office_asus: regData.primary_office_asus !== undefined ? regData.primary_office_asus : false,
      primary_office_dell: regData.primary_office_dell !== undefined ? regData.primary_office_dell : false,
      primary_office_hp: regData.primary_office_hp !== undefined ? regData.primary_office_hp : false,
      primary_office_microsoft: regData.primary_office_microsoft !== undefined ? regData.primary_office_microsoft : false,
      primary_office_other: regData.primary_office_other !== undefined ? regData.primary_office_other : false,
      primary_office_other_details: orgData.primary_office_other_details || regData.primary_office_other_details || '',
      other_software_comments: orgData.other_software_comments || regData.other_software_comments || ''
    };

    return {
      originalData: enhancedExistingOrg,
      updatedData: updatedOrgData
    };
  }, [existingOrganization, existingContactData, registrationUpdate]);

  if (!registrationUpdate) {
    return null;
  }

  const handleApprove = () => {
    if (!adminUserId) {
      console.error('Admin user ID is required');
      return;
    }
    onApprove(registrationUpdate.id, adminUserId, adminNotes);
    setAdminNotes('');
    onOpenChange(false);
  };

  const handleReject = () => {
    if (!adminUserId) {
      console.error('Admin user ID is required');
      return;
    }
    onReject(registrationUpdate.id, adminUserId, adminNotes);
    setAdminNotes('');
    onOpenChange(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-500/10 text-red-700 border-red-200';
      default: return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // Show loading state while fetching existing organization
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Loading Comparison Data</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Fetching organization data...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <SideBySideComparisonModal
      open={open}
      onOpenChange={onOpenChange}
      title={`Member Registration Update - ${registrationUpdate.existing_organization_name || 'Organization Update'}`}
      data={comparisonData}
      showActions={registrationUpdate.status === 'pending'}
      actionNotes={adminNotes}
      onActionNotesChange={setAdminNotes}
      onApprove={handleApprove}
      onReject={handleReject}
      isSubmitting={isProcessing}
    >
      {/* Additional submission info */}
      <div className="mb-4 p-4 bg-muted/30 rounded-lg space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Submitted by: {registrationUpdate.submitted_email}</p>
            <p className="text-xs text-muted-foreground">
              Type: {registrationUpdate.submission_type.replace('_', ' ')} • 
              Submitted: {new Date(registrationUpdate.submitted_at).toLocaleDateString()}
            </p>
          </div>
          <Badge className={`${getStatusColor(registrationUpdate.status)} flex items-center gap-1`}>
            {getStatusIcon(registrationUpdate.status)}
            {registrationUpdate.status.charAt(0).toUpperCase() + registrationUpdate.status.slice(1)}
          </Badge>
        </div>
        
        {registrationUpdate.admin_notes && (
          <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
            <p className="font-medium">Previous Admin Notes:</p>
            <p>{registrationUpdate.admin_notes}</p>
            {registrationUpdate.reviewed_at && (
              <p className="text-muted-foreground mt-1">
                Reviewed: {new Date(registrationUpdate.reviewed_at).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </div>
    </SideBySideComparisonModal>
  );
}