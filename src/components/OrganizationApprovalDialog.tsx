import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, User, Building2, Mail, Phone, MapPin } from 'lucide-react';
import { PendingOrganization } from '@/hooks/useOrganizationApprovals';

interface OrganizationApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: PendingOrganization | null;
  onApprove: (organizationId: string, message?: string) => Promise<void>;
  onReject: (organizationId: string, message: string) => Promise<void>;
}

export const OrganizationApprovalDialog = ({
  open,
  onOpenChange,
  organization,
  onApprove,
  onReject
}: OrganizationApprovalDialogProps) => {
  const [adminMessage, setAdminMessage] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);

  const handleApprove = async () => {
    if (!organization) return;
    
    setIsApproving(true);
    try {
      await onApprove(organization.id, adminMessage || undefined);
      onOpenChange(false);
      setAdminMessage('');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!organization || !adminMessage.trim()) return;
    
    setIsRejecting(true);
    try {
      await onReject(organization.id, adminMessage);
      onOpenChange(false);
      setAdminMessage('');
      setShowRejectForm(false);
    } finally {
      setIsRejecting(false);
    }
  };

  if (!organization) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Review Organization Application
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Organization Information */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{organization.name}</h3>
              <Badge variant="outline" className="flex items-center gap-1">
                {organization.profiles?.is_private_nonprofit ? (
                  <>
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    Private Non-Profit
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 text-red-600" />
                    Not Confirmed as Private Non-Profit
                  </>
                )}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {organization.address_line_1}
                    {organization.city && `, ${organization.city}`}
                    {organization.state && `, ${organization.state}`}
                    {organization.zip_code && ` ${organization.zip_code}`}
                  </span>
                </div>
                {organization.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{organization.phone}</span>
                  </div>
                )}
                {organization.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{organization.email}</span>
                  </div>
                )}
                {organization.student_fte && (
                  <div className="text-sm">
                    <span className="font-medium">Student FTE:</span> {organization.student_fte.toLocaleString()}
                  </div>
                )}
              </div>

              {/* Primary Contact */}
              {organization.profiles && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Primary Contact
                  </h4>
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="font-medium">Name:</span> {organization.profiles.first_name} {organization.profiles.last_name}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {organization.profiles.email}
                    </div>
                    {organization.profiles.primary_contact_title && (
                      <div>
                        <span className="font-medium">Title:</span> {organization.profiles.primary_contact_title}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 text-xs text-muted-foreground">
              Application submitted: {new Date(organization.created_at).toLocaleDateString()}
            </div>
          </div>

          {/* Admin Actions */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-message">
                Admin Message (Optional)
                {showRejectForm && <span className="text-red-600"> - Required for rejection</span>}
              </Label>
              <Textarea
                id="admin-message"
                placeholder={showRejectForm ? "Please provide a reason for rejection..." : "Optional message to include in approval email..."}
                value={adminMessage}
                onChange={(e) => setAdminMessage(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <div className="flex gap-3">
              {!showRejectForm ? (
                <>
                  <Button
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {isApproving ? 'Approving...' : 'Approve Organization'}
                  </Button>
                  <Button
                    onClick={() => setShowRejectForm(true)}
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject Organization
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleReject}
                    disabled={isRejecting || !adminMessage.trim()}
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowRejectForm(false);
                      setAdminMessage('');
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};