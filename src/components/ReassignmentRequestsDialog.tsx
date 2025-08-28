import { useState } from 'react';
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
  useRevertReassignmentRequest,
  useDeleteReassignmentRequest,
  type ReassignmentRequest 
} from '@/hooks/useReassignmentRequests';
import { CheckCircle, XCircle, RotateCcw, Eye, Trash2, AlertTriangle } from 'lucide-react';

interface ReassignmentRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReassignmentRequestsDialog({ open, onOpenChange }: ReassignmentRequestsDialogProps) {
  const { data: requests = [], isLoading } = useReassignmentRequests();
  const approveRequest = useApproveReassignmentRequest();
  const rejectRequest = useRejectReassignmentRequest();
  const revertRequest = useRevertReassignmentRequest();
  const deleteRequest = useDeleteReassignmentRequest();

  const [selectedRequest, setSelectedRequest] = useState<ReassignmentRequest | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleApprove = async () => {
    if (!selectedRequest) return;
    await approveRequest.mutateAsync({
      id: selectedRequest.id,
      notes: actionNotes
    });
    setSelectedRequest(null);
    setActionNotes('');
    setShowApprovalDialog(false);
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

  const handleRevert = async () => {
    if (!selectedRequest) return;
    await revertRequest.mutateAsync({
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
      case 'reverted':
        return <Badge variant="secondary">Reverted</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Organization Reassignment Requests</DialogTitle>
          <DialogDescription>
            Manage organization reassignment requests and approve/reject changes
          </DialogDescription>
        </DialogHeader>

        {showDetails && selectedRequest ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Request Details</h3>
              <Button variant="outline" onClick={() => setShowDetails(false)}>
                Back to List
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Original Organization Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm bg-muted p-3 rounded-md overflow-auto">
                    {JSON.stringify(selectedRequest.original_organization_data, null, 2)}
                  </pre>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">New Organization Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm bg-muted p-3 rounded-md overflow-auto">
                    {JSON.stringify(selectedRequest.new_organization_data, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </div>

            {selectedRequest.status === 'pending' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notes">Admin Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any notes about this decision..."
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleApprove}
                    className="flex-1"
                    disabled={approveRequest.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Request
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    className="flex-1"
                    disabled={rejectRequest.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Request
                  </Button>
                </div>
              </div>
            )}

            {selectedRequest.status === 'approved' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="revert-notes">Revert Notes (optional)</Label>
                  <Textarea
                    id="revert-notes"
                    placeholder="Add any notes about reverting this change..."
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                  />
                </div>

                <Button
                  variant="secondary"
                  onClick={handleRevert}
                  className="w-full"
                  disabled={revertRequest.isPending}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Revert to Original Data
                </Button>
              </div>
            )}

            {selectedRequest.admin_notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Admin Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{selectedRequest.admin_notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-4">Loading requests...</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No reassignment requests found
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
                Approve Reassignment Request
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p>
                    You are about to approve the reassignment request for{' '}
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
                      <li>• All organization information will be updated with the new submitted data</li>
                      <li>• The current primary contact will lose access to manage this organization</li>
                      <li>• This action cannot be easily undone</li>
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
                {approveRequest.isPending ? 'Approving...' : 'Approve Reassignment'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Reassignment Request</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this reassignment request for{' '}
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