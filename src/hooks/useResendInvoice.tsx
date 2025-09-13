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
      // Fetch invoice and organization email
      const { data: invoice, error: invErr } = await supabase
        .from('invoices')
        .select('id, invoice_number, amount, due_date, period_start_date, period_end_date, notes, organizations ( id, name, email )')
        .eq('id', invoiceId)
        .maybeSingle();
      if (invErr) throw invErr;
      if (!invoice) throw new Error('Invoice not found');
      const toEmail = (invoice as any).organizations?.email as string | undefined;
      if (!toEmail) throw new Error('Organization has no email');
      const subject = `HESS Consortium - Invoice ${(invoice as any).invoice_number || ''}`.trim();

      const invoiceEmailData = {
        organization_name: (invoice as any).organizations?.name || '',
        invoice_number: (invoice as any).invoice_number,
        amount: `$${(((invoice as any).amount || 0) as number).toLocaleString()}`,
        due_date: (invoice as any).due_date,
        period_start_date: (invoice as any).period_start_date,
        period_end_date: (invoice as any).period_end_date,
        notes: (invoice as any).notes || ''
      };

      const invoiceHTML = renderInvoiceEmailHTML(invoiceEmailData);

      const { data, error } = await supabase.functions.invoke('centralized-email-delivery-public', {
        body: {
          type: 'custom',
          to: toEmail,
          subject,
          template: invoiceHTML
        }
      });

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