import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCw, Trash2, Users } from 'lucide-react';
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
  const { invitations, loading, submitting, deleteInvitation, setInvitationPermission, refetch } = useColleagueInvitations(organizationId, open);
  const [pendingDelete, setPendingDelete] = useState<ColleagueInvitation | null>(null);

  const activeCount = invitations.filter((i) => !!i.used_at).length;
  const pendingCount = invitations.filter((i) => !i.used_at && !i.revoked_at && new Date(i.expires_at).getTime() >= Date.now()).length;

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await deleteInvitation(pendingDelete.id);
    setPendingDelete(null);
  };

  const pendingName = pendingDelete
    ? [pendingDelete.invited_first_name, pendingDelete.invited_last_name].filter(Boolean).join(' ') || pendingDelete.email
    : '';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Organization Login Access
            </DialogTitle>
            <DialogDescription>
              Invited colleagues for {organizationName || 'your organization'} and the status of their portal access.
              Click the <strong>Profile access</strong> badge to toggle whether a colleague can update the institution profile.
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
                    <TableHead>Profile access</TableHead>
                    <TableHead>Invited</TableHead>
                    <TableHead>Account created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => setInvitationPermission(inv.id, !inv.can_edit_organization)}
                            disabled={submitting}
                            title="Click to toggle institution profile access"
                            className="disabled:opacity-60"
                          >
                            <Badge
                              variant={inv.can_edit_organization ? 'default' : 'outline'}
                              className="cursor-pointer hover:opacity-80 transition-opacity"
                            >
                              {inv.can_edit_organization ? 'Can update institution' : 'View only'}
                            </Badge>
                          </button>
                        </TableCell>
                        <TableCell>{formatDate(inv.created_at)}</TableCell>
                        <TableCell>{formatDate(inv.used_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setPendingDelete(inv)}
                            disabled={submitting}
                            aria-label={`Remove access for ${name || inv.email}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {pendingName} from access?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.used_at
                ? 'This will permanently delete their portal account and remove them from your organization access list. They will no longer be able to sign in.'
                : 'This will remove the invitation from your access list. The invitation link will no longer work.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remove access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
