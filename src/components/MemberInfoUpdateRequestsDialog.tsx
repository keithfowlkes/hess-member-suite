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
  useMemberRegistrationUpdates,
  type MemberRegistrationUpdate 
} from '@/hooks/useMemberRegistrationUpdates';
import { SideBySideComparisonModal } from '@/components/SideBySideComparisonModal';
import { CheckCircle, XCircle, Eye, Trash2, AlertTriangle } from 'lucide-react';

interface MemberInfoUpdateRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberInfoUpdateRequestsDialog({ open, onOpenChange }: MemberInfoUpdateRequestsDialogProps) {
  const { registrationUpdates, isLoading, processRegistrationUpdate, isProcessing } = useMemberRegistrationUpdates();
  const { user } = useAuth();

  const [selectedRequest, setSelectedRequest] = useState<MemberRegistrationUpdate | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Filter to only show pending requests
  const pendingRequests = registrationUpdates.filter(r => r.status === 'pending');

  // Generate comparison data for the side-by-side modal
  const comparisonData = useMemo(() => {
    if (!selectedRequest) return {};

    // CRITICAL: Extract from the nested organization_data JSON field
    const orgData = (selectedRequest.organization_data as Record<string, any>) || {};
    
    console.log('🔍 CRITICAL DEBUG - Full Request:', selectedRequest);
    console.log('🏢 Nested organization_data:', orgData);
    console.log('🔧 VoIP from nested data:', orgData.voip);
    console.log('🌐 Network Infrastructure from nested data:', orgData.network_infrastructure);

    return {
      organizationChanges: [],
      softwareChanges: [],
      hardwareChanges: [],
      contactChanges: [],
      originalData: {}, // No original data for member updates
      updatedData: orgData // Use the nested organization_data
    };
  }, [selectedRequest]);

  const handleApprove = async () => {
    if (!selectedRequest || !user) return;
    
    try {
      await processRegistrationUpdate({
        registrationUpdateId: selectedRequest.id,
        action: 'approve',
        adminUserId: user.id,
        adminNotes: actionNotes
      });
      setSelectedRequest(null);
      setActionNotes('');
      setShowApprovalDialog(false);
      setShowDetails(false);
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !user) return;
    
    try {
      await processRegistrationUpdate({
        registrationUpdateId: selectedRequest.id,
        action: 'reject',
        adminUserId: user.id,
        adminNotes: actionNotes
      });
      setSelectedRequest(null);
      setActionNotes('');
      setShowDetails(false);
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
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

  const getOrganizationName = (request: MemberRegistrationUpdate) => {
    const orgData = (request.organization_data as any) || {};
    return request.existing_organization_name || orgData.name || 'Unknown Organization';
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
            title={`Member Information Update Request - ${getOrganizationName(selectedRequest)}`}
            data={comparisonData}
            showActions={selectedRequest.status === 'pending'}
            actionNotes={actionNotes}
            onActionNotesChange={setActionNotes}
            onApprove={handleApprove}
            onReject={handleReject}
            isSubmitting={isProcessing}
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
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending member information update requests found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Submitted Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {getOrganizationName(request)}
                      </TableCell>
                      <TableCell>
                        {request.submitted_email}
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        {new Date(request.submitted_at).toLocaleDateString()}
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
                    <strong>{selectedRequest && getOrganizationName(selectedRequest)}</strong>.
                  </p>
                  
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <h4 className="font-semibold text-sm">Changes that will be made:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• All submitted organization information will be processed</li>
                      <li>• The system will update the organization details with the new information</li>
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
                disabled={isProcessing}
              >
                {isProcessing ? 'Approving...' : 'Approve Update Request'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}