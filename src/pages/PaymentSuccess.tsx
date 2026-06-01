import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ProfessionalInvoice } from '@/components/ProfessionalInvoice';
import { Invoice } from '@/hooks/useInvoices';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, Printer, Home, Loader2, AlertTriangle } from 'lucide-react';

/**
 * Splash page shown after a successful Stripe embedded checkout. Verifies the
 * session server-side, then renders the member's branded invoice with a large
 * PAID stamp overlay. Reached via the EmbeddedCheckoutDialog onComplete handler.
 */
export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const invoiceIdParam = params.get('invoice');

  const [status, setStatus] = useState<'loading' | 'ok' | 'pending' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let resolvedInvoiceId = invoiceIdParam;
        let paid = false;

        if (sessionId) {
          const { data, error } = await supabase.functions.invoke(
            'get-stripe-session-status',
            { body: { sessionId } },
          );
          if (error) throw error;
          if ((data as any)?.error) throw new Error((data as any).error);
          setPaymentStatus(data?.paymentStatus ?? '');
          paid = data?.paymentStatus === 'paid';
          if (!resolvedInvoiceId && data?.invoiceId) {
            resolvedInvoiceId = data.invoiceId;
          }
        }

        if (resolvedInvoiceId) {
          const { data: inv, error: invErr } = await supabase
            .from('invoices')
            .select('*, organizations ( id, name, email, membership_status )')
            .eq('id', resolvedInvoiceId)
            .maybeSingle();
          if (invErr) throw invErr;
          if (!cancelled) setInvoice(inv as Invoice);
        }

        if (!cancelled) {
          setStatus(paid || !sessionId ? 'ok' : 'pending');
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? 'Unable to confirm payment');
          setStatus('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, invoiceIdParam]);

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
        .paid-stamp {
          position: absolute;
          top: 38%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-18deg);
          border: 8px solid hsl(142 71% 35%);
          color: hsl(142 71% 35%);
          padding: 0.5rem 2.5rem;
          font-size: 5rem;
          font-weight: 900;
          letter-spacing: 0.5rem;
          border-radius: 1rem;
          opacity: 0.85;
          pointer-events: none;
          background: rgba(255,255,255,0.4);
          text-shadow: 0 2px 4px rgba(0,0,0,0.1);
          font-family: Arial, sans-serif;
        }
      `}</style>

      <div className="max-w-4xl mx-auto">
        {/* Success banner */}
        <div className="no-print mb-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-6 text-center shadow-sm dark:from-green-950/30 dark:to-emerald-950/30 dark:border-green-900">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-10 w-10 animate-spin text-green-600" />
              <p className="text-lg font-medium">Confirming your payment…</p>
            </div>
          )}
          {status === 'ok' && (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 className="h-14 w-14 text-green-600" />
              <h1 className="text-3xl font-bold text-green-800 dark:text-green-300">
                Payment Successful
              </h1>
              <p className="text-muted-foreground max-w-xl">
                Thank you! Your membership payment has been received. A receipt copy of
                your invoice is shown below, marked PAID.
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                <Button onClick={handlePrint} variant="outline">
                  <Printer className="h-4 w-4 mr-2" /> Print receipt
                </Button>
                <Button asChild>
                  <Link to="/">
                    <Home className="h-4 w-4 mr-2" /> Return to portal
                  </Link>
                </Button>
              </div>
            </div>
          )}
          {status === 'pending' && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 text-amber-600 animate-spin" />
              <h1 className="text-2xl font-bold text-amber-700">Payment processing</h1>
              <p className="text-muted-foreground max-w-xl">
                Stripe reports status: <strong>{paymentStatus || 'pending'}</strong>.
                Your invoice will be marked paid automatically once Stripe confirms the
                charge.
              </p>
              <Button asChild variant="outline">
                <Link to="/">
                  <Home className="h-4 w-4 mr-2" /> Return to portal
                </Link>
              </Button>
            </div>
          )}
          {status === 'error' && (
            <Alert variant="destructive" className="text-left">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Could not confirm payment</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Invoice with PAID stamp */}
        {invoice && (
          <div className="relative bg-white rounded-lg border shadow-sm overflow-hidden">
            <ProfessionalInvoice invoice={invoice} />
            {(status === 'ok' || invoice.status === 'paid') && (
              <div className="paid-stamp">PAID</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
