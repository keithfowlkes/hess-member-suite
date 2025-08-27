import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  type ReassignmentRequest 
} from '@/hooks/useReassignmentRequests';
import { CheckCircle, XCircle, RotateCcw, Eye } from 'lucide-react';

interface ReassignmentRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReassignmentRequestsDialog({ open, onOpenChange }: ReassignmentRequestsDialogProps) {
  const { data: requests = [], isLoading } = useReassignmentRequests();
  const approveRequest = useApproveReassignmentRequest();
  const rejectRequest = useRejectReassignmentRequest();
  const revertRequest = useRevertReassignmentRequest();

  const [selectedRequest, setSelectedRequest] = useState<ReassignmentRequest | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const handleApprove = async () => {
    if (!selectedRequest) return;
    await approveRequest.mutateAsync({
      id: selectedRequest.id,
      notes: actionNotes
    });
    setSelectedRequest(null);
    setActionNotes('');
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
                      <TableCell>{request.new_contact_email}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        {new Date(request.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}