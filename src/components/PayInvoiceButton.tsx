import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { useStripeCheckout } from '@/hooks/useStripeCheckout';
import { useStripeEnabled } from '@/hooks/useStripeEnabled';
import { useToast } from '@/hooks/use-toast';

interface PayInvoiceButtonProps {
  invoiceId: string;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  label?: string;
}

/**
 * "Pay with card" button that creates a Stripe Checkout session for an
 * unpaid invoice. Renders nothing when Stripe is disabled in settings.
 */
export function PayInvoiceButton({
  invoiceId,
  size = 'default',
  className,
  label = 'Pay with card',
}: PayInvoiceButtonProps) {
  const { enabled, isLoading } = useStripeEnabled();
  const checkout = useStripeCheckout();
  const { toast } = useToast();

  const handleClick = () => {
    if (!enabled) {
      toast({
        title: 'Online payments are not configured yet',
        description: 'Enable Stripe in Admin Panel → Online Payments to start invoice checkout.',
        variant: 'destructive',
      });
      return;
    }

    checkout.mutate(invoiceId);
  };

  return (
    <Button
      size={size}
      className={className}
      variant={enabled ? 'default' : 'outline'}
      onClick={handleClick}
      disabled={checkout.isPending || isLoading}
    >
      {checkout.isPending ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Redirecting…
        </>
      ) : (
        <>
          <CreditCard className="h-4 w-4 mr-2" />
          {label}
        </>
      )}
    </Button>
  );
}
