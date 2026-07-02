import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProfessionalInvoice } from '@/components/ProfessionalInvoice';
import { Invoice } from '@/hooks/useInvoices';
import { PayInvoiceButton } from '@/components/PayInvoiceButton';
import { Button } from '@/components/ui/button';
import { Printer, Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface MemberInvoiceViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
}

export function MemberInvoiceViewModal({ open, onOpenChange, invoice }: MemberInvoiceViewModalProps) {
  if (!invoice) return null;

  const isUnpaid = invoice.status !== 'paid';

  const handlePrint = () => {
    const node = document.getElementById('member-invoice-printable');
    if (!node) {
      window.print();
      return;
    }
    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) {
      window.print();
      return;
    }
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join('\n');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoice_number}</title>
          ${styles}
          <style>
            body { margin: 0; padding: 24px; background: white; }
            @media print { @page { margin: 0.5in; } }
          </style>
        </head>
        <body>${node.outerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <DialogTitle>Invoice {invoice.invoice_number}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              {isUnpaid && <PayInvoiceButton invoiceId={invoice.id} size="sm" label="Pay online" />}
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4">
          <div id="member-invoice-printable" className="border rounded-lg bg-white">
            <ProfessionalInvoice invoice={invoice} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
