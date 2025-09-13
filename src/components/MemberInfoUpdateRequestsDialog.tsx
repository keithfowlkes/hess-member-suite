import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  useReassignmentRequests, 
  useApproveReassignmentRequest, 
  useRejectReassignmentRequest,
  useDeleteReassignmentRequest,
  type MemberInfoUpdateRequest 
} from '@/hooks/useReassignmentRequests';
import { SideBySideComparisonModal } from '@/components/SideBySideComparisonModal';
import { CheckCircle, XCircle, Eye, Trash2, AlertTriangle, User, Building2, Mail, Monitor } from 'lucide-react';

interface MemberInfoUpdateRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberInfoUpdateRequestsDialog({ open, onOpenChange }: MemberInfoUpdateRequestsDialogProps) {
  const { data: requests = [], isLoading } = useReassignmentRequests();
  const approveRequest = useApproveReassignmentRequest();
  const rejectRequest = useRejectReassignmentRequest();
  const deleteRequest = useDeleteReassignmentRequest();
  const { user } = useAuth();

  const [selectedRequest, setSelectedRequest] = useState<MemberInfoUpdateRequest | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Generate comparison data for the side-by-side modal
  const comparisonData = useMemo(() => {
    if (!selectedRequest) return {};

    const organizationChanges = [];
    const contactChanges = [];

    // Contact change (primary contact email change)
    if (selectedRequest.new_contact_email && selectedRequest.organizations?.profiles?.email) {
      contactChanges.push({
        field: 'primary_contact_email',
        label: 'Primary Contact Email',
        oldValue: selectedRequest.organizations.profiles.email,
        newValue: selectedRequest.new_contact_email,
        type: 'email' as const
      });
    }

    // Compare organization data if available
    const newData = selectedRequest.new_organization_data as Record<string, any> || {};
    const currentData = selectedRequest.organizations as Record<string, any> || {};

    return {
      organizationChanges,
      contactChanges,
      originalData: currentData,
      updatedData: newData
    };
  }, [selectedRequest]);

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    try {
      await approveRequest.mutateAsync({
        id: selectedRequest.id,
        notes: actionNotes,
        adminUserId: user?.id
      });
      setSelectedRequest(null);
      setActionNotes('');
      setShowApprovalDialog(false);
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedRequest) return;
    await deleteRequest.mutateAsync(selectedRequest.id);
    setSelectedRequest(null);
    setShowDeleteDialog(false);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    await rejectRequest.mutateAsync({
      id: selectedRequest.id,
      notes: actionNotes
    });
    setSelectedRequest(null);
    setActionNotes('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'approved':
        return <Badge variant="default">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Member Information Update Requests</DialogTitle>
          <DialogDescription>
            Manage member information update requests and approve/reject changes
          </DialogDescription>
        </DialogHeader>

        {showDetails && selectedRequest ? (
          <SideBySideComparisonModal
            open={showDetails}
            onOpenChange={setShowDetails}
            title={`Member Information Update Request - ${selectedRequest.organizations?.name || 'Unknown Organization'}`}
            data={comparisonData}
            showActions={selectedRequest.status === 'pending'}
            actionNotes={actionNotes}
            onActionNotesChange={setActionNotes}
            onApprove={handleApprove}
            onReject={handleReject}
            isSubmitting={approveRequest.isPending || rejectRequest.isPending}
          >
            {selectedRequest.admin_notes && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-base">Admin Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{selectedRequest.admin_notes}</p>
                </CardContent>
              </Card>
            )}
          </SideBySideComparisonModal>
        ) : (
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-4">Loading requests...</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No member information update requests found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Current Contact</TableHead>
                    <TableHead>New Contact Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.organizations?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {request.organizations?.profiles?.first_name && request.organizations?.profiles?.last_name
                          ? `${request.organizations.profiles.first_name} ${request.organizations.profiles.last_name}`
                          : request.organizations?.profiles?.email || 'No current contact'
                        }
                        <div className="text-xs text-muted-foreground">
                          {request.organizations?.profiles?.email}
                        </div>
                      </TableCell>
                      <TableCell>{request.new_contact_email}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        {new Date(request.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowDetails(true);
                              setActionNotes('');
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                          {request.status === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowApprovalDialog(true);
                                }}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
        
        {/* Approval Confirmation Dialog */}
        <AlertDialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Approve Member Information Update Request
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p>
                    You are about to approve the member information update request for{' '}
                    <strong>{selectedRequest?.organizations?.name}</strong>.
                  </p>
                  
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <h4 className="font-semibold text-sm">Changes that will be made:</h4>
                    <ul className="text-sm space-y-1">
                      <li>
                        • Primary contact will change from{' '}
                        <strong>
                          {selectedRequest?.organizations?.profiles?.email || 'current contact'}
                        </strong>{' '}
                        to <strong>{selectedRequest?.new_contact_email}</strong>
                      </li>
                      <li>• All organization information will be completely replaced with the new submitted data</li>
                      <li>• The current primary contact will lose access to manage this organization</li>
                      <li>• The member information update request will be deleted after approval</li>
                      <li><strong>• This action cannot be undone</strong></li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="approval-notes">Admin Notes (optional)</Label>
                    <Textarea
                      id="approval-notes"
                      placeholder="Add any notes about this approval..."
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleApprove}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={approveRequest.isPending}
              >
                {approveRequest.isPending ? 'Approving...' : 'Approve Update Request'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Member Information Update Request</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this member information update request for{' '}
                <strong>{selectedRequest?.organizations?.name}</strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteRequest.isPending}
              >
                {deleteRequest.isPending ? 'Deleting...' : 'Delete Request'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}