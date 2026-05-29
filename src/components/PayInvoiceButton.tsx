import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { useStripeCheckout } from '@/hooks/useStripeCheckout';
import { useStripeEnabled } from '@/hooks/useStripeEnabled';

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
  const { enabled } = useStripeEnabled();
  const checkout = useStripeCheckout();

  if (!enabled) return null;

  return (
    <Button
      size={size}
      className={className}
      onClick={() => checkout.mutate(invoiceId)}
      disabled={checkout.isPending}
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
