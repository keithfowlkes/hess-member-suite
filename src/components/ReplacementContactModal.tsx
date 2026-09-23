import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, ExternalLink, UserX, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useInvalidateContactVerifications, type ContactVerification } from '@/hooks/useContactVerifications';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  organization: { id: string; name: string; website?: string | null; profiles?: any } | null;
  verification?: ContactVerification;
}

export function ReplacementContactModal({ open, onOpenChange, organization, verification }: Props) {
  const invalidate = useInvalidateContactVerifications();
  const [loading, setLoading] = useState(false);
  const [local, setLocal] = useState<{ report: any; checkedAt: string } | null>(null);
  if (!organization) return null;

  const p = organization.profiles || {};
  const contactName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
  const report = local?.report ?? verification?.replacement_report;
  const checkedAt = local?.checkedAt ?? verification?.replacement_checked_at;

  const run = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('find-replacement-contact', {
        body: {
          organizationId: organization.id,
          organizationName: organization.name,
          contactName,
          contactTitle: p.primary_contact_title || verification?.contact_title || null,
          organizationWebsite: organization.website || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setLocal(data);
      invalidate();
    } catch (e: any) {
      toast.error(e.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const candidates: any[] = report?.candidates || [];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setLocal(null); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Replacement Contact Report</DialogTitle>
          <DialogDescription>{organization.name}</DialogDescription>
        </DialogHeader>

        <div className="rounded-md border p-3 text-sm space-y-1">
          <div className="flex items-center gap-2 font-medium"><UserX className="h-4 w-4 text-amber-600" />Listed primary contact (unverified)</div>
          <div>{contactName || '—'}{p.primary_contact_title ? ` · ${p.primary_contact_title}` : ''}</div>
          {verification ? (
            <div className="text-muted-foreground">
              Last check: {verification.status}{verification.summary ? ` — ${verification.summary}` : ''}
            </div>
          ) : <div className="text-muted-foreground">Not yet checked.</div>}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {checkedAt ? `Report generated ${new Date(checkedAt).toLocaleString()}` : 'No report yet.'}
          </div>
          <Button size="sm" onClick={run} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />}
            {report ? 'Search again' : 'Find current contact'}
          </Button>
        </div>

        {report && (
          <div className="space-y-3">
            {report.original_contact_status && (
              <div className="text-sm">Listed contact status: <Badge variant="outline">{report.original_contact_status}</Badge></div>
            )}
            {report.summary && <p className="text-sm text-muted-foreground">{report.summary}</p>}
            {candidates.length === 0 ? (
              <p className="text-sm">No one currently in this or a similar position was found.</p>
            ) : candidates.map((c, i) => (
              <div key={i} className="rounded-md border p-3 text-sm space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-medium"><UserCheck className="h-4 w-4 text-emerald-600" />{c.name}</div>
                  {c.confidence && <Badge variant="secondary">{c.confidence}</Badge>}
                </div>
                {c.title && <div>{c.title}</div>}
                {(c.email || c.phone) && <div className="text-muted-foreground">{[c.email, c.phone].filter(Boolean).join(' · ')}</div>}
                {c.reason && <div className="text-muted-foreground">{c.reason}</div>}
                {c.source_url && (
                  <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline break-all">
                    <ExternalLink className="h-3 w-3" />{c.source_url}
                  </a>
                )}
              </div>
            ))}
            <p className="text-xs text-muted-foreground">AI findings from public web sources — confirm before updating the contact.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
