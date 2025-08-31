import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ResendInvoiceParams {
  invoiceId: string;
}

export const useResendInvoice = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: ResendInvoiceParams) => {
      const { data, error } = await supabase.functions.invoke('resend-invoice', {
        body: params
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Invoice Resent Successfully",
        description: `Invoice ${data.invoiceNumber} has been resent for $${data.amount}`,
      });
    },
    onError: (error: any) => {
      console.error('Error resending invoice:', error);
      toast({
        title: "Error Resending Invoice",
        description: error.message || "Failed to resend invoice",
        variant: "destructive"
      });
    }
  });
};