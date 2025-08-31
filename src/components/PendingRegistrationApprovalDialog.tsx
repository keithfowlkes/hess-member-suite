import React, { useState } from 'react';
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
import { Mail, DollarSign, Calendar, FileText, Eye } from 'lucide-react';
import { InvoicePreviewModal } from '@/components/InvoicePreviewModal';

interface PendingRegistrationApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registration: PendingRegistration | null;
  onApprove: (registrationId: string, adminUserId?: string) => Promise<boolean>;
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
  const [invoiceAmount, setInvoiceAmount] = useState('1000');
  const [membershipStartDate, setMembershipStartDate] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const { user } = useAuth();
  const sendInvoiceMutation = useSendInvoice();

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
      const success = await onApprove(registration.id, user?.id);
      if (success && sendInvoice && membershipStartDate) {
        // Get the created organization ID after approval
        // For now, we'll use the registration ID as a placeholder
        await handleSendInvoice(registration.id);
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
        setSendInvoice(false);
        setShowInvoiceOptions(false);
        setMembershipStartDate('');
        setInvoiceNotes('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!registration) return null;

  const primaryOfficeList = [
    { key: 'primary_office_apple', label: 'Apple' },
    { key: 'primary_office_asus', label: 'ASUS' },
    { key: 'primary_office_dell', label: 'Dell' },
    { key: 'primary_office_hp', label: 'HP' },
    { key: 'primary_office_microsoft', label: 'Microsoft' },
  ].filter(item => registration[item.key as keyof PendingRegistration] === true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Review Registration: {registration.organization_name}
          </DialogTitle>
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
          </div>

          {/* Organization Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-3 text-gray-800">Organization Details</h3>
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

          {/* Registration Date */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-3 text-gray-800">Registration Details</h3>
            <div className="text-sm">
              <span className="font-medium">Submitted:</span> {new Date(registration.created_at).toLocaleString()}
            </div>
          </div>

          {/* Invoice Options */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <DollarSign className="h-5 w-5" />
                Invoice Options
              </CardTitle>
              {sendInvoice && membershipStartDate && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreviewModal(true)}
                  className="flex items-center gap-2"
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
                      <Label htmlFor="invoice-amount">Annual Membership Fee ($)</Label>
                      <Input
                        id="invoice-amount"
                        type="number"
                        value={invoiceAmount}
                        onChange={(e) => setInvoiceAmount(e.target.value)}
                        min="0"
                        step="0.01"
                      />
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