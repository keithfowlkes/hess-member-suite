import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProfessionalInvoice } from '@/components/ProfessionalInvoice';
import { Invoice } from '@/hooks/useInvoices';
import { PayInvoiceButton } from '@/components/PayInvoiceButton';

interface MemberInvoiceViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
}

export function MemberInvoiceViewModal({ open, onOpenChange, invoice }: MemberInvoiceViewModalProps) {
  if (!invoice) return null;

  const isUnpaid = invoice.status !== 'paid';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <DialogTitle>Invoice {invoice.invoice_number}</DialogTitle>
            {isUnpaid && <PayInvoiceButton invoiceId={invoice.id} size="sm" />}
          </div>
        </DialogHeader>

        <div className="mt-4">
          <div className="border rounded-lg bg-white">
            <ProfessionalInvoice invoice={invoice} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
