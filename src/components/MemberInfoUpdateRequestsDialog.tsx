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
  useOrganizationProfileEditRequests,
  useApproveOrganizationProfileEditRequest,
  useRejectOrganizationProfileEditRequest
} from '@/hooks/useOrganizationProfileEditRequests';
import { SideBySideComparisonModal } from '@/components/SideBySideComparisonModal';
import { CheckCircle, XCircle, Eye, Trash2, AlertTriangle } from 'lucide-react';

interface MemberInfoUpdateRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberInfoUpdateRequestsDialog({ open, onOpenChange }: MemberInfoUpdateRequestsDialogProps) {
  const { requests, loading: isLoading } = useOrganizationProfileEditRequests();
  const { approveRequest, loading: isApproving } = useApproveOrganizationProfileEditRequest();
  const { rejectRequest, loading: isRejecting } = useRejectOrganizationProfileEditRequest();
  const { user } = useAuth();

  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Filter to only show pending requests (already filtered in hook)
  const pendingRequests = requests;

  // Generate comparison data for the side-by-side modal
  const comparisonData = useMemo(() => {
    if (!selectedRequest) return {};

    const originalOrg = selectedRequest.original_organization_data || {};
    const updatedOrg = selectedRequest.updated_organization_data || {};
    const originalProfile = selectedRequest.original_profile_data || {};
    const updatedProfile = selectedRequest.updated_profile_data || {};

    console.log('🔍 Request Data:', selectedRequest);
    console.log('🏢 Original Org:', originalOrg);
    console.log('📦 Updated Org:', updatedOrg);
    console.log('🔧 VoIP - Old:', originalOrg.voip, 'New:', updatedOrg.voip);
    console.log('🌐 Network - Old:', originalOrg.network_infrastructure, 'New:', updatedOrg.network_infrastructure);
    
    // Check if fields exist at all
    console.log('🔍 All keys in originalOrg:', Object.keys(originalOrg));
    console.log('🔍 All keys in updatedOrg:', Object.keys(updatedOrg));

    const orgChanges = [
      { field: 'name', label: 'Organization Name', oldValue: originalOrg.name, newValue: updatedOrg.name },
      { field: 'student_fte', label: 'Student FTE', oldValue: originalOrg.student_fte, newValue: updatedOrg.student_fte },
      { field: 'website', label: 'Website', oldValue: originalOrg.website, newValue: updatedOrg.website },
      { field: 'address_line_1', label: 'Address', oldValue: originalOrg.address_line_1, newValue: updatedOrg.address_line_1 },
      { field: 'city', label: 'City', oldValue: originalOrg.city, newValue: updatedOrg.city },
      { field: 'state', label: 'State', oldValue: originalOrg.state, newValue: updatedOrg.state },
      { field: 'zip_code', label: 'ZIP Code', oldValue: originalOrg.zip_code, newValue: updatedOrg.zip_code },
    ].filter(item => item.newValue !== undefined && item.oldValue !== item.newValue);

    const softwareChanges = [
      { field: 'student_information_system', label: 'Student Information System', oldValue: originalOrg.student_information_system, newValue: updatedOrg.student_information_system },
      { field: 'financial_system', label: 'Financial System', oldValue: originalOrg.financial_system, newValue: updatedOrg.financial_system },
      { field: 'financial_aid', label: 'Financial Aid', oldValue: originalOrg.financial_aid, newValue: updatedOrg.financial_aid },
    ].filter(item => item.newValue !== undefined && item.oldValue !== item.newValue);

    const hardwareChanges = [
      { field: 'voip', label: 'VoIP', oldValue: originalOrg.voip, newValue: updatedOrg.voip },
      { field: 'network_infrastructure', label: 'Network Infrastructure', oldValue: originalOrg.network_infrastructure, newValue: updatedOrg.network_infrastructure },
    ].filter(item => item.newValue !== undefined && item.oldValue !== item.newValue);

    const contactChanges = [
      { field: 'first_name', label: 'First Name', oldValue: originalProfile.first_name, newValue: updatedProfile.first_name },
      { field: 'last_name', label: 'Last Name', oldValue: originalProfile.last_name, newValue: updatedProfile.last_name },
      { field: 'email', label: 'Email', oldValue: originalProfile.email, newValue: updatedProfile.email },
      { field: 'phone', label: 'Phone', oldValue: originalProfile.phone, newValue: updatedProfile.phone },
    ].filter(item => item.newValue !== undefined && item.oldValue !== item.newValue);

    return {
      organizationChanges: orgChanges,
      softwareChanges,
      hardwareChanges,
      contactChanges,
      originalData: originalOrg,
      updatedData: updatedOrg
    };
  }, [selectedRequest]);

  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRequest = isApproving || isRejecting || isProcessing;

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    try {
      await approveRequest(selectedRequest.id, actionNotes);
      setSelectedRequest(null);
      setActionNotes('');
      setShowApprovalDialog(false);
      setShowDetails(false);
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    try {
      await rejectRequest(selectedRequest.id, actionNotes);
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

  const getOrganizationName = (request: any) => {
    return request.updated_organization_data?.name || 
           request.original_organization_data?.name || 
           'Unknown Organization';
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
            isSubmitting={isProcessingRequest}
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
                        {request.updated_profile_data?.email || 'N/A'}
                      </TableCell>
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
                disabled={isProcessingRequest}
              >
                {isProcessingRequest ? 'Approving...' : 'Approve Update Request'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}