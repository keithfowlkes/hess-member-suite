import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCustomSoftwareEntries, useReviewCustomEntry, useApproveAndAddToSystem } from '@/hooks/useCustomSoftwareEntries';
import { FIELD_LABELS, type SystemField } from '@/hooks/useSimpleSystemFieldOptions';
import { CheckCircle, XCircle, Clock, Building, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface CustomEntriesReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CustomEntriesReviewDialog = ({ open, onOpenChange }: CustomEntriesReviewDialogProps) => {
  const { data: entries, isLoading } = useCustomSoftwareEntries();
  const reviewEntry = useReviewCustomEntry();
  const approveAndAdd = useApproveAndAddToSystem();
  
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'approve-add' | null>(null);

  const pendingEntries = entries?.filter(entry => entry.status === 'pending') || [];
  const reviewedEntries = entries?.filter(entry => entry.status !== 'pending') || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/10 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-500/10 text-red-700 border-red-200';
      case 'pending':
      default:
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
    }
  };

  const handleReview = async () => {
    if (!selectedEntry || !reviewAction) return;

    try {
      if (reviewAction === 'approve-add') {
        await approveAndAdd.mutateAsync({
          entryId: selectedEntry.id,
          fieldName: selectedEntry.field_name,
          optionValue: selectedEntry.custom_value,
          adminNotes
        });
      } else {
        await reviewEntry.mutateAsync({
          id: selectedEntry.id,
          status: reviewAction === 'approve' ? 'approved' : 'rejected',
          adminNotes
        });
      }
      
      setSelectedEntry(null);
      setAdminNotes('');
      setReviewAction(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const startReview = (entry: any, action: 'approve' | 'reject' | 'approve-add') => {
    setSelectedEntry(entry);
    setReviewAction(action);
    setAdminNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Custom Software Entries Review</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6">
            {/* Pending Entries */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                Pending Review ({pendingEntries.length})
              </h3>
              
              {pendingEntries.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No pending entries to review</p>
              ) : (
                <div className="space-y-4">
                  {pendingEntries.map((entry) => (
                    <Card key={entry.id}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <CardTitle className="text-base">
                              {FIELD_LABELS[entry.field_name as SystemField] || entry.field_name}
                            </CardTitle>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                {entry.organization?.name || 'Unknown Organization'}
                              </div>
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {entry.submitter ? `${entry.submitter.first_name} ${entry.submitter.last_name}` : 'Unknown User'}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(entry.submitted_at), 'MMM d, yyyy')}
                              </div>
                            </div>
                          </div>
                          <Badge className={getStatusColor(entry.status)}>
                            {getStatusIcon(entry.status)}
                            <span className="ml-1 capitalize">{entry.status}</span>
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="mb-4">
                          <Label className="text-sm font-medium">Custom Value:</Label>
                          <p className="text-sm bg-muted p-2 rounded mt-1">{entry.custom_value}</p>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => startReview(entry, 'approve')}
                            disabled={reviewEntry.isPending || approveAndAdd.isPending}
                          >
                            Approve Only
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => startReview(entry, 'approve-add')}
                            disabled={reviewEntry.isPending || approveAndAdd.isPending}
                          >
                            Approve & Add to System
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => startReview(entry, 'reject')}
                            disabled={reviewEntry.isPending || approveAndAdd.isPending}
                          >
                            Reject
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Reviewed Entries */}
            {reviewedEntries.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Recently Reviewed</h3>
                <div className="space-y-3">
                  {reviewedEntries.slice(0, 5).map((entry) => (
                    <Card key={entry.id} className="border-l-4 border-l-border">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">
                              {FIELD_LABELS[entry.field_name as SystemField] || entry.field_name}
                            </p>
                            <p className="text-sm text-muted-foreground">{entry.custom_value}</p>
                            <p className="text-xs text-muted-foreground">
                              {entry.organization?.name || 'Unknown Organization'} • {format(new Date(entry.reviewed_at || entry.submitted_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <Badge className={getStatusColor(entry.status)}>
                            {getStatusIcon(entry.status)}
                            <span className="ml-1 capitalize">{entry.status}</span>
                          </Badge>
                        </div>
                        {entry.admin_notes && (
                          <div className="mt-2 text-xs bg-muted p-2 rounded">
                            <strong>Admin Notes:</strong> {entry.admin_notes}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Review Dialog */}
        {selectedEntry && (
          <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {reviewAction === 'approve-add' ? 'Approve & Add to System' : 
                   reviewAction === 'approve' ? 'Approve Entry' : 'Reject Entry'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Field:</Label>
                  <p className="text-sm">{FIELD_LABELS[selectedEntry.field_name as SystemField] || selectedEntry.field_name}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Custom Value:</Label>
                  <p className="text-sm bg-muted p-2 rounded">{selectedEntry.custom_value}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Organization:</Label>
                  <p className="text-sm">{selectedEntry.organization?.name || 'Unknown Organization'}</p>
                </div>
                
                <div>
                  <Label htmlFor="admin-notes">Admin Notes (Optional):</Label>
                  <Textarea
                    id="admin-notes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add any notes for this review..."
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedEntry(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleReview}
                  disabled={reviewEntry.isPending || approveAndAdd.isPending}
                  variant={reviewAction === 'reject' ? 'destructive' : 'default'}
                >
                  {reviewAction === 'approve-add' ? 'Approve & Add' : 
                   reviewAction === 'approve' ? 'Approve' : 'Reject'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};