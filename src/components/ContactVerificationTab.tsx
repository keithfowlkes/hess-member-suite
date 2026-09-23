import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BadgeCheck, Download, Loader2, Play, Search, Square, ExternalLink } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import type { Organization } from '@/hooks/useMembers';
import {
  useContactVerifications,
  useInvalidateContactVerifications,
  isCurrentlyVerified,
  type ContactVerification,
} from '@/hooks/useContactVerifications';

type RowState = 'verified' | 'likely' | 'unverified' | 'not_found' | 'stale' | 'never' | 'no_contact';

const labels: Record<RowState, string> = {
  verified: 'Verified',
  likely: 'Likely',
  unverified: 'Unverified',
  not_found: 'Not Found',
  stale: 'Contact changed',
  never: 'Not checked',
  no_contact: 'No contact',
};

const badgeClass: Record<RowState, string> = {
  verified: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  likely: 'bg-sky-100 text-sky-800 border-sky-200',
  unverified: 'bg-amber-100 text-amber-800 border-amber-200',
  not_found: 'bg-red-100 text-red-800 border-red-200',
  stale: 'bg-muted text-muted-foreground',
  never: 'bg-muted text-muted-foreground',
  no_contact: 'bg-muted text-muted-foreground',
};

function rowState(org: Organization, v?: ContactVerification): RowState {
  const p = org.profiles;
  if (!p?.first_name && !p?.last_name) return 'no_contact';
  if (!v) return 'never';
  const current = `${p?.first_name || ''} ${p?.last_name || ''}`.trim().toLowerCase();
  if (v.contact_name.trim().toLowerCase() !== current) return 'stale';
  const s = v.status.toUpperCase();
  if (s === 'VERIFIED') return 'verified';
  if (s === 'LIKELY') return 'likely';
  if (s === 'NOT_FOUND') return 'not_found';
  return 'unverified';
}

export function ContactVerificationTab({ organizations }: { organizations: Organization[] }) {
  const { data: verifications = {}, isLoading } = useContactVerifications();
  const invalidate = useInvalidateContactVerifications();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'verified' | 'not_verified' | 'never'>('all');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, current: '' });
  const stopRef = useRef(false);

  const rows = useMemo(() => organizations
    .map((org) => ({ org, v: verifications[org.id], state: rowState(org, verifications[org.id]) }))
    .sort((a, b) => a.org.name.localeCompare(b.org.name)), [organizations, verifications]);

  const counts = useMemo(() => {
    const c = { verified: 0, notVerified: 0, never: 0 };
    rows.forEach((r) => {
      if (r.state === 'verified') c.verified++;
      else if (r.state === 'never' || r.state === 'stale') c.never++;
      else if (r.state !== 'no_contact') c.notVerified++;
    });
    return c;
  }, [rows]);

  const pctStats = useMemo(() => {
    const withContactCount = rows.filter((r) => r.state !== 'no_contact').length;
    if (withContactCount === 0) return { verifiedPct: 0, notVerifiedPct: 0, total: 0 };
    const verifiedPct = Math.round((counts.verified / withContactCount) * 100);
    return { verifiedPct, notVerifiedPct: 100 - verifiedPct, total: withContactCount };
  }, [rows, counts]);

  const visible = rows.filter(({ org, state }) => {
    const q = search.trim().toLowerCase();
    const name = `${org.profiles?.first_name || ''} ${org.profiles?.last_name || ''}`.toLowerCase();
    if (q && !org.name.toLowerCase().includes(q) && !name.includes(q)) return false;
    if (filter === 'verified') return state === 'verified';
    if (filter === 'not_verified') return ['likely', 'unverified', 'not_found'].includes(state);
    if (filter === 'never') return state === 'never' || state === 'stale';
    return true;
  });

  const verifyOne = async (org: Organization) => {
    const p = org.profiles!;
    const contactName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
    const { data, error } = await supabase.functions.invoke('verify-contact-ai', {
      body: {
        organizationName: org.name,
        firstName: p.first_name,
        lastName: p.last_name,
        title: p.primary_contact_title || null,
      },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Verification failed');
    const s = data.structured || {};
    const { data: auth } = await supabase.auth.getUser();
    let status = (s.verificationStatus || 'UNKNOWN').toUpperCase();
    let contactTitle: string | null = p.primary_contact_title || null;
    let notes: string | null = s.notes || null;
    const ft = String(s.foundTitle || '').trim();
    const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, '');
    if ((status === 'VERIFIED' || status === 'LIKELY') && ft && !/^not found$/i.test(ft) && norm(ft) !== norm(contactTitle || '')) {
      await supabase.from('organizations').update({ primary_contact_title: ft }).eq('id', org.id);
      if ((org as any).contact_person_id) {
        await supabase.from('profiles').update({ primary_contact_title: ft }).eq('id', (org as any).contact_person_id);
      }
      notes = `Title updated from "${contactTitle || '(none)'}" to "${ft}". ${notes || ''}`.trim();
      contactTitle = ft;
      status = 'VERIFIED';
      toast.success(`${org.name}: title updated to "${ft}"`);
    }
    const { error: saveError } = await (supabase as any).from('contact_verifications').upsert({
      organization_id: org.id,
      contact_name: contactName,
      contact_title: contactTitle,
      status,
      confidence: s.confidence || null,
      found_title: s.foundTitle || null,
      summary: s.summary || null,
      linkedin_url: s.linkedinUrl || null,
      institutional_url: s.institutionalUrl || null,
      notes,
      verified_by: auth.user?.id || null,
      verified_at: new Date().toISOString(),
    }, { onConflict: 'organization_id' });
    if (saveError) throw saveError;
  };

  const runBatch = async (targets: Organization[]) => {
    if (targets.length === 0) {
      toast.info('No organizations to verify');
      return;
    }
    stopRef.current = false;
    setRunning(true);
    setProgress({ done: 0, total: targets.length, current: '' });
    let failures = 0;
    for (let i = 0; i < targets.length; i++) {
      if (stopRef.current) break;
      const org = targets[i];
      setProgress({ done: i, total: targets.length, current: org.name });
      try {
        await verifyOne(org);
      } catch (err: any) {
        failures++;
        const msg = String(err?.message || err);
        console.error('Verification failed for', org.name, msg);
        if (/402|credits|429|rate/i.test(msg)) {
          toast.error('Verification paused: AI usage limit reached. Try again later.');
          break;
        }
      }
      if ((i + 1) % 5 === 0) invalidate();
    }
    invalidate();
    setRunning(false);
    setProgress((p) => ({ ...p, done: p.total, current: '' }));
    toast.success(`Batch verification finished${failures ? ` (${failures} failed)` : ''}`);
  };

  const qc = useQueryClient();
  const { data: queue } = useQuery({
    queryKey: ['contact-verification-queue'],
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('contact_verification_queue')
        .select('organization_id, scheduled_for, status');
      if (error) throw error;
      return (data || []) as { organization_id: string; scheduled_for: string; status: string }[];
    },
  });
  const pendingQueue = (queue || []).filter((q) => q.status === 'pending');
  const queuedIds = new Set(pendingQueue.map((q) => q.organization_id));
  const lastScheduled = pendingQueue.reduce<string | null>((m, q) => (!m || q.scheduled_for > m ? q.scheduled_for : m), null);
  const [scheduling, setScheduling] = useState(false);
  const BATCH_KEY = 'cv-batch-total';
  const storedTotal = Number(typeof window !== 'undefined' ? localStorage.getItem(BATCH_KEY) : 0) || 0;
  const batchTotal = Math.max(storedTotal, pendingQueue.length);
  const batchDone = batchTotal - pendingQueue.length;
  const batchPct = batchTotal ? Math.round((batchDone / batchTotal) * 100) : 0;
  useEffect(() => {
    if (queue && pendingQueue.length === 0 && storedTotal) localStorage.removeItem(BATCH_KEY);
  }, [queue, pendingQueue.length, storedTotal]);
  useEffect(() => {
    const ch = supabase
      .channel('cv-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_verification_queue' }, () => {
        qc.invalidateQueries({ queryKey: ['contact-verification-queue'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_verifications' }, () => {
        qc.invalidateQueries({ queryKey: ['contact-verification-queue'] });
        qc.invalidateQueries({ queryKey: ['contact-verifications'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  /** Spread checks evenly across the next 8 hours so the AI service is never flooded. */

  const scheduleBatch = async (targets: Organization[]) => {
    const list = targets.filter((o) => !queuedIds.has(o.id));
    if (list.length === 0) {
      toast.info('No new organizations to schedule');
      return;
    }
    setScheduling(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const FIRST_BATCH = 3;
      const rest = Math.max(list.length - FIRST_BATCH, 1);
      const spacing = (8 * 60 * 60 * 1000) / rest;
      const now = Date.now();
      const rows = list.map((o, i) => ({
        organization_id: o.id,
        scheduled_for: new Date(i < FIRST_BATCH ? now - 1000 : now + (i - FIRST_BATCH + 1) * spacing).toISOString(),
        status: 'pending',
        attempts: 0,
        last_error: null,
        queued_by: auth.user?.id || null,
      }));
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await (supabase as any)
          .from('contact_verification_queue')
          .upsert(rows.slice(i, i + 200), { onConflict: 'organization_id' });
        if (error) throw error;
      }
      const { error: jobError } = await (supabase as any).rpc('ensure_contact_verification_job');
      if (jobError) throw jobError;
      localStorage.setItem(BATCH_KEY, String(pendingQueue.length + list.length));
      qc.invalidateQueries({ queryKey: ['contact-verification-queue'] });
      // Start the first batch right away instead of waiting for the next background wake-up.
      supabase.functions.invoke('process-contact-verification-queue', { body: {} })
        .then(() => {
          qc.invalidateQueries({ queryKey: ['contact-verification-queue'] });
          qc.invalidateQueries({ queryKey: ['contact-verifications'] });
        })
        .catch(() => {});
      toast.success(`${list.length} verifications scheduled — first batch starting now, rest over 8 hours`);
    } catch (err: any) {
      toast.error(`Could not schedule verifications: ${err?.message || err}`);
    } finally {
      setScheduling(false);
      qc.invalidateQueries({ queryKey: ['contact-verification-queue'] });
    }
  };

  const cancelScheduled = async () => {
    localStorage.removeItem(BATCH_KEY);
    const { error } = await (supabase as any).from('contact_verification_queue').delete().eq('status', 'pending');
    if (error) { toast.error(error.message); return; }
    await (supabase as any).rpc('stop_contact_verification_job');
    toast.success('Scheduled verifications cancelled');
    qc.invalidateQueries({ queryKey: ['contact-verification-queue'] });
  };

  /** Single checks run in real time and clear any scheduled queue entry for that org. */
  const verifySingle = async (org: Organization) => {
    setRunning(true);
    setProgress({ done: 0, total: 1, current: org.name });
    try {
      await verifyOne(org);
      await (supabase as any).from('contact_verification_queue').delete().eq('organization_id', org.id);
      qc.invalidateQueries({ queryKey: ['contact-verification-queue'] });
      toast.success(`Verified ${org.name}`);
    } catch (err: any) {
      toast.error(`Verification failed for ${org.name}: ${err?.message || err}`);
    } finally {
      invalidate();
      setRunning(false);
      setProgress({ done: 0, total: 0, current: '' });
    }
  };

  const downloadXlsx = () => {
    const data = visible.map(({ org, v, state }) => {
      const candidate = v?.replacement_report?.candidates?.[0];
      return {
        'Organization': org.name,
        'Primary Contact': `${org.profiles?.first_name || ''} ${org.profiles?.last_name || ''}`.trim(),
        'Contact Title': org.profiles?.primary_contact_title || '',
        'Contact Email': org.profiles?.email || '',
        'Status': labels[state],
        'Confidence': v && state !== 'stale' ? v.confidence || '' : '',
        'Found Title': v && state !== 'stale' ? v.found_title || '' : '',
        'Summary': v && state !== 'stale' ? v.summary || '' : '',
        'New Contact': candidate?.name || '',
        'New Contact Title': candidate?.title || '',
        'New Contact Email': candidate?.email || '',
        'New Contact Source': candidate?.source_url || '',
        'Institutional Source': v && state !== 'stale' ? v.institutional_url || '' : '',
        'LinkedIn': v && state !== 'stale' ? v.linkedin_url || '' : '',
        'Scheduled': queuedIds.has(org.id) ? 'Yes' : '',
        'Last Checked': v ? new Date(v.verified_at).toLocaleString() : '',
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 32 }, { wch: 22 }, { wch: 24 }, { wch: 30 }, { wch: 14 }, { wch: 12 }, { wch: 24 }, { wch: 50 }, { wch: 22 }, { wch: 24 }, { wch: 30 }, { wch: 34 }, { wch: 34 }, { wch: 34 }, { wch: 10 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contact Verification');
    XLSX.writeFile(wb, `contact-verification-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`Downloaded ${data.length} rows`);
  };

  const withContact = (list: typeof rows) => list.filter((r) => r.state !== 'no_contact').map((r) => r.org);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Verified</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-700">{counts.verified}</div>
            <p className="text-xs text-muted-foreground mt-1">{pctStats.verifiedPct}% of {pctStats.total} organizations with contacts</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Not Verified</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-700">{counts.notVerified}</div>
            <p className="text-xs text-muted-foreground mt-1">{pctStats.notVerifiedPct}% of organizations not verified (incl. unchecked)</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Not Yet Checked</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{counts.never}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Verification Rate</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pctStats.verifiedPct}%</div>
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-emerald-600" style={{ width: `${pctStats.verifiedPct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{counts.verified} verified of {pctStats.total}</p>
          </CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button disabled={running || scheduling} onClick={() => scheduleBatch(withContact(rows.filter((r) => r.state === 'never' || r.state === 'stale')))}>
              <Play className="h-4 w-4 mr-2" />Schedule unchecked ({counts.never})
            </Button>
            <Button variant="outline" disabled={running || scheduling} onClick={() => scheduleBatch(withContact(visible))}>
              Schedule shown list ({withContact(visible).length})
            </Button>
            <Button variant="outline" disabled={running || scheduling} onClick={() => scheduleBatch(withContact(rows))}>
              Schedule all ({withContact(rows).length})
            </Button>
            {pendingQueue.length > 0 && (
              <Button variant="outline" onClick={cancelScheduled}>
                <Square className="h-4 w-4 mr-2" />Cancel scheduled
              </Button>
            )}
            {running && (
              <Button variant="destructive" onClick={() => { stopRef.current = true; }}>
                <Square className="h-4 w-4 mr-2" />Stop
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Batches are spread evenly over 8 hours and run in the background, so you can close this page. Each check uses AI and web search and uses AI credits; if the AI limit is reached, remaining checks wait an hour and continue.
          </p>
          {pendingQueue.length > 0 && (
            <div className="text-sm rounded-md border bg-muted/40 p-3">
              <strong>{pendingQueue.length}</strong> verification{pendingQueue.length === 1 ? '' : 's'} scheduled in the background
              {lastScheduled && <> — expected to finish around {new Date(lastScheduled).toLocaleString()}</>}.
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{batchDone} of {batchTotal} complete</span>
                  <span className="font-semibold">{batchPct}% complete</span>
                </div>
                <Progress value={batchPct} />
              </div>
            </div>
          )}
          {running && (
            <div className="space-y-1">
              <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} />
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                {progress.done} of {progress.total} — checking {progress.current}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search organization or contact..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="not_verified">Not verified</SelectItem>
            <SelectItem value="never">Not yet checked</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={downloadXlsx} disabled={visible.length === 0}>
          <Download className="h-4 w-4 mr-2" />Download .xlsx ({visible.length})
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Primary Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Found Title / Summary</TableHead>
              <TableHead>Checked</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-6">Loading…</TableCell></TableRow>
            ) : visible.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No organizations match.</TableCell></TableRow>
            ) : visible.map(({ org, v, state }) => (
              <TableRow key={org.id}>
                <TableCell className="font-medium">{org.name}</TableCell>
                <TableCell>
                  <div>{org.profiles?.first_name} {org.profiles?.last_name}</div>
                  <div className="text-xs text-muted-foreground">{org.profiles?.primary_contact_title}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={badgeClass[state]}>
                    {state === 'verified' && <BadgeCheck className="h-3 w-3 mr-1" />}
                    {labels[state]}
                  </Badge>
                  {queuedIds.has(org.id) && <div className="text-xs text-muted-foreground mt-1">Scheduled</div>}
                  {v?.confidence && state !== 'stale' && (
                    <div className="text-xs text-muted-foreground mt-1">{v.confidence} confidence</div>
                  )}
                </TableCell>
                <TableCell className="max-w-sm">
                  {v && state !== 'stale' ? (
                    <>
                      {v.found_title && v.found_title !== 'Not found' && <div className="text-sm">{v.found_title}</div>}
                      {v.summary && <div className="text-xs text-muted-foreground line-clamp-2">{v.summary}</div>}
                      <div className="flex gap-2 mt-1">
                        {v.institutional_url && <a href={v.institutional_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1">Source <ExternalLink className="h-3 w-3" /></a>}
                        {v.linkedin_url && <a href={v.linkedin_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1">LinkedIn <ExternalLink className="h-3 w-3" /></a>}
                      </div>
                    </>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {v ? new Date(v.verified_at).toLocaleDateString() : '—'}
                </TableCell>
                <TableCell>
                  {state !== 'no_contact' && (
                    <Button size="sm" variant="ghost" disabled={running} onClick={() => verifySingle(org)}>Verify</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export { isCurrentlyVerified };
