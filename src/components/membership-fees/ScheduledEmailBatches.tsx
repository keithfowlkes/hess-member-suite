import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Loader2, Ban, RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface BatchRow {
  batch_id: string;
  email_type: string | null;
  pending: number;
  sent: number;
  failed: number;
  cancelled: number;
  first_scheduled: string | null;
  last_scheduled: string | null;
  next_scheduled: string | null;
  created_at: string | null;
}

export function ScheduledEmailBatches() {
  const { toast } = useToast();
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    // Fetch recent queue rows (active batches: those with pending, or recently created)
    const { data, error } = await supabase
      .from('scheduled_email_queue')
      .select('batch_id,email_type,status,scheduled_send_at,created_at')
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) {
      console.error('Failed to load scheduled email queue:', error);
      toast({ title: 'Could not load scheduled batches', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    const map = new Map<string, BatchRow>();
    const nowIso = new Date().toISOString();
    for (const row of data || []) {
      const id = (row as any).batch_id as string;
      if (!id) continue;
      let b = map.get(id);
      if (!b) {
        b = {
          batch_id: id,
          email_type: (row as any).email_type ?? null,
          pending: 0, sent: 0, failed: 0, cancelled: 0,
          first_scheduled: null, last_scheduled: null, next_scheduled: null,
          created_at: (row as any).created_at ?? null,
        };
        map.set(id, b);
      }
      const status = (row as any).status as string;
      if (status === 'pending') b.pending++;
      else if (status === 'sent') b.sent++;
      else if (status === 'failed') b.failed++;
      else if (status === 'cancelled') b.cancelled++;

      const sched = (row as any).scheduled_send_at as string | null;
      if (sched) {
        if (!b.first_scheduled || sched < b.first_scheduled) b.first_scheduled = sched;
        if (!b.last_scheduled || sched > b.last_scheduled) b.last_scheduled = sched;
        if (status === 'pending' && sched >= nowIso) {
          if (!b.next_scheduled || sched < b.next_scheduled) b.next_scheduled = sched;
        }
      }
    }

    const list = Array.from(map.values())
      // Show batches with anything pending, or sent within last 24h for context
      .filter(b => b.pending > 0 || (b.created_at && Date.now() - new Date(b.created_at).getTime() < 24 * 3600 * 1000))
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

    setBatches(list);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const cancelBatch = async (batchId: string) => {
    setCancellingId(batchId);
    try {
      const { error, count } = await supabase
        .from('scheduled_email_queue')
        .update({ status: 'cancelled' }, { count: 'exact' })
        .eq('batch_id', batchId)
        .eq('status', 'pending');

      if (error) throw error;
      toast({
        title: 'Bulk delivery cancelled',
        description: `${count ?? 0} pending email${count === 1 ? '' : 's'} cancelled. Already-sent emails are unaffected.`,
      });
      await load();
    } catch (e: any) {
      console.error('Cancel batch failed:', e);
      toast({ title: 'Cancel failed', description: e.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setCancellingId(null);
    }
  };

  if (loading && batches.length === 0) {
    return null;
  }

  if (batches.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">Scheduled invoice deliveries</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Bulk runs metered over 12 hours. You can cancel any pending emails before they send.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {batches.map((b) => {
          const total = b.pending + b.sent + b.failed + b.cancelled;
          const inProgress = b.pending > 0;
          return (
            <div key={b.batch_id} className="border rounded-md p-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">
                    {b.email_type || 'bulk'} · {total} email{total === 1 ? '' : 's'}
                  </span>
                  {inProgress ? (
                    <Badge variant="secondary">In progress</Badge>
                  ) : (
                    <Badge variant="outline">Complete</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1 space-x-3">
                  <span>Sent: <strong>{b.sent}</strong></span>
                  <span>Pending: <strong>{b.pending}</strong></span>
                  {b.failed > 0 && <span>Failed: <strong>{b.failed}</strong></span>}
                  {b.cancelled > 0 && <span>Cancelled: <strong>{b.cancelled}</strong></span>}
                </div>
                {inProgress && b.next_scheduled && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Next send: {format(new Date(b.next_scheduled), 'MMM d, h:mm a')}
                    {b.last_scheduled && (
                      <> · Window ends: {format(new Date(b.last_scheduled), 'MMM d, h:mm a')}</>
                    )}
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground mt-1 font-mono truncate">
                  batch {b.batch_id}
                </div>
              </div>
              {inProgress && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={cancellingId === b.batch_id}
                    >
                      {cancellingId === b.batch_id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Ban className="h-4 w-4 mr-2" />
                      )}
                      Cancel remaining
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel {b.pending} pending email{b.pending === 1 ? '' : 's'}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This stops any unsent invoice emails in this batch. Emails that have already been sent
                        cannot be recalled, and the underlying invoices remain in the database.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep sending</AlertDialogCancel>
                      <AlertDialogAction onClick={() => cancelBatch(b.batch_id)}>
                        Cancel remaining
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
