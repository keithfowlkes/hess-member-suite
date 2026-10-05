import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RotateCcw, Search } from 'lucide-react';
import { toast } from 'sonner';

interface DeletionRow {
  id: string;
  organization_name: string;
  contact_name: string | null;
  contact_email: string | null;
  snapshot: any;
  deleted_at: string;
  restored_at: string | null;
}

export function MemberCancellationsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<DeletionRow | null>(null);
  const [busy, setBusy] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ['organization_deletions'],
    queryFn: async () => {
      const since = new Date();
      since.setFullYear(since.getFullYear() - 1);
      const { data, error } = await (supabase as any)
        .from('organization_deletions')
        .select('id, organization_name, contact_name, contact_email, snapshot, deleted_at, restored_at')
        .gte('deleted_at', since.toISOString())
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      return data as DeletionRow[];
    },
  });

  const rows = data.filter((r) =>
    `${r.organization_name} ${r.contact_name ?? ''} ${r.contact_email ?? ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const restore = async () => {
    if (!target) return;
    setBusy(true);
    const { data: res, error } = await supabase.functions.invoke('restore-organization', { body: { deletionId: target.id } });
    setBusy(false);
    if (error || res?.error) {
      toast.error(res?.error || error?.message || 'Restore failed');
      return;
    }
    toast.success(`${target.organization_name} restored to membership${res.fullRestore ? '' : ' (basic details only — please complete the profile)'}`);
    setTarget(null);
    qc.invalidateQueries({ queryKey: ['organization_deletions'] });
    qc.invalidateQueries({ queryKey: ['organizations'] });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Member Cancellations ({data.filter((r) => !r.restored_at).length})</CardTitle>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search organizations..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No organizations deleted in the past year.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Primary Contact</TableHead>
                <TableHead>Date Deleted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.organization_name}</TableCell>
                  <TableCell>
                    <div>{r.contact_name || '—'}</div>
                    <div className="text-xs text-muted-foreground">{r.contact_email || ''}</div>
                  </TableCell>
                  <TableCell>{new Date(r.deleted_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {r.restored_at ? (
                      <Badge variant="secondary">Restored {new Date(r.restored_at).toLocaleDateString()}</Badge>
                    ) : (
                      <Badge variant="destructive">Cancelled</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {!r.restored_at && (
                      <Button size="sm" variant="outline" onClick={() => setTarget(r)}>
                        <RotateCcw className="mr-1 h-4 w-4" /> Undelete
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <AlertDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore {target?.organization_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {target?.snapshot?.organization
                ? 'The organization and its invoices will return to the active membership listings. The primary contact will need to be re-invited or re-assigned since their login was removed.'
                : 'This organization was deleted before full details were saved. It will be restored with its name and contact email only, so please complete its profile afterward.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); restore(); }}>
              {busy ? 'Restoring...' : 'Restore'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
