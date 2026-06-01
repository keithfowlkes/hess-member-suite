import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CreditCard, FlaskConical } from 'lucide-react';
import { useStripeEnabled } from '@/hooks/useStripeEnabled';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { EmbeddedCheckoutDialog } from '@/components/EmbeddedCheckoutDialog';
import { useQueryClient } from '@tanstack/react-query';

interface PayInvoiceButtonProps {
  invoiceId: string;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  label?: string;
}

/**
 * "Pay with card" button that opens Stripe's secure embedded checkout
 * inline (no redirect). Renders disabled when Stripe is not configured —
 * except for admins, who can always launch the embedded flow to test it
 * from the member view while keys are still in test mode.
 */
export function PayInvoiceButton({
  invoiceId,
  size = 'default',
  className,
  label = 'Pay with card',
}: PayInvoiceButtonProps) {
  const { enabled, isLoading } = useStripeEnabled();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const canPay = enabled || isAdmin;
  const adminTestOnly = !enabled && isAdmin;

  const handleClick = () => {
    if (!canPay) {
      toast({
        title: 'Online payments are not configured yet',
        description:
          'Enable Stripe in Admin Panel → Online Payments to start invoice checkout.',
        variant: 'destructive',
      });
      return;
    }
    if (adminTestOnly) {
      toast({
        title: 'Admin test mode',
        description:
          'Online payments are toggled off — launching embedded checkout with the configured test keys for admin verification.',
      });
    }
    setOpen(true);
  };

  return (
    <>
      <Button
        size={size}
        className={className}
        variant={enabled ? 'default' : 'outline'}
        onClick={handleClick}
        disabled={isLoading}
        title={adminTestOnly ? 'Admin test mode — payments toggle is off' : undefined}
      >
        {adminTestOnly ? (
          <FlaskConical className="h-4 w-4 mr-2" />
        ) : (
          <CreditCard className="h-4 w-4 mr-2" />
        )}
        {adminTestOnly ? `${label} (admin test)` : label}
      </Button>
      {open && (
        <EmbeddedCheckoutDialog
          open={open}
          onOpenChange={setOpen}
          invoiceId={invoiceId}
          onCompleted={({ sessionId }) => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['member-invoices'] });
            setOpen(false);
            navigate(
              `/payment/success?invoice=${encodeURIComponent(invoiceId)}&session_id=${encodeURIComponent(sessionId)}`,
            );
          }}
        />
      )}
    </>
  );
}

