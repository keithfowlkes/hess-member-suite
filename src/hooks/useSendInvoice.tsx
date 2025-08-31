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
      const { data, error } = await supabase.functions.invoke('send-invoice', {
        body: params
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Invoice Sent Successfully",
        description: `Prorated invoice sent to ${variables.organizationName} for $${data.amount}`,
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