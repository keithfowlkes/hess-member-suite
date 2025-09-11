import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProfessionalInvoice } from '@/components/ProfessionalInvoice';
import { Invoice } from '@/hooks/useInvoices';

interface MemberInvoiceViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
}

export function MemberInvoiceViewModal({ open, onOpenChange, invoice }: MemberInvoiceViewModalProps) {
  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice {invoice.invoice_number}</DialogTitle>
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