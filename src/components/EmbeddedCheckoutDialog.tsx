import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EmbeddedCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Either invoiceId OR testMode must be provided. */
  invoiceId?: string;
  testMode?: boolean;
  /** When testMode is true, dollar amount (defaults to 1.00). */
  testAmount?: number;
  /** Called after the user completes payment in the embedded UI. */
  onCompleted?: (info: { sessionId: string }) => void;
}

// Cache loadStripe by publishable key — Stripe recommends a single instance.
const stripePromiseCache = new Map<string, Promise<Stripe | null>>();
function getStripe(pk: string): Promise<Stripe | null> {
  let p = stripePromiseCache.get(pk);
  if (!p) {
    p = loadStripe(pk);
    stripePromiseCache.set(pk, p);
  }
  return p;
}

/**
 * Renders Stripe's secure Embedded Checkout inside a modal. Calls the
 * `create-stripe-embedded-session` edge function to obtain a session
 * client_secret, then mounts Stripe's iframe-based payment UI. The card
 * fields are hosted by Stripe — no card data ever touches our app.
 */
export function EmbeddedCheckoutDialog({
  open,
  onOpenChange,
  invoiceId,
  testMode = false,
  testAmount,
  onCompleted,
}: EmbeddedCheckoutDialogProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stripeMode, setStripeMode] = useState<'test' | 'live'>('test');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setClientSecret(null);
      setPublishableKey(null);
      setSessionId(null);
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.functions.invoke(
          'create-stripe-embedded-session',
          {
            body: testMode
              ? { testMode: true, amount: testAmount ?? 1 }
              : { invoiceId },
          },
        );
        if (cancelled) return;
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        if (!data?.clientSecret) throw new Error('No client secret returned');
        if (!data?.publishableKey) {
          throw new Error(
            'Publishable key not configured in Admin Panel → Online Payments.',
          );
        }
        setClientSecret(data.clientSecret);
        setPublishableKey(data.publishableKey);
        setSessionId(data.sessionId);
        setStripeMode(data.mode === 'live' ? 'live' : 'test');
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? 'Unable to start checkout');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, invoiceId, testMode, testAmount]);

  const onComplete = useCallback(() => {
    if (sessionId) onCompleted?.({ sessionId });
  }, [sessionId, onCompleted]);

  const options = useMemo(
    () => (clientSecret ? { clientSecret, onComplete } : null),
    [clientSecret, onComplete],
  );

  const stripePromise = useMemo(
    () => (publishableKey ? getStripe(publishableKey) : null),
    [publishableKey],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {testMode ? 'Stripe embedded test payment' : 'Secure payment'}
          </DialogTitle>
          <DialogDescription>
            Card details are entered directly into Stripe&apos;s PCI-compliant
            payment form. They never touch our servers.
            {stripeMode === 'test' && (
              <span className="ml-1 font-medium text-amber-600">
                Test mode — use 4242 4242 4242 4242, any future date, any CVC.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 pt-2 max-h-[75vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Preparing secure checkout…
            </div>
          )}
          {error && (
            <Alert variant="destructive" className="my-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Payment unavailable</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!loading && !error && options && stripePromise && (
            <div className="rounded-lg border bg-background">
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={options}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EmbeddedCheckoutDialog;
