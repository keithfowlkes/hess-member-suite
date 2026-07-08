import React, { useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ProfessionalInvoice } from '@/components/ProfessionalInvoice';
import { Invoice } from '@/hooks/useInvoices';
import { PayInvoiceButton } from '@/components/PayInvoiceButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer, Download, Loader2, Forward } from 'lucide-react';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { useSystemSetting } from '@/hooks/useSystemSettings';
import { useConferenceRegistrationCode } from '@/hooks/useConferenceRegistrationCode';
import { useUnifiedProfile } from '@/hooks/useUnifiedProfile';
import { useResendInvoice } from '@/hooks/useResendInvoice';
import liberationSansRegularUrl from '@/assets/fonts/LiberationSans-Regular.ttf?url';
import liberationSansBoldUrl from '@/assets/fonts/LiberationSans-Bold.ttf?url';

interface MemberInvoiceViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
}

export function MemberInvoiceViewModal({ open, onOpenChange, invoice }: MemberInvoiceViewModalProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardEmail, setForwardEmail] = useState('');

  const { data: termEndSetting } = useSystemSetting('default_term_end_date');
  const { data: registrationCodeData } = useConferenceRegistrationCode(invoice?.organization_id);
  const { data: unifiedProfile } = useUnifiedProfile();
  const resendInvoice = useResendInvoice();

  const isPrimaryContactForInvoice = Boolean(
    invoice &&
      unifiedProfile?.organization &&
      unifiedProfile.organization.id === invoice.organization_id &&
      unifiedProfile.organization.contact_person_id === unifiedProfile.profile?.id,
  );

  const displayInvoice = useMemo(() => {
    if (!invoice) return null;
    if (invoice.status === 'paid') return invoice;

    const termEndRaw = termEndSetting?.setting_value;
    if (!termEndRaw) return invoice;

    const match = String(termEndRaw).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return invoice;

    const endYear = parseInt(match[1], 10);
    const monthDay = `${match[2]}-${match[3]}`;
    return {
      ...invoice,
      period_start_date: `${endYear - 1}-${monthDay}`,
      period_end_date: `${endYear}-${monthDay}`,
    };
  }, [invoice, termEndSetting?.setting_value]);

  if (!displayInvoice) return null;

  const isUnpaid = displayInvoice.status !== 'paid';

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
          <title>Invoice ${displayInvoice.invoice_number}</title>
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
      const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'letter' });
      await registerInvoicePdfFonts(pdf);
      await drawInvoicePdf(pdf, displayInvoice, node, registrationCodeData?.code || null);

      pdf.save(`Invoice_${displayInvoice.invoice_number}.pdf`);
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
            <DialogTitle>Invoice {displayInvoice.invoice_number}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={downloading}>
                {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                {downloading ? 'Preparing…' : 'Download PDF'}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              {isUnpaid && <PayInvoiceButton invoiceId={displayInvoice.id} size="sm" label="Pay online" />}
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4">
          <div ref={invoiceRef} id="member-invoice-printable" className="border rounded-lg bg-white">
            <ProfessionalInvoice invoice={displayInvoice} registrationCode={registrationCodeData?.code || null} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

async function drawInvoicePdf(
  pdf: jsPDF,
  invoice: Invoice,
  sourceNode: HTMLElement,
  registrationCode: string | null,
) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;
  const right = pageWidth - margin;

  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.75);
  pdf.rect(24, 24, pageWidth - 48, pageHeight - 48);

  const logoElement = sourceNode.querySelector('.logo-section img') as HTMLImageElement | null;
  const logo = await imageToPdfData(logoElement?.currentSrc || logoElement?.src || '/lovable-uploads/c2026cbe-1547-4c12-ba1e-542841a78351.png');
  if (logo) {
    const maxLogoWidth = 92;
    const maxLogoHeight = 62;
    const ratio = Math.min(maxLogoWidth / logo.width, maxLogoHeight / logo.height);
    pdf.addImage(logo.dataUrl, logo.format, margin, 48, logo.width * ratio, logo.height * ratio, undefined, 'FAST');
  }

  setPdfText(pdf, 26, 'bold', right, 88, 'INVOICE', { align: 'right', color: [96, 96, 96] });
  setPdfText(pdf, 10, 'normal', right, 106, `Invoice #${invoice.invoice_number}`, { align: 'right', color: [96, 96, 96] });

  setPdfText(pdf, 12, 'bold', margin, 124, 'HESS Consortium');
  setPdfText(pdf, 10, 'normal', margin, 140, 'Higher Education Systems & Services Consortium', { color: [75, 85, 99] });
  setPdfText(pdf, 10, 'normal', margin, 154, 'A consortium of private, non-profit colleges and universities', { color: [75, 85, 99] });

  pdf.setDrawColor(102, 102, 102);
  pdf.setLineWidth(1);
  pdf.line(margin, 176, right, 176);

  const isPaid = invoice.status === 'paid';
  if (isPaid) {
    const stamp = createPaidStamp(invoice.paid_date ? safeFormat(invoice.paid_date, 'MMM dd, yyyy') : undefined);
    pdf.addImage(stamp, 'PNG', right - 164, 146, 154, 96, undefined, 'FAST');
  }

  const leftCol = margin;
  const rightCol = margin + contentWidth * 0.54;
  let y = 214;

  setPdfText(pdf, 13, 'bold', leftCol, y, 'Bill To:');
  setPdfText(pdf, 13, 'bold', rightCol, y, 'Invoice Details:');
  y += 22;
  setPdfText(pdf, 11, 'bold', leftCol, y, invoice.organizations?.name || '');
  setPdfText(pdf, 10, 'bold', rightCol, y, 'Invoice Date:');
  setPdfText(pdf, 10, 'normal', rightCol + 78, y, safeFormat(invoice.invoice_date, 'MMM dd, yyyy'));
  y += 16;
  setPdfText(pdf, 10, 'normal', leftCol, y, 'Organization Address');
  setPdfText(pdf, 10, 'bold', rightCol, y, 'Due Date:');
  setPdfText(pdf, 10, 'normal', rightCol + 78, y, safeFormat(invoice.due_date, 'MMM dd, yyyy'));
  y += 16;
  if (invoice.organizations?.email) {
    setPdfText(pdf, 10, 'normal', leftCol, y, invoice.organizations.email);
  }
  setPdfText(pdf, 10, 'bold', rightCol, y, 'Period:');
  setPdfText(
    pdf,
    10,
    'normal',
    rightCol + 78,
    y,
    `${safeFormat(invoice.period_start_date, 'MMM dd, yyyy')} - ${safeFormat(invoice.period_end_date, 'MMM dd, yyyy')}`,
  );

  y = 304;
  const tableX = margin;
  const tableWidth = contentWidth;
  const descWidth = 220;
  const periodWidth = 210;
  const amountWidth = tableWidth - descWidth - periodWidth;
  pdf.setFillColor(107, 114, 128);
  pdf.rect(tableX, y, tableWidth, 34, 'F');
  setPdfText(pdf, 11, 'bold', tableX + 10, y + 22, 'Description', { color: [255, 255, 255] });
  setPdfText(pdf, 11, 'bold', tableX + descWidth + 10, y + 22, 'Period', { color: [255, 255, 255] });
  setPdfText(pdf, 11, 'bold', right - 10, y + 22, 'Amount', { align: 'right', color: [255, 255, 255] });

  y += 34;
  pdf.setDrawColor(229, 231, 235);
  pdf.rect(tableX, y, tableWidth, 64);
  setPdfText(pdf, 11, 'bold', tableX + 10, y + 22, 'Annual Membership Fee');
  setPdfText(pdf, 9, 'normal', tableX + 10, y + 38, 'includes Stripe Processing Fee', { color: [96, 96, 96] });
  if (invoice.prorated_amount) {
    setPdfText(pdf, 9, 'normal', tableX + 10, y + 52, 'Prorated from membership start date', { color: [96, 96, 96] });
  }
  setPdfText(pdf, 10, 'normal', tableX + descWidth + 10, y + 31, `${safeFormat(invoice.period_start_date, 'MMM dd, yyyy')} - ${safeFormat(invoice.period_end_date, 'MMM dd, yyyy')}`);
  setPdfText(pdf, 10, 'normal', right - 10, y + 31, formatCurrency(invoice.prorated_amount || invoice.amount), { align: 'right' });

  y += 92;
  setPdfText(pdf, 13, 'bold', right, y, `Total Due: ${formatCurrency(invoice.prorated_amount || invoice.amount)}`, { align: 'right' });

  y += 34;
  if (invoice.notes) {
    setPdfText(pdf, 12, 'bold', margin, y, 'Notes:');
    y += 16;
    const noteLines = pdf.splitTextToSize(invoice.notes, contentWidth) as string[];
    setPdfText(pdf, 10, 'normal', margin, y, noteLines.slice(0, 2));
    y += Math.min(noteLines.length, 2) * 13 + 12;
  }

  if (registrationCode) {
    pdf.setDrawColor(12, 35, 64);
    pdf.setFillColor(243, 246, 251);
    pdf.roundedRect(margin, y, contentWidth, 62, 5, 5, 'FD');
    setPdfText(pdf, 11, 'bold', margin + 12, y + 19, 'HESS 2026 Conference Registration Code', { color: [12, 35, 64] });
    setPdfText(pdf, 9, 'normal', margin + 12, y + 35, 'Use this unique code to register one attendee from your institution for the HESS 2026 Conference.', { color: [68, 68, 68] });
    setPdfText(pdf, 13, 'bold', margin + 12, y + 53, registrationCode, { color: [12, 35, 64] });
    y += 78;
  }

  const paymentBoxTop = Math.min(y, 538);
  const paymentBoxHeight = 130;
  pdf.setFillColor(248, 249, 250);
  pdf.rect(margin, paymentBoxTop, contentWidth, paymentBoxHeight, 'F');
  pdf.setFillColor(107, 114, 128);
  pdf.rect(margin, paymentBoxTop, 4, paymentBoxHeight, 'F');
  setPdfText(pdf, 13, 'bold', margin + 16, paymentBoxTop + 25, 'Payment Information');
  setPdfText(pdf, 10, 'bold', margin + 16, paymentBoxTop + 45, 'Payment Terms:');
  setPdfText(pdf, 10, 'normal', margin + 106, paymentBoxTop + 45, 'Net 30 days');
  setPdfText(pdf, 10, 'bold', margin + 16, paymentBoxTop + 61, 'Due Date:');
  setPdfText(pdf, 10, 'normal', margin + 106, paymentBoxTop + 61, safeFormat(invoice.due_date, 'MMM dd, yyyy'));
  setPdfText(pdf, 10, 'normal', margin + 16, paymentBoxTop + 78, `Please include invoice number ${invoice.invoice_number} with your payment.`);
  pdf.setDrawColor(209, 213, 219);
  pdf.line(margin + 16, paymentBoxTop + 88, right - 16, paymentBoxTop + 88);
  setPdfText(pdf, 10, 'bold', margin + 16, paymentBoxTop + 106, 'Remit Check Payments To:');
  setPdfText(pdf, 10, 'normal', margin + 176, paymentBoxTop + 106, 'The HESS Consortium');
  setPdfText(pdf, 10, 'normal', margin + 176, paymentBoxTop + 121, '952 Winchester Rd #1051');
  setPdfText(pdf, 10, 'normal', margin + 340, paymentBoxTop + 121, 'Lexington, KY 40505');

  const footerTop = 692;
  setPdfText(pdf, 10, 'normal', pageWidth / 2, footerTop, 'Questions about your invoice?', { align: 'center', color: [96, 96, 96] });
  setPdfText(pdf, 10, 'normal', pageWidth / 2, footerTop + 16, 'Contact us at: billing@hessconsortium.org', { align: 'center', color: [96, 96, 96] });
  setPdfText(pdf, 10, 'normal', pageWidth / 2, footerTop + 32, 'Visit us online: www.hessconsortium.org', { align: 'center', color: [96, 96, 96] });
  setPdfText(pdf, 10, 'normal', pageWidth / 2, footerTop + 62, 'Thank you for being a valued member of the HESS Consortium community!', { align: 'center', color: [96, 96, 96] });
}

