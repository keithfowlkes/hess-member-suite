import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, User, Building2, Mail, Phone, MapPin, DollarSign, Calendar, Globe, Monitor, ArrowRight, AlertTriangle } from 'lucide-react';
import { PendingOrganization } from '@/hooks/useOrganizationApprovals';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { UnifiedComparisonModal } from './UnifiedComparisonModal';

interface OrganizationApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: PendingOrganization | null;
  onApprove: (organizationId: string, message?: string) => Promise<void>;
  onReject: (organizationId: string, message?: string) => Promise<void>;
  isUpdate?: boolean; // Flag to indicate if this is an update vs new organization
}

export const OrganizationApprovalDialog = ({
  open,
  onOpenChange,
  organization,
  onApprove,
  onReject,
  isUpdate = true // Default to true for backward compatibility
}: OrganizationApprovalDialogProps) => {
  const [adminMessage, setAdminMessage] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isApprovingWithInvoice, setIsApprovingWithInvoice] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [originalData, setOriginalData] = useState<any>(null);
  const { toast } = useToast();

  // Fetch original organization data for comparison when dialog opens
  React.useEffect(() => {
    if (open && organization && isUpdate) {
      const fetchOriginalData = async () => {
        try {
          // Get the original organization data from audit logs or a snapshot
          const { data, error } = await supabase
            .from('organizations')
            .select(`
              *,
              profiles:contact_person_id (*)
            `)
            .eq('id', organization.id)
            .single();

          if (error) throw error;
          setOriginalData(data);
        } catch (error) {
          console.error('Error fetching original data:', error);
        }
      };
      
      fetchOriginalData();
    }
  }, [open, organization?.id, isUpdate]);

  // Compare current organization data with original data
  const getChanges = useMemo(() => {
    if (!originalData || !organization || !isUpdate) return {};
    
    const changes: Record<string, { old: any; new: any }> = {};
    
    // Compare basic fields
    const fieldsToCompare = [
      'name', 'address_line_1', 'address_line_2', 'city', 'state', 'zip_code',
      'phone', 'email', 'website', 'student_fte', 'annual_fee_amount',
      'student_information_system', 'financial_system', 'financial_aid',
      'hcm_hr', 'payroll_system', 'purchasing_system', 'housing_management',
      'learning_management', 'admissions_crm', 'alumni_advancement_crm',
      'voip', 'network_infrastructure',
      'primary_office_apple', 'primary_office_asus', 'primary_office_dell',
      'primary_office_hp', 'primary_office_microsoft', 'primary_office_other',
      'primary_office_other_details', 'other_software_comments', 'notes'
    ];
    
    fieldsToCompare.forEach(field => {
      if (originalData[field] !== organization[field]) {
        changes[field] = {
          old: originalData[field],
          new: organization[field]
        };
      }
    });
    
    // Compare profile fields if they exist
    if (originalData.profiles && organization.profiles) {
      const profileFields = [
        'first_name', 'last_name', 'email', 'primary_contact_title',
        'is_private_nonprofit'
      ];
      
      profileFields.forEach(field => {
        if (originalData.profiles[field] !== organization.profiles[field]) {
          changes[`profile_${field}`] = {
            old: originalData.profiles[field],
            new: organization.profiles[field]
          };
        }
      });
    }
    
    return changes;
  }, [originalData, organization, isUpdate]);

  const hasChanges = Object.keys(getChanges).length > 0;

  // Convert changes to the format expected by UnifiedComparisonModal
  const comparisonData = useMemo(() => {
    if (!hasChanges || !isUpdate) return { originalData: organization };

    const organizationChanges = [];
    const profileChanges = [];

    Object.entries(getChanges).forEach(([field, change]) => {
      const label = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      if (field.startsWith('profile_')) {
        profileChanges.push({
          field: field.replace('profile_', ''),
          label: label.replace('Profile ', ''),
          oldValue: change.old,
          newValue: change.new,
          type: field.includes('email') ? 'email' : 'text'
        });
      } else {
        organizationChanges.push({
          field,
          label,
          oldValue: change.old,
          newValue: change.new,
          type: field.includes('fee') ? 'currency' : 'text'
        });
      }
    });

    return {
      organizationChanges,
      profileChanges,
      originalData: originalData,
      updatedData: organization
    };
  }, [getChanges, hasChanges, isUpdate, originalData, organization]);

  // Calculate prorated fee based on membership start date
  const calculateProratedFee = (annualFee: number): number => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const renewalDate = new Date(currentYear + 1, 5, 30); // June 30th next year
    const startDate = today;
    
    const totalDays = Math.ceil((renewalDate.getTime() - new Date(currentYear, 5, 30).getTime()) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.ceil((renewalDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate prorated amount (minimum 25% of annual fee)
    const proratedAmount = Math.max((remainingDays / totalDays) * annualFee, annualFee * 0.25);
    
    return Math.round(proratedAmount);
  };

  const getProratedFee = () => {
    if (!organization) return 0;
    const annualFee = organization.annual_fee_amount || 1000;
    return calculateProratedFee(annualFee);
  };

  const handleApprove = async () => {
    if (!organization) return;
    
    setIsApproving(true);
    try {
      await onApprove(organization.id, adminMessage || undefined);
      onOpenChange(false);
      setAdminMessage('');
    } finally {
      setIsApproving(false);
    }
  };

  const handleApproveWithInvoice = async () => {
    if (!organization) return;
    
    setIsApprovingWithInvoice(true);
    try {
      // First approve the organization
      await onApprove(organization.id, adminMessage || undefined);
      
      // Then create prorated invoice
      const proratedAmount = getProratedFee();
      const today = new Date();
      const dueDate = new Date();
      dueDate.setDate(today.getDate() + 30);
      const periodEnd = new Date(today.getFullYear() + 1, 5, 30);
      
      const invoiceNumber = `INV-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;
      
      const { error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          organization_id: organization.id,
          invoice_number: invoiceNumber,
          amount: proratedAmount,
          prorated_amount: proratedAmount,
          due_date: format(dueDate, 'yyyy-MM-dd'),
          period_start_date: format(today, 'yyyy-MM-dd'),
          period_end_date: format(periodEnd, 'yyyy-MM-dd'),
          notes: `Prorated membership fee for ${organization.name} (${Math.round((proratedAmount / (organization.annual_fee_amount || 1000)) * 100)}% of annual fee)`
        });

      if (invoiceError) throw invoiceError;

      toast({
        title: "Success",
        description: `Organization approved and prorated invoice ($${proratedAmount.toLocaleString()}) created.`,
      });

      onOpenChange(false);
      setAdminMessage('');
    } catch (error: any) {
      console.error('Error approving with invoice:', error);
      toast({
        title: "Error",
        description: "Failed to create invoice after approval",
        variant: "destructive"
      });
    } finally {
      setIsApprovingWithInvoice(false);
    }
  };

  const handleReject = async () => {
    if (!organization) return;
    
    setIsRejecting(true);
    try {
      await onReject(organization.id, adminMessage || '');
      onOpenChange(false);
      setAdminMessage('');
      setShowRejectForm(false);
    } finally {
      setIsRejecting(false);
    }
  };

  const renderOrganizationDetails = () => (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{organization?.name}</h3>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            Prorated Fee: ${getProratedFee().toLocaleString()}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Basic Information */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">Organization Details</h4>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-xs">
                {organization?.address_line_1}
                {organization?.address_line_2 && `, ${organization.address_line_2}`}
                {organization?.city && `, ${organization.city}`}
                {organization?.state && `, ${organization.state}`}
                {organization?.zip_code && ` ${organization.zip_code}`}
              </span>
            </div>
            {organization?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-xs">{organization.phone}</span>
              </div>
            )}
            {organization?.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <a href={`mailto:${organization.email}`} className="text-xs text-primary hover:underline">
                  {organization.email}
                </a>
              </div>
            )}
            {organization?.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <a href={organization.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                  {organization.website}
                </a>
              </div>
            )}
            {organization?.student_fte && (
              <div className="text-xs">
                <span className="font-medium">Student FTE:</span> {organization.student_fte.toLocaleString()}
              </div>
            )}
            <div className="text-xs">
              <span className="font-medium">Annual Fee:</span> ${(organization?.annual_fee_amount || 1000).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">Contact Information</h4>
          {organization?.profiles && (
            <div className="space-y-1 text-xs">
              <div className="font-medium">Primary Contact</div>
              <div>{organization.profiles.first_name} {organization.profiles.last_name}</div>
              {organization.profiles.primary_contact_title && (
                <div className="text-muted-foreground">{organization.profiles.primary_contact_title}</div>
              )}
              <a href={`mailto:${organization.profiles.email}`} className="text-primary hover:underline block">
                {organization.profiles.email}
              </a>
            </div>
          )}
          {(organization?.secondary_first_name || organization?.secondary_last_name) && (
            <div className="space-y-1 text-xs pt-2">
              <div className="font-medium">Secondary Contact</div>
              <div>{organization.secondary_first_name} {organization.secondary_last_name}</div>
              {organization.secondary_contact_title && (
                <div className="text-muted-foreground">{organization.secondary_contact_title}</div>
              )}
              {organization.secondary_contact_email && (
                <a href={`mailto:${organization.secondary_contact_email}`} className="text-primary hover:underline block">
                  {organization.secondary_contact_email}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Software Systems */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
            <Monitor className="h-3 w-3" />
            Software Systems
          </h4>
          <div className="space-y-1 text-xs">
            {organization?.voip && (
              <div><span className="font-medium">VoIP:</span> {organization.voip}</div>
            )}
            {organization?.network_infrastructure && (
              <div><span className="font-medium">Network Infrastructure:</span> {organization.network_infrastructure}</div>
            )}
            {organization?.student_information_system && (
              <div><span className="font-medium">SIS:</span> {organization.student_information_system}</div>
            )}
            {organization?.financial_system && (
              <div><span className="font-medium">Financial:</span> {organization.financial_system}</div>
            )}
            {organization?.financial_aid && (
              <div><span className="font-medium">Financial Aid:</span> {organization.financial_aid}</div>
            )}
            {organization?.hcm_hr && (
              <div><span className="font-medium">HCM/HR:</span> {organization.hcm_hr}</div>
            )}
            {organization?.payroll_system && (
              <div><span className="font-medium">Payroll:</span> {organization.payroll_system}</div>
            )}
            {organization?.purchasing_system && (
              <div><span className="font-medium">Purchasing:</span> {organization.purchasing_system}</div>
            )}
            {organization?.housing_management && (
              <div><span className="font-medium">Housing:</span> {organization.housing_management}</div>
            )}
            {organization?.learning_management && (
              <div><span className="font-medium">LMS:</span> {organization.learning_management}</div>
            )}
            {organization?.admissions_crm && (
              <div><span className="font-medium">Admissions CRM:</span> {organization.admissions_crm}</div>
            )}
            {organization?.alumni_advancement_crm && (
              <div><span className="font-medium">Alumni CRM:</span> {organization.alumni_advancement_crm}</div>
            )}
            
            {/* Office Software */}
            {(organization?.primary_office_apple || organization?.primary_office_asus || organization?.primary_office_dell || organization?.primary_office_hp || organization?.primary_office_microsoft || organization?.primary_office_other) && (
              <div className="pt-1">
                <div className="font-medium">Primary Office Software:</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {organization.primary_office_apple && <Badge variant="outline" className="text-xs px-1 py-0">Apple</Badge>}
                  {organization.primary_office_asus && <Badge variant="outline" className="text-xs px-1 py-0">Lenovo</Badge>}
                  {organization.primary_office_dell && <Badge variant="outline" className="text-xs px-1 py-0">Dell</Badge>}
                  {organization.primary_office_hp && <Badge variant="outline" className="text-xs px-1 py-0">HP</Badge>}
                  {organization.primary_office_microsoft && <Badge variant="outline" className="text-xs px-1 py-0">Microsoft</Badge>}
                  {organization.primary_office_other && <Badge variant="outline" className="text-xs px-1 py-0">Other</Badge>}
                </div>
                {organization.primary_office_other_details && (
                  <div className="text-muted-foreground text-xs mt-1">{organization.primary_office_other_details}</div>
                )}
              </div>
            )}
            
            {organization?.other_software_comments && (
              <div className="pt-1 text-xs">
                <div className="font-medium">Additional Comments:</div>
                <div className="text-muted-foreground">{organization.other_software_comments}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {organization?.notes && (
        <div className="mt-4 p-3 bg-muted rounded text-sm">
          <div className="font-medium mb-1">Notes:</div>
          <div className="text-muted-foreground">{organization.notes}</div>
        </div>
      )}

      <div className="mt-4 text-xs text-muted-foreground flex justify-between items-center">
        <span>Application submitted: {new Date(organization?.created_at || '').toLocaleDateString()}</span>
        <span>Membership Status: {organization?.membership_status}</span>
      </div>
    </div>
  );

  if (!organization) return null;

  return (
    <UnifiedComparisonModal
      open={open}
      onOpenChange={onOpenChange}
      title={`Review Organization ${isUpdate ? 'Update' : 'Application'} - ${organization?.name}`}
      data={comparisonData}
      showActions={true}
      actionNotes={adminMessage}
      onActionNotesChange={setAdminMessage}
      onApprove={handleApprove}
      onReject={showRejectForm ? handleReject : () => setShowRejectForm(true)}
      isSubmitting={isApproving || isApprovingWithInvoice || isRejecting}
    >
      <div className="flex gap-3 mt-4">
        {!showRejectForm ? (
          <>
            {!isUpdate && (
              <Button
                onClick={handleApproveWithInvoice}
                disabled={isApproving || isApprovingWithInvoice}
                variant="default"
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <DollarSign className="h-4 w-4" />
                {isApprovingWithInvoice ? 'Creating Invoice...' : `Approve & Send Prorated Invoice ($${getProratedFee().toLocaleString()})`}
              </Button>
            )}
          </>
        ) : (
          <Button
            onClick={() => {
              setShowRejectForm(false);
              setAdminMessage('');
            }}
            variant="outline"
          >
            Cancel Rejection
          </Button>
        )}
      </div>
    </UnifiedComparisonModal>
  );
};