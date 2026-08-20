import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCw, Users } from 'lucide-react';
import { useColleagueInvitations, type ColleagueInvitation } from '@/hooks/useColleagueInvitations';

interface OrganizationAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName?: string;
}

type StatusInfo = { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' };

function getStatus(inv: ColleagueInvitation): StatusInfo {
  if (inv.used_at) return { label: 'Active login', variant: 'default' };
  if (inv.revoked_at || inv.status === 'revoked') return { label: 'Revoked', variant: 'destructive' };
  if (new Date(inv.expires_at).getTime() < Date.now()) return { label: 'Expired', variant: 'outline' };
  return { label: 'Invitation pending', variant: 'secondary' };
}

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export function OrganizationAccessModal({
  open,
  onOpenChange,
  organizationId,
  organizationName,
}: OrganizationAccessModalProps) {
  const { invitations, loading, refetch } = useColleagueInvitations(organizationId, open);

  const activeCount = invitations.filter((i) => !!i.used_at).length;
  const pendingCount = invitations.filter((i) => !i.used_at && !i.revoked_at && new Date(i.expires_at).getTime() >= Date.now()).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Organization Login Access
          </DialogTitle>
          <DialogDescription>
            Invited colleagues for {organizationName || 'your organization'} and the status of their portal access.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {activeCount} active {activeCount === 1 ? 'login' : 'logins'} · {pendingCount} pending
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto rounded-md border">
          {loading && invitations.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading access list…
            </div>
          ) : invitations.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No colleagues have been invited yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead>Account created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => {
                  const status = getStatus(inv);
                  const name = [inv.invited_first_name, inv.invited_last_name].filter(Boolean).join(' ');
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{name || '—'}</TableCell>
                      <TableCell className="break-all">{inv.email}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(inv.created_at)}</TableCell>
                      <TableCell>{formatDate(inv.used_at)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
