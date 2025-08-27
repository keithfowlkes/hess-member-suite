import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Calendar, RotateCcw, Trash2, Plus, Building2 } from 'lucide-react';
import { OrganizationInvitation, useOrganizationInvitations } from '@/hooks/useOrganizationInvitations';
import { useMembers } from '@/hooks/useMembers';

interface InvitationManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InvitationManagementDialog = ({
  open,
  onOpenChange
}: InvitationManagementDialogProps) => {
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { invitations, loading, createInvitation, resendInvitation, deleteInvitation } = useOrganizationInvitations();
  const { organizations } = useMembers();

  // Get organizations without contact persons (for invitation)
  const organizationsWithoutContacts = organizations.filter(org => !org.contact_person_id);

  const handleCreateInvitation = async () => {
    if (!selectedOrgId || !inviteeEmail) return;

    setIsCreating(true);
    try {
      const result = await createInvitation(selectedOrgId, inviteeEmail);
      if (result.success) {
        setSelectedOrgId('');
        setInviteeEmail('');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusBadge = (invitation: OrganizationInvitation) => {
    if (invitation.used_at) {
      return <Badge variant="default">Accepted</Badge>;
    }
    
    const isExpired = new Date(invitation.expires_at) < new Date();
    if (isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    
    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Manage Organization Invitations
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Invitation */}
          {organizationsWithoutContacts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Send New Invitation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="organization">Organization</Label>
                    <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizationsWithoutContacts.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Contact Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={inviteeEmail}
                      onChange={(e) => setInviteeEmail(e.target.value)}
                      placeholder="contact@organization.edu"
                    />
                  </div>
                </div>
                
                <Button
                  onClick={handleCreateInvitation}
                  disabled={isCreating || !selectedOrgId || !inviteeEmail}
                  className="w-full"
                >
                  {isCreating ? 'Sending...' : 'Send Invitation'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Existing Invitations */}
          <Card>
            <CardHeader>
              <CardTitle>Sent Invitations</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading invitations...</div>
              ) : invitations.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No invitations sent yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="border rounded-lg p-4 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {invitation.organization?.name || 'Unknown Organization'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{invitation.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {getStatusBadge(invitation)}
                        
                        {!invitation.used_at && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resendInvitation(invitation.id)}
                              className="flex items-center gap-1"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Resend
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteInvitation(invitation.id)}
                              className="flex items-center gap-1"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