function setPdfText(
  pdf: jsPDF,
  size: number,
  style: 'normal' | 'bold',
  x: number,
  y: number,
  text: string | string[],
  options: { align?: 'left' | 'center' | 'right'; color?: [number, number, number] } = {},
) {
  const fontStyle = activeInvoicePdfFontFamily === INVOICE_PDF_FONT_FAMILY ? style : 'normal';
  pdf.setFont(activeInvoicePdfFontFamily, fontStyle);
  pdf.setFontSize(size);
  const [r, g, b] = options.color || [51, 51, 51];
  pdf.setTextColor(r, g, b);
  const align = options.align || 'left';
  pdf.text(text, x, y, { align });

  if (style === 'bold' && activeInvoicePdfFontFamily !== INVOICE_PDF_FONT_FAMILY) {
    pdf.text(text, x + 0.35, y, { align });
  }
}

const INVOICE_PDF_FONT_FAMILY = 'LiberationSans';
let activeInvoicePdfFontFamily = 'helvetica';
let invoicePdfFontPromise: Promise<{ regular: string; bold: string }> | null = null;

async function registerInvoicePdfFonts(pdf: jsPDF) {
  try {
    const fonts = await getInvoicePdfFonts();
    pdf.addFileToVFS('LiberationSans-Regular.ttf', fonts.regular);
    pdf.addFont('LiberationSans-Regular.ttf', INVOICE_PDF_FONT_FAMILY, 'normal');
    pdf.addFileToVFS('LiberationSans-Bold.ttf', fonts.bold);
    pdf.addFont('LiberationSans-Bold.ttf', INVOICE_PDF_FONT_FAMILY, 'bold');
    activeInvoicePdfFontFamily = INVOICE_PDF_FONT_FAMILY;
    pdf.setFont(INVOICE_PDF_FONT_FAMILY, 'normal');
  } catch (error) {
    activeInvoicePdfFontFamily = 'helvetica';
    console.warn('Failed to load embedded invoice PDF fonts; falling back to built-in font.', error);
  }
}

