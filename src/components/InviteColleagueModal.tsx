import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { UserPlus, Mail, Loader2, RotateCcw, Ban, Info } from 'lucide-react';
import { useColleagueInvitations, ColleagueInvitation } from '@/hooks/useColleagueInvitations';
import { getAllowedInviteDomains, isEmailInAllowedDomains } from '@/utils/orgEmailDomains';

interface InviteColleagueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName: string;
  organizationEmail?: string | null;
  organizationWebsite?: string | null;
  primaryContactEmail?: string | null;
}

function statusOf(invitation: ColleagueInvitation) {
  if (invitation.used_at) return { label: 'Accepted', variant: 'default' as const };
  if (invitation.status === 'revoked' || invitation.revoked_at) return { label: 'Revoked', variant: 'outline' as const };
  if (new Date(invitation.expires_at) < new Date()) return { label: 'Expired', variant: 'destructive' as const };
  return { label: 'Pending', variant: 'secondary' as const };
}

export function InviteColleagueModal({
  open,
  onOpenChange,
  organizationId,
  organizationName,
  organizationEmail,
  organizationWebsite,
  primaryContactEmail,
}: InviteColleagueModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  const { invitations, loading, submitting, sendInvitation, resendInvitation, revokeInvitation } =
    useColleagueInvitations(organizationId, open);

  const allowedDomains = useMemo(
    () =>
      getAllowedInviteDomains({
        primaryContactEmail,
        organizationEmail,
        organizationWebsite,
      }),
    [primaryContactEmail, organizationEmail, organizationWebsite],
  );

  const domainOk = email.trim() === '' || isEmailInAllowedDomains(email, allowedDomains);
  const canSubmit =
    !!firstName.trim() && !!lastName.trim() && !!email.trim() && domainOk && allowedDomains.length > 0 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const result = await sendInvitation({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
    });
    if (result.success) {
      setFirstName('');
      setLastName('');
      setEmail('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Colleagues from {organizationName}
          </DialogTitle>
          <DialogDescription>
            Invited colleagues receive their own read-only member login for your institution. Only you, as the primary
            contact, can update the institution record or view billing information.
          </DialogDescription>
        </DialogHeader>

        {allowedDomains.length === 0 ? (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertDescription>
              We don't have an institutional email domain on file for your organization, so invitations aren't available
              yet. Please contact HESS staff at info@hessconsortium.org.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Invitations must use {allowedDomains.map((d) => `@${d}`).join(' or ')} email addresses.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invite-first">First name</Label>
                <Input id="invite-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-last">Last name</Label>
                <Input id="invite-last" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`jane.doe@${allowedDomains[0]}`}
              />
              {!domainOk && (
                <p className="text-sm text-destructive">
                  This address is outside your institution's email domain.
                </p>
              )}
            </div>

            <Button type="submit" disabled={!canSubmit} className="w-full">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invitation
            </Button>
          </form>
        )}

        <Card>
          <CardContent className="pt-6">
            <h4 className="font-medium mb-3">Invitations sent</h4>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading invitations...</div>
            ) : invitations.length === 0 ? (
              <div className="text-sm text-muted-foreground">No invitations sent yet.</div>
            ) : (
              <div className="space-y-3">
                {invitations.map((invitation) => {
                  const status = statusOf(invitation);
                  const actionable = !invitation.used_at;
                  return (
                    <div key={invitation.id} className="border rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-medium text-sm">
                          {[invitation.invited_first_name, invitation.invited_last_name].filter(Boolean).join(' ') || invitation.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {invitation.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Expires {new Date(invitation.expires_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={status.variant}>{status.label}</Badge>
                        {actionable && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => resendInvitation(invitation.id)}>
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Resend
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => revokeInvitation(invitation.id)}>
                              <Ban className="h-3 w-3 mr-1" />
                              Revoke
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
