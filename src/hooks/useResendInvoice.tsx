import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { renderInvoiceEmailHTML } from '@/utils/invoiceEmailRenderer';

export interface ResendInvoiceParams {
  invoiceId: string;
}

export const useResendInvoice = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ invoiceId }: ResendInvoiceParams) => {
      console.log('Resending invoice:', invoiceId);
      // Fetch invoice and organization email
      const { data: invoice, error: invErr } = await supabase
        .from('invoices')
        .select('id, invoice_number, amount, due_date, period_start_date, period_end_date, notes, organization_id, organizations ( id, name, email )')
        .eq('id', invoiceId)
        .maybeSingle();
      if (invErr) throw invErr;
      if (!invoice) throw new Error('Invoice not found');
      
      console.log('Found invoice for resend:', invoice);
      const toEmail = (invoice as any).organizations?.email as string | undefined;
      if (!toEmail) throw new Error('Organization has no email');
      const subject = `HESS Consortium - Invoice ${(invoice as any).invoice_number || ''}`.trim();

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
        amount: `$${(((invoice as any).amount || 0) as number).toLocaleString()}`,
        due_date: (invoice as any).due_date,
        period_start_date: (invoice as any).period_start_date,
        period_end_date: (invoice as any).period_end_date,
        notes: (invoice as any).notes || '',
        registration_code: registrationCode,
        conference_label: 'HESS 2026',
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
            amount: `$${(((invoice as any).amount || 0) as number).toLocaleString()}`,
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
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Invoice email sent",
        description: "The invoice was emailed using centralized delivery.",
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