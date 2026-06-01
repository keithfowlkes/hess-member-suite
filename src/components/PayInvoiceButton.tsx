import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';
import { useStripeEnabled } from '@/hooks/useStripeEnabled';
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
 * inline (no redirect). Renders disabled when Stripe is not configured.
 */
export function PayInvoiceButton({
  invoiceId,
  size = 'default',
  className,
  label = 'Pay with card',
}: PayInvoiceButtonProps) {
  const { enabled, isLoading } = useStripeEnabled();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);


  const handleClick = () => {
    if (!enabled) {
      toast({
        title: 'Online payments are not configured yet',
        description:
          'Enable Stripe in Admin Panel → Online Payments to start invoice checkout.',
        variant: 'destructive',
      });
      return;
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
      >
        <CreditCard className="h-4 w-4 mr-2" />
        {label}
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
