import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProfessionalInvoice } from '@/components/ProfessionalInvoice';
import { format } from 'date-fns';

interface InvoicePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationName: string;
  organizationEmail: string;
  invoiceAmount: number;
  proratedAmount?: number;
  membershipStartDate: string;
  notes?: string;
}

export function InvoicePreviewModal({
  open,
  onOpenChange,
  organizationName,
  organizationEmail,
  invoiceAmount,
  proratedAmount,
  membershipStartDate,
  notes
}: InvoicePreviewModalProps) {
  // Create a mock invoice object for preview
  const mockInvoice = {
    id: 'preview',
    invoice_number: 'PREVIEW-001',
    amount: invoiceAmount,
    prorated_amount: proratedAmount,
    invoice_date: new Date().toISOString(),
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    period_start_date: membershipStartDate,
    period_end_date: new Date(new Date().getFullYear(), 11, 31).toISOString(), // End of current year
    status: 'draft' as const,
    notes: notes || '',
    organizations: {
      id: 'preview-org',
      name: organizationName,
      email: organizationEmail,
      membership_status: 'active'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    organization_id: 'preview-org'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Invoice Preview - {organizationName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            This is a preview of the prorated invoice that will be sent upon approval.
          </p>
        </DialogHeader>
        
        <div className="mt-4">
          <div className="border rounded-lg bg-white">
            <ProfessionalInvoice invoice={mockInvoice} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}