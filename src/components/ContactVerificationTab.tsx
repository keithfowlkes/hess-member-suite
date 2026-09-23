import { useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BadgeCheck, Loader2, Play, Search, Square, ExternalLink } from 'lucide-react';
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
    const { error: saveError } = await (supabase as any).from('contact_verifications').upsert({
      organization_id: org.id,
      contact_name: contactName,
      contact_title: p.primary_contact_title || null,
      status: (s.verificationStatus || 'UNKNOWN').toUpperCase(),
      confidence: s.confidence || null,
      found_title: s.foundTitle || null,
      summary: s.summary || null,
      linkedin_url: s.linkedinUrl || null,
      institutional_url: s.institutionalUrl || null,
      notes: s.notes || null,
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

  const withContact = (list: typeof rows) => list.filter((r) => r.state !== 'no_contact').map((r) => r.org);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Verified</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-emerald-700">{counts.verified}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Not Verified</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-amber-700">{counts.notVerified}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Not Yet Checked</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{counts.never}</CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button disabled={running} onClick={() => runBatch(withContact(rows.filter((r) => r.state === 'never' || r.state === 'stale')))}>
              <Play className="h-4 w-4 mr-2" />Verify unchecked ({counts.never})
            </Button>
            <Button variant="outline" disabled={running} onClick={() => runBatch(withContact(visible))}>
              Verify shown list ({withContact(visible).length})
            </Button>
            {running && (
              <Button variant="destructive" onClick={() => { stopRef.current = true; }}>
                <Square className="h-4 w-4 mr-2" />Stop
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Each check uses AI and web search, so large batches take several minutes and use AI credits. Keep this page open while it runs.
          </p>
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
                    <Button size="sm" variant="ghost" disabled={running} onClick={() => runBatch([org])}>Verify</Button>
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
