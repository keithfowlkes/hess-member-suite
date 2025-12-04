import * as React from 'react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PendingRegistration } from '@/hooks/usePendingRegistrations';
import { useAuth } from '@/hooks/useAuth';
import { useSendInvoice } from '@/hooks/useSendInvoice';
import { useFeeTiers } from '@/hooks/useFeeTiers';
import { Mail, DollarSign, Calendar, FileText, Eye, Search, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { InvoicePreviewModal } from '@/components/InvoicePreviewModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PendingRegistrationApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registration: PendingRegistration | null;
  onApprove: (registrationId: string, adminUserId?: string, selectedFeeTier?: number) => Promise<boolean | { success: boolean; organizationId?: string }>;
  onReject: (registrationId: string, reason: string, adminUserId?: string) => Promise<boolean>;
}

export function PendingRegistrationApprovalDialog({
  open,
  onOpenChange,
  registration,
  onApprove,
  onReject
}: PendingRegistrationApprovalDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showInvoiceOptions, setShowInvoiceOptions] = useState(false);
  const [sendInvoice, setSendInvoice] = useState(false);
  const [selectedFeeTier, setSelectedFeeTier] = useState('full');
  const [invoiceAmount, setInvoiceAmount] = useState('1000');
  const [membershipStartDate, setMembershipStartDate] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<string | null>(null);
  const { user } = useAuth();
  const sendInvoiceMutation = useSendInvoice();
  const { feeTiers } = useFeeTiers();

  const handleAIVerification = async () => {
    if (!registration) return;
    
    setIsVerifying(true);
    setVerificationResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-contact-ai', {
        body: {
          organizationName: registration.organization_name,
          firstName: registration.first_name,
          lastName: registration.last_name,
          title: registration.primary_contact_title || null
        }
      });

      if (error) {
        console.error('AI verification error:', error);
        toast.error('Failed to verify contact: ' + error.message);
        return;
      }

      if (data?.success) {
        setVerificationResult(data.result);
        toast.success('Contact verification completed');
      } else {
        toast.error(data?.error || 'Verification failed');
      }
    } catch (err) {
      console.error('Error during verification:', err);
      toast.error('An error occurred during verification');
    } finally {
      setIsVerifying(false);
    }
  };

  // Reset form when dialog opens/closes or fee tiers change
  React.useEffect(() => {
    if (!open) {
      setSendInvoice(false);
      setSelectedFeeTier('full');
      setShowInvoiceOptions(false);
      setMembershipStartDate('');
      setInvoiceNotes('');
      setVerificationResult(null);
    }
    
    // Set default invoice amount to full member fee
    const fullTier = feeTiers.find(t => t.id === 'full');
    if (fullTier) {
      setInvoiceAmount(fullTier.amount.toString());
    }
  }, [open, feeTiers]);

  // Calculate prorated amount based on membership start date
  const calculateProratedAmount = () => {
    if (!membershipStartDate || !invoiceAmount) return null;
    
    const membershipStart = new Date(membershipStartDate);
    const currentYear = new Date().getFullYear();
    const yearEnd = new Date(currentYear, 11, 31); // December 31st
    const yearStart = new Date(currentYear, 0, 1); // January 1st
    
    if (membershipStart <= yearStart) return null; // No proration needed
    
    const totalDays = Math.ceil((yearEnd.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.ceil((yearEnd.getTime() - membershipStart.getTime()) / (1000 * 60 * 60 * 24));
    
    return Math.round((parseFloat(invoiceAmount) * remainingDays / totalDays) * 100) / 100;
  };

  const proratedAmount = calculateProratedAmount();

  const handleSendInvoice = async (orgId: string) => {
    if (!registration || !membershipStartDate) return;

    return sendInvoiceMutation.mutateAsync({
      organizationId: orgId,
      organizationName: registration.organization_name,
      organizationEmail: registration.email,
      membershipStartDate,
      invoiceAmount: parseFloat(invoiceAmount),
      proratedAmount: proratedAmount,
      periodStartDate: new Date(membershipStartDate).toISOString().split('T')[0],
      periodEndDate: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
      notes: invoiceNotes || undefined
    });
  };

  const handleApprove = async () => {
    if (!registration) return;
    
    setIsSubmitting(true);
    try {
      const result = await onApprove(registration.id, user?.id, parseFloat(invoiceAmount));
      
      // Check if result includes organization ID (updated approval function returns this)
      let organizationId = registration.id; // fallback to registration ID
      if (typeof result === 'object' && result && 'organizationId' in result && result.organizationId) {
        organizationId = result.organizationId;
      }
      
      const success = typeof result === 'boolean' ? result : (result && 'success' in result ? result.success : true);
      
      if (success && sendInvoice && membershipStartDate && organizationId) {
        // Add 2-second delay before sending invoice to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Use the actual organization ID returned from approval
        await handleSendInvoice(organizationId);
      }

      if (success) {
        onOpenChange(false);
        setShowRejectForm(false);
        setRejectionReason('');
        setSendInvoice(false);
        setShowInvoiceOptions(false);
        setMembershipStartDate('');
        setInvoiceNotes('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!registration || !rejectionReason.trim()) return;
    
    setIsSubmitting(true);
    try {
      const success = await onReject(registration.id, rejectionReason, user?.id);
      if (success) {
        onOpenChange(false);
        setShowRejectForm(false);
        setRejectionReason('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!registration) return null;

  const primaryOfficeList = [
    { key: 'primary_office_apple', label: 'Apple' },
    { key: 'primary_office_lenovo', label: 'Lenovo' },
    { key: 'primary_office_dell', label: 'Dell' },
    { key: 'primary_office_hp', label: 'HP' },
    { key: 'primary_office_microsoft', label: 'Microsoft' },
  ].filter(item => registration[item.key as keyof PendingRegistration] === true);

  // Extract verification status from result
  const getVerificationStatus = () => {
    if (!verificationResult) return null;
    const statusLine = verificationResult.split('\n').find(line => line.startsWith('**Verification Status:**'));
    if (!statusLine) return null;
    const status = statusLine.replace('**Verification Status:**', '').trim().toLowerCase();
    if (status.includes('yes')) return 'verified';
    if (status.includes('no')) return 'not-verified';
    return 'unable';
  };

  const verificationStatus = getVerificationStatus();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Review Registration: {registration.organization_name}
            </DialogTitle>
            <Button
              onClick={handleAIVerification}
              disabled={isVerifying}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  AI Verify Contact
                </>
              )}
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Contact Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-3 text-gray-800">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Primary Contact:</span> {registration.first_name} {registration.last_name}
              </div>
              <div>
                <span className="font-medium">Email:</span> {registration.email}
              </div>
              <div>
                <span className="font-medium">Title:</span> {registration.primary_contact_title || 'Not specified'}
              </div>
              <div>
                <span className="font-medium">Organization Type:</span> 
                <Badge variant="secondary" className="ml-2">
                  {registration.is_private_nonprofit ? 'Private Non-Profit' : 'Public'}
                </Badge>
              </div>
            </div>
            
            {/* AI Verification Result */}
            {verificationResult && (
              <div className="mt-4 p-4 bg-white border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-sm text-blue-800 mb-2 flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  AI Verification Result
                </h4>
                <div className="text-sm text-gray-700 whitespace-pre-wrap prose prose-sm max-w-none">
                  {verificationResult.split('\n').map((line, index) => {
                    if (line.startsWith('**Verification Status:**')) {
                      const status = line.replace('**Verification Status:**', '').trim().toLowerCase();
                      return (
                        <div key={index} className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">Verification Status:</span>
                          {status.includes('yes') ? (
                            <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>
                          ) : status.includes('no') ? (
                            <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Not Verified</Badge>
                          ) : (
                            <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Unable to Verify</Badge>
                          )}
                        </div>
                      );
                    }
                    if (line.startsWith('**')) {
                      const parts = line.split(':**');
                      const label = parts[0].replace(/\*\*/g, '');
                      const value = parts.slice(1).join(':**').trim();
                      return (
                        <div key={index} className="mb-1">
                          <span className="font-semibold">{label}:</span> {value}
                        </div>
                      );
                    }
                    return line ? <p key={index} className="mb-1">{line}</p> : null;
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Organization Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-semibold text-lg text-gray-800">Organization Details</h3>
              {verificationStatus === 'verified' && (
                <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>
              )}
              {verificationStatus === 'not-verified' && (
                <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Not Verified</Badge>
              )}
              {verificationStatus === 'unable' && (
                <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Unable to Verify</Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Organization:</span> {registration.organization_name}
              </div>
              <div>
                <span className="font-medium">State Association:</span> {registration.state_association || 'Not specified'}
              </div>
              <div>
                <span className="font-medium">Student FTE:</span> {registration.student_fte || 'Not specified'}
              </div>
              <div>
                <span className="font-medium">Address:</span> {registration.address || 'Not specified'}
              </div>
              <div>
                <span className="font-medium">City:</span> {registration.city || 'Not specified'}
              </div>
              <div>
                <span className="font-medium">State:</span> {registration.state || 'Not specified'}
              </div>
              <div>
                <span className="font-medium">ZIP:</span> {registration.zip || 'Not specified'}
              </div>
            </div>
          </div>

          {/* Secondary Contact */}
          {(registration.secondary_first_name || registration.secondary_last_name) && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3 text-gray-800">Secondary Contact</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Name:</span> {registration.secondary_first_name} {registration.secondary_last_name}
                </div>
                <div>
                  <span className="font-medium">Title:</span> {registration.secondary_contact_title || 'Not specified'}
                </div>
                <div>
                  <span className="font-medium">Email:</span> {registration.secondary_contact_email || 'Not specified'}
                </div>
                <div>
                  <span className="font-medium">Phone:</span> {registration.secondary_contact_phone || 'Not specified'}
                </div>
              </div>
            </div>
          )}

          {/* Software Systems */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-3 text-gray-800">Software Systems</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: 'Student Information System', value: registration.student_information_system },
                { label: 'Financial System', value: registration.financial_system },
                { label: 'Financial Aid', value: registration.financial_aid },
                { label: 'HCM/HR', value: registration.hcm_hr },
                { label: 'Payroll System', value: registration.payroll_system },
                { label: 'Purchasing System', value: registration.purchasing_system },
                { label: 'Housing Management', value: registration.housing_management },
                { label: 'Learning Management', value: registration.learning_management },
                { label: 'Admissions CRM', value: registration.admissions_crm },
                { label: 'Alumni/Advancement CRM', value: registration.alumni_advancement_crm },
                { label: 'Payment Platform', value: registration.payment_platform },
                { label: 'Meal Plan Management', value: registration.meal_plan_management },
                { label: 'Identity Management', value: registration.identity_management },
                { label: 'Door Access', value: registration.door_access },
                { label: 'Document Management', value: registration.document_management },
                { label: 'VoIP', value: registration.voip },
                { label: 'Network Infrastructure', value: registration.network_infrastructure },
              ].map(({ label, value }) => (
                <div key={label}>
                  <span className="font-medium">{label}:</span> {value || 'Not specified'}
                </div>
              ))}
            </div>
          </div>

          {/* Primary Office Hardware */}
          {primaryOfficeList.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3 text-gray-800">Primary Office Hardware</h3>
              <div className="flex flex-wrap gap-2">
                {primaryOfficeList.map((item) => (
                  <Badge key={item.key} variant="outline">{item.label}</Badge>
                ))}
                {registration.primary_office_other && (
                  <Badge variant="outline">Other: {registration.primary_office_other_details}</Badge>
                )}
              </div>
            </div>
          )}

          {/* Additional Comments */}
          {registration.other_software_comments && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3 text-gray-800">Additional Comments</h3>
              <p className="text-sm text-gray-700">{registration.other_software_comments}</p>
            </div>
          )}

          {/* Requested Cohort Membership */}
          {registration.requested_cohorts && (
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-lg mb-3 text-purple-900">Requested Cohort Membership</h3>
              <p className="text-sm text-purple-800 mb-2">
                Requested to join the following cohorts:
              </p>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const cohorts = registration.requested_cohorts as any;
                  if (Array.isArray(cohorts)) {
                    return cohorts.map((cohort: string, index: number) => (
                      <Badge key={index} variant="default" className="bg-purple-600">
                        {cohort}
                      </Badge>
                    ));
                  }
                  if (typeof cohorts === 'object' && cohorts !== null) {
                    return Object.entries(cohorts).map(([key, value]) => (
                      <Badge key={key} variant="default" className="bg-purple-600">
                        {String(value) || key}
                      </Badge>
                    ));
                  }
                  return <span className="text-sm text-purple-700">{String(cohorts)}</span>;
                })()}
              </div>
            </div>
          )}

          {/* Partner Program Interest */}
          {registration.partner_program_interest && registration.partner_program_interest.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-lg mb-3 text-blue-900">Partner Program Interest</h3>
              <p className="text-sm text-blue-800 mb-2">
                Interested in learning more about HESS programs with:
              </p>
              <div className="flex flex-wrap gap-2">
                {registration.partner_program_interest.map((partner) => (
                  <Badge key={partner} variant="default" className="bg-blue-600">
                    {partner}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Registration Date */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-3 text-gray-800">Registration Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Submitted:</span> {new Date(registration.created_at).toLocaleString()}
              </div>
              {registration.approximate_date_joined_hess && (
                <div>
                  <span className="font-medium">Approximate Date Joined HESS:</span> {registration.approximate_date_joined_hess}
                </div>
              )}
            </div>
          </div>

          {/* Invoice Options */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <DollarSign className="h-5 w-5" />
                Invoice Options
              </CardTitle>
              {sendInvoice && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreviewModal(true)}
                  className="flex items-center gap-2"
                  disabled={!membershipStartDate || !invoiceAmount}
                >
                  <Eye className="h-4 w-4" />
                  Preview Invoice
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="send-invoice" 
                  checked={sendInvoice}
                  onCheckedChange={(checked) => {
                    setSendInvoice(checked as boolean);
                    if (checked) {
                      setShowInvoiceOptions(true);
                      // Set default membership start date to today
                      const today = new Date();
                      setMembershipStartDate(today.toISOString().split('T')[0]);
                    } else {
                      setShowInvoiceOptions(false);
                    }
                  }}
                />
                <Label htmlFor="send-invoice" className="text-blue-800 font-medium">
                  Send prorated membership invoice upon approval
                </Label>
              </div>

              {showInvoiceOptions && (
                <div className="space-y-4 pl-6 border-l-2 border-blue-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fee-tier">Annual Membership Fee Tier</Label>
                      <Select 
                        value={selectedFeeTier} 
                        onValueChange={(value) => {
                          setSelectedFeeTier(value);
                          const tier = feeTiers.find(t => t.id === value);
                          if (tier) {
                            setInvoiceAmount(tier.amount.toString());
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select fee tier" />
                        </SelectTrigger>
                        <SelectContent>
                          {feeTiers.map((tier) => (
                            <SelectItem key={tier.id} value={tier.id}>
                              {tier.name} - ${tier.amount.toLocaleString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="membership-start-date" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Membership Start Date
                      </Label>
                      <Input
                        id="membership-start-date"
                        type="date"
                        value={membershipStartDate}
                        onChange={(e) => setMembershipStartDate(e.target.value)}
                      />
                    </div>
                  </div>

                  {proratedAmount && (
                    <div className="bg-white p-3 rounded border border-blue-200">
                      <h4 className="font-medium text-blue-800 mb-2">Prorated Amount Calculation</h4>
                      <div className="text-sm space-y-1">
                        <div>Full Annual Fee: <span className="font-medium">${parseFloat(invoiceAmount).toLocaleString()}</span></div>
                        <div>Prorated Amount: <span className="font-bold text-blue-600">${proratedAmount.toLocaleString()}</span></div>
                        <div className="text-xs text-gray-600">
                          Based on membership starting {membershipStartDate ? new Date(membershipStartDate).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="invoice-notes" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Invoice Notes (Optional)
                    </Label>
                    <Textarea
                      id="invoice-notes"
                      value={invoiceNotes}
                      onChange={(e) => setInvoiceNotes(e.target.value)}
                      placeholder="Additional notes to include with the invoice..."
                      className="min-h-[60px]"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {!showRejectForm ? (
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleApprove}
                disabled={isSubmitting || (sendInvoice && !membershipStartDate)}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              >
                {isSubmitting ? 'Processing...' : (
                  <>
                    {sendInvoice && <Mail className="h-4 w-4" />}
                    {sendInvoice ? 'Approve & Send Invoice' : 'Approve Registration'}
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => setShowRejectForm(true)}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                Reject Registration
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason
                </label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejecting this registration..."
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={handleReject}
                  disabled={isSubmitting || !rejectionReason.trim()}
                  variant="destructive"
                >
                  {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                </Button>
                
                <Button
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectionReason('');
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Invoice Preview Modal */}
        <InvoicePreviewModal
          open={showPreviewModal}
          onOpenChange={setShowPreviewModal}
          organizationName={registration.organization_name}
          organizationEmail={registration.email}
          invoiceAmount={parseFloat(invoiceAmount)}
          proratedAmount={proratedAmount || undefined}
          membershipStartDate={membershipStartDate}
          notes={invoiceNotes}
        />
      </DialogContent>
    </Dialog>
  );
}