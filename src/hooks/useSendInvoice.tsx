import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { renderInvoiceEmailHTML } from '@/utils/invoiceEmailRenderer';

export interface SendInvoiceParams {
  organizationId: string;
  organizationName: string;
  organizationEmail: string;
  membershipStartDate: string;
  invoiceAmount: number;
  proratedAmount?: number;
  periodStartDate: string;
  periodEndDate: string;
  notes?: string;
}

export const useSendInvoice = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: SendInvoiceParams) => {
      console.log('Sending new invoice with params:', params);
      const invoiceEmailData = {
        organization_name: params.organizationName,
        invoice_number: `INV-${Date.now()}`, // Generate a temporary invoice number
        amount: `$${(params.proratedAmount ?? params.invoiceAmount).toLocaleString()}`,
        prorated_amount: params.proratedAmount ? `$${params.proratedAmount.toLocaleString()}` : undefined,
        due_date: params.periodEndDate,
        period_start_date: params.periodStartDate,
        period_end_date: params.periodEndDate,
        notes: params.notes || ''
      };

      console.log('New invoice email data:', invoiceEmailData);
      const invoiceHTML = renderInvoiceEmailHTML(invoiceEmailData);
      const subject = `HESS Consortium - Invoice for ${params.organizationName}`;

      const { data, error } = await supabase.functions.invoke('centralized-email-delivery-public', {
        body: {
          type: 'invoice',
          to: params.organizationEmail,
          subject,
          data: {
            organization_name: params.organizationName,
            invoice_number: `INV-${Date.now()}`,
            amount: `$${(params.proratedAmount ?? params.invoiceAmount).toLocaleString()}`,
            due_date: params.periodEndDate,
            period_start_date: params.periodStartDate,
            period_end_date: params.periodEndDate,
            notes: params.notes || '',
            invoice_content: invoiceHTML
          }
        }
      });
      console.log('New invoice email function response:', { data, error });

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      toast({
        title: "Invoice Email Sent",
        description: `Invoice emailed to ${variables.organizationName} via centralized delivery.`,
      });
    },
    onError: (error: any) => {
      console.error('Error sending invoice:', error);
      toast({
        title: "Error Sending Invoice",
        description: error.message || "Failed to send invoice",
        variant: "destructive"
      });
    }
  });
};