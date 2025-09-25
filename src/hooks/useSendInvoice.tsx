import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
      
      // Use the detailed send-invoice function to ensure consistent formatting
      const { data, error } = await supabase.functions.invoke('send-invoice', {
        body: {
          organizationId: params.organizationId,
          organizationName: params.organizationName,
          organizationEmail: params.organizationEmail,
          membershipStartDate: params.membershipStartDate,
          proratedAmount: params.proratedAmount,
          invoiceAmount: params.invoiceAmount,
          periodStartDate: params.periodStartDate,
          periodEndDate: params.periodEndDate,
          notes: params.notes
        }
      });
      
      console.log('Send invoice function response:', { data, error });

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      toast({
        title: "Invoice Generated & Sent",
        description: `Professional invoice created and emailed to ${variables.organizationName}.`,
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