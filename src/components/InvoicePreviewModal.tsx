import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ProfessionalInvoice } from '@/components/ProfessionalInvoice';
import { format } from 'date-fns';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Function to download invoice as PDF
  const downloadPDF = async () => {
    if (!invoiceRef.current) return;

    try {
      // Capture the invoice element as canvas
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      
      // Calculate dimensions to fit A4
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;
      
      // Center the image on the page
      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
      
      // Generate filename
      const fileName = `Invoice_Preview_${organizationName.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      
      // Download the PDF
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

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
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">
                Invoice Preview - {organizationName}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                This is a preview of the prorated invoice that will be sent upon approval.
              </p>
            </div>
            <Button 
              onClick={downloadPDF}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </DialogHeader>
        
        <div className="mt-4">
          <div ref={invoiceRef} className="border rounded-lg bg-white">
            <ProfessionalInvoice invoice={mockInvoice} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}