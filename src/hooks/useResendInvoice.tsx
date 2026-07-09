import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { renderInvoiceEmailHTML } from '@/utils/invoiceEmailRenderer';

export interface ResendInvoiceParams {
  invoiceId: string;
  /**
   * Optional alternate recipient. When provided, the invoice email is sent
   * to this address instead of the organization's email on file. The invoice
   * record itself is not modified.
   */
  overrideEmail?: string;
  /**
   * Optional personal message rendered as a highlighted block at the top of
   * the forwarded invoice email.
   */
  forwardComment?: string;
  /**
   * When 'ach', the emailed invoice subtracts the configured Stripe processing
   * fee from the displayed amount, swaps the description sub-line, and hides
   * the "Pay this invoice online" button. Stored invoice is unchanged.
   */
  paymentMode?: 'card' | 'ach';
}


export const useResendInvoice = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ invoiceId, overrideEmail, forwardComment, paymentMode = 'card' }: ResendInvoiceParams) => {
      console.log('Resending invoice:', invoiceId, 'overrideEmail:', overrideEmail || '(none)', 'forwardComment:', forwardComment ? '(set)' : '(none)', 'paymentMode:', paymentMode);
      // Fetch invoice and organization email
      const { data: invoice, error: invErr } = await supabase
        .from('invoices')
        .select('id, invoice_number, amount, due_date, period_start_date, period_end_date, notes, organization_id, organizations ( id, name, email )')
        .eq('id', invoiceId)
        .maybeSingle();
      if (invErr) throw invErr;
      if (!invoice) throw new Error('Invoice not found');

      // Look up ACH fee subtraction amount
      let stripeFee = 9.27;
      try {
        const { data: feeRow } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'stripe_processing_fee')
          .maybeSingle();
        const parsed = parseFloat((feeRow as any)?.setting_value || '9.27');
        if (!Number.isNaN(parsed) && parsed >= 0) stripeFee = parsed;
      } catch { /* keep default */ }

      const rawAmount = Number((invoice as any).amount || 0);
      const displayAmount = paymentMode === 'ach' ? Math.max(0, rawAmount - stripeFee) : rawAmount;
      const amountString = `$${displayAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      console.log('Found invoice for resend:', invoice);
      const orgEmail = (invoice as any).organizations?.email as string | undefined;
      const toEmail = (overrideEmail && overrideEmail.trim()) || orgEmail;
      if (!toEmail) throw new Error('No recipient email available');
      const subject = `HESS Consortium - Invoice ${(invoice as any).invoice_number || ''}${paymentMode === 'ach' ? ' (ACH / Check version)' : ''}`.trim();

      // Look up the organization's conference registration code (if issued)
      const orgId = (invoice as any).organization_id || (invoice as any).organizations?.id;
      let registrationCode: string | undefined;
      if (orgId) {
        const { data: codeRow } = await supabase
          .from('conference_registration_codes')
          .select('code')
          .eq('organization_id', orgId)
          .eq('conference_slug', 'hess2026')
          .maybeSingle();
        registrationCode = (codeRow as any)?.code || undefined;
      }

      const invoiceEmailData = {
        organization_name: (invoice as any).organizations?.name || '',
        invoice_number: (invoice as any).invoice_number,
        invoice_id: (invoice as any).id,
        amount: amountString,
        due_date: (invoice as any).due_date,
        period_start_date: (invoice as any).period_start_date,
        period_end_date: (invoice as any).period_end_date,
        notes: (invoice as any).notes || '',
        registration_code: registrationCode,
        conference_label: 'HESS 2026',
        forward_comment: forwardComment && forwardComment.trim() ? forwardComment.trim() : undefined,
        payment_mode: paymentMode,
      };

      console.log('Resend invoice email data:', invoiceEmailData);
      const invoiceHTML = renderInvoiceEmailHTML(invoiceEmailData);

      const { data, error } = await supabase.functions.invoke('centralized-email-delivery-public', {
        body: {
          type: 'invoice',
          to: toEmail,
          subject,
          data: {
            organization_name: (invoice as any).organizations?.name || '',
            invoice_number: (invoice as any).invoice_number,
            amount: amountString,
            due_date: (invoice as any).due_date,
            period_start_date: (invoice as any).period_start_date,
            period_end_date: (invoice as any).period_end_date,
            notes: (invoice as any).notes || '',
            invoice_content: invoiceHTML
          }
        }
      });
      console.log('Resend email function response:', { data, error });

      if (error) throw error;
      return { data, sentTo: toEmail, overrideEmail: overrideEmail || null };
    },

    onSuccess: (result) => {
      toast({
        title: result?.overrideEmail ? 'Invoice sent to alternate email' : 'Invoice email sent',
        description: result?.sentTo
          ? `Invoice emailed to ${result.sentTo}.`
          : 'The invoice was emailed using centralized delivery.',
      });
    },
    onError: (error: any) => {
      console.error('Error resending invoice:', error);
      toast({
        title: "Error sending invoice email",
        description: error.message || "Failed to send invoice email",
        variant: "destructive"
      });
    }
  });
};
