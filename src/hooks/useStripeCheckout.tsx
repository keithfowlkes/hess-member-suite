import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Calls the create-stripe-checkout edge function for a specific invoice
 * and redirects the browser to the returned Stripe Checkout URL.
 */
export function useStripeCheckout() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await supabase.functions.invoke(
        'create-stripe-checkout',
        { body: { invoiceId } },
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      if (!data?.url) throw new Error('No checkout URL returned');
      return data.url as string;
    },
    onSuccess: (url) => {
      window.location.assign(url);
    },
    onError: (err: any) => {
      toast({
        title: 'Unable to start payment',
        description: err?.message ?? 'Please try again later.',
        variant: 'destructive',
      });
    },
  });
}
