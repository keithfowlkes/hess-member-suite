import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ProfessionalInvoice } from '@/components/ProfessionalInvoice';
import { Invoice } from '@/hooks/useInvoices';
import { PayInvoiceButton } from '@/components/PayInvoiceButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Printer, Download, Loader2, Forward } from 'lucide-react';
import { useSystemSetting } from '@/hooks/useSystemSettings';
import { useConferenceRegistrationCode } from '@/hooks/useConferenceRegistrationCode';
import { useUnifiedProfile } from '@/hooks/useUnifiedProfile';
import { useResendInvoice } from '@/hooks/useResendInvoice';
import { generateInvoicePdf } from '@/utils/generateInvoicePdf';
import { applyCurrentInvoicePeriod } from '@/utils/invoicePeriod';

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
  const [forwardComment, setForwardComment] = useState('');
  const [paymentMode, setPaymentMode] = useState<'card' | 'ach'>(() => {
    try {
      return (localStorage.getItem('invoice-view-mode') as 'card' | 'ach') || 'card';
    } catch { return 'card'; }
  });
  useEffect(() => {
    try { localStorage.setItem('invoice-view-mode', paymentMode); } catch { /* ignore */ }
  }, [paymentMode]);

  // Persist the forwarding comment across invoices/organizations for the session.
  useEffect(() => {
    try {
      const stored = localStorage.getItem('forward-invoice-comment');
      if (stored) setForwardComment(stored);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('forward-invoice-comment', forwardComment);
    } catch { /* ignore */ }
  }, [forwardComment]);


  const { data: termEndSetting } = useSystemSetting('default_term_end_date');
  const { data: stripeFeeSetting } = useSystemSetting('stripe_processing_fee');
  const stripeFee = Math.max(0, parseFloat(stripeFeeSetting?.setting_value || '9.27') || 0);
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
    return applyCurrentInvoicePeriod(invoice, termEndSetting?.setting_value);
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
      const logoImg = node.querySelector('.logo-section img') as HTMLImageElement | null;
      const pdf = await generateInvoicePdf({
        invoice: displayInvoice,
        registrationCode: registrationCodeData?.code || null,
        logoSrc: logoImg?.currentSrc || logoImg?.src || null,
        paymentMode,
        stripeFee,
      });

      const suffix = paymentMode === 'ach' ? '_ACH' : '';
      pdf.save(`Invoice_${displayInvoice.invoice_number}${suffix}.pdf`);
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
              {isPrimaryContactForInvoice && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setForwardEmail('');
                    setForwardOpen(true);
                  }}
                >
                  <Forward className="h-4 w-4 mr-2" />
                  Forward
                </Button>
              )}
              {isUnpaid && paymentMode === 'card' && <PayInvoiceButton invoiceId={displayInvoice.id} size="sm" label="Pay online" />}
            </div>
          </div>
        </DialogHeader>

        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-2 text-sm">
          <span className="font-medium">Payment method:</span>
          <div className="inline-flex overflow-hidden rounded-md border">
            <button
              type="button"
              onClick={() => setPaymentMode('card')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${paymentMode === 'card' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
            >
              Credit Card
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode('ach')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${paymentMode === 'ach' ? 'bg-green-700 text-white' : 'bg-background hover:bg-muted'}`}
            >
              ACH / Check — no processing fee
            </button>
          </div>
          {paymentMode === 'ach' && (
            <span className="text-xs text-muted-foreground">
              ${stripeFee.toFixed(2)} card fee removed. Download, print, or forward this ACH version.
            </span>
          )}
        </div>

        <div className="mt-4">
          <div ref={invoiceRef} id="member-invoice-printable" className="border rounded-lg bg-white">
            <ProfessionalInvoice invoice={displayInvoice} registrationCode={registrationCodeData?.code || null} paymentMode={paymentMode} />
          </div>
        </div>
      </DialogContent>


      <Dialog open={forwardOpen} onOpenChange={setForwardOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Forward invoice</DialogTitle>
            <DialogDescription>
              Send a copy of invoice {displayInvoice.invoice_number} to another email address (e.g. your business office).
              The invoice on file is not changed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forward-email">Recipient email</Label>
              <Input
                id="forward-email"
                type="email"
                placeholder="name@example.com"
                value={forwardEmail}
                onChange={(e) => setForwardEmail(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="forward-comment">Message (optional)</Label>
              <Textarea
                id="forward-comment"
                placeholder="Add a short note to appear at the top of the emailed invoice…"
                value={forwardComment}
                onChange={(e) => setForwardComment(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                This message is remembered between forwards so you can reuse it across invoices.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForwardOpen(false)} disabled={resendInvoice.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const email = forwardEmail.trim();
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
                resendInvoice.mutate(
                  { invoiceId: displayInvoice.id, overrideEmail: email, forwardComment, paymentMode },
                  { onSuccess: () => setForwardOpen(false) },
                );

              }}
              disabled={resendInvoice.isPending || !forwardEmail.trim()}
            >
              {resendInvoice.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending…
                </>
              ) : (
                'Send'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

