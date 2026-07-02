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
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

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

  const handleDownloadPDF = async () => {
    const node = invoiceRef.current;
    if (!node) return;
    setDownloading(true);
    try {
      // Render at high scale for crisp text; use white background to match on-screen preview.
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        windowWidth: node.scrollWidth,
      });

      const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'letter' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;

      // Scale image to fit page width; paginate vertically if it overflows.
      const imgWidth = usableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= usableHeight) {
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, imgWidth, imgHeight, undefined, 'FAST');
      } else {
        // Multi-page: slice source canvas by page height in source pixels.
        const pxPerPage = (usableHeight * canvas.width) / imgWidth;
        let offsetY = 0;
        let pageIndex = 0;
        while (offsetY < canvas.height) {
          const sliceHeight = Math.min(pxPerPage, canvas.height - offsetY);
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceHeight;
          const ctx = pageCanvas.getContext('2d');
          if (!ctx) break;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(canvas, 0, offsetY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
          const sliceImgHeight = (sliceHeight * imgWidth) / canvas.width;
          if (pageIndex > 0) pdf.addPage();
          pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', margin, margin, imgWidth, sliceImgHeight, undefined, 'FAST');
          offsetY += sliceHeight;
          pageIndex += 1;
        }
      }

      pdf.save(`Invoice_${invoice.invoice_number}.pdf`);
    } catch (err) {
      console.error('Failed to generate invoice PDF:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <DialogTitle>Invoice {invoice.invoice_number}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={downloading}>
                {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                {downloading ? 'Preparing…' : 'Download PDF'}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              {isUnpaid && <PayInvoiceButton invoiceId={invoice.id} size="sm" label="Pay online" />}
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4">
          <div ref={invoiceRef} id="member-invoice-printable" className="border rounded-lg bg-white">
            <ProfessionalInvoice invoice={invoice} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