function getInvoicePdfFonts() {
  if (!invoicePdfFontPromise) {
    invoicePdfFontPromise = Promise.all([
      fetchFontAsBase64(liberationSansRegularUrl),
      fetchFontAsBase64(liberationSansBoldUrl),
    ]).then(([regular, bold]) => ({ regular, bold }));
  }
  return invoicePdfFontPromise;
}

async function fetchFontAsBase64(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load font: ${url}`);
  const buffer = await response.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function safeFormat(value: string | undefined, pattern: string) {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : format(parsed, pattern);
}

async function imageToPdfData(src: string): Promise<{ dataUrl: string; width: number; height: number; format: 'PNG' | 'JPEG' } | null> {
  try {
    const image = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0);
    return {
      dataUrl: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height,
      format: 'PNG',
    };
  } catch {
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function createPaidStamp(date?: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 520;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/png');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((-18 * Math.PI) / 180);
  ctx.strokeStyle = 'rgba(22, 163, 74, 0.9)';
  ctx.fillStyle = 'rgba(22, 163, 74, 0.92)';
  ctx.lineWidth = 16;
  roundedCanvasRect(ctx, -190, -82, 380, 164, 16);
  ctx.stroke();
  ctx.font = '900 112px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PAID', 0, -8);
  if (date) {
    ctx.font = '700 28px Arial, Helvetica, sans-serif';
    ctx.fillText(date.toUpperCase(), 0, 58);
  }
  return canvas.toDataURL('image/png');
}

function roundedCanvasRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

