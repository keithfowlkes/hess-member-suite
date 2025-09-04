import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, XSquare, Flag, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PendingRegistration } from '@/hooks/usePendingRegistrations';

interface BulkRegistrationActionsProps {
  registrations: PendingRegistration[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onBulkApprove: (ids: string[], adminUserId?: string) => Promise<void>;
  onBulkReject: (ids: string[], reason: string, adminUserId?: string) => Promise<void>;
  onBulkPriorityUpdate: (ids: string[], priority: string, adminUserId?: string) => Promise<void>;
  adminUserId?: string;
}

export function BulkRegistrationActions({
  registrations,
  selectedIds,
  onSelectionChange,
  onBulkApprove,
  onBulkReject,
  onBulkPriorityUpdate,
  adminUserId
}: BulkRegistrationActionsProps) {
  const [showBulkReject, setShowBulkReject] = useState(false);
  const [showBulkPriority, setShowBulkPriority] = useState(false);
  const [bulkRejectionReason, setBulkRejectionReason] = useState('');
  const [bulkPriority, setBulkPriority] = useState('normal');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSelectAll = () => {
    if (selectedIds.length === registrations.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(registrations.map(r => r.id));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    
    setIsProcessing(true);
    try {
      await onBulkApprove(selectedIds, adminUserId);
      onSelectionChange([]);
      toast({
        title: "Bulk Approval Complete",
        description: `Successfully approved ${selectedIds.length} registration(s).`,
      });
    } catch (error) {
      toast({
        title: "Bulk Approval Failed",
        description: "Some registrations may not have been processed.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0 || !bulkRejectionReason.trim()) return;
    
    setIsProcessing(true);
    try {
      await onBulkReject(selectedIds, bulkRejectionReason, adminUserId);
      onSelectionChange([]);
      setShowBulkReject(false);
      setBulkRejectionReason('');
      toast({
        title: "Bulk Rejection Complete",
        description: `Successfully rejected ${selectedIds.length} registration(s).`,
      });
    } catch (error) {
      toast({
        title: "Bulk Rejection Failed",
        description: "Some registrations may not have been processed.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkPriorityUpdate = async () => {
    if (selectedIds.length === 0) return;
    
    setIsProcessing(true);
    try {
      await onBulkPriorityUpdate(selectedIds, bulkPriority, adminUserId);
      onSelectionChange([]);
      setShowBulkPriority(false);
      toast({
        title: "Priority Update Complete",
        description: `Successfully updated priority for ${selectedIds.length} registration(s).`,
      });
    } catch (error) {
      toast({
        title: "Priority Update Failed",
        description: "Some registrations may not have been processed.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  const selectedRegistrations = registrations.filter(r => selectedIds.includes(r.id));
  const priorityCounts = selectedRegistrations.reduce((acc, r) => {
    const priority = (r as any).priority_level || 'normal';
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="border-b border-gray-200 pb-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedIds.length === registrations.length && registrations.length > 0}
              onCheckedChange={handleSelectAll}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <span className="text-sm font-medium">
              {selectedIds.length > 0 
                ? `${selectedIds.length} selected` 
                : `Select all (${registrations.length})`
              }
            </span>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              {Object.entries(priorityCounts).map(([priority, count]) => (
                <Badge key={priority} variant="outline" className="text-xs">
                  <div className={`w-2 h-2 rounded-full ${getPriorityColor(priority)} mr-1`} />
                  {priority}: {count}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleBulkApprove}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
              size="sm"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
              Approve ({selectedIds.length})
            </Button>
            
            <Button
              onClick={() => setShowBulkReject(true)}
              disabled={isProcessing}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50 flex items-center gap-2"
              size="sm"
            >
              <XSquare className="h-4 w-4" />
              Reject ({selectedIds.length})
            </Button>
            
            <Button
              onClick={() => setShowBulkPriority(true)}
              disabled={isProcessing}
              variant="outline"
              className="flex items-center gap-2"
              size="sm"
            >
              <Flag className="h-4 w-4" />
              Set Priority
            </Button>
          </div>
        )}
      </div>

      {/* Bulk Reject Dialog */}
      <Dialog open={showBulkReject} onOpenChange={setShowBulkReject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Reject Registrations</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              You are about to reject {selectedIds.length} registration(s). Please provide a reason:
            </p>
            <div>
              <Label htmlFor="bulk-rejection-reason">Rejection Reason</Label>
              <Textarea
                id="bulk-rejection-reason"
                value={bulkRejectionReason}
                onChange={(e) => setBulkRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="min-h-[100px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBulkReject(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBulkReject}
                disabled={!bulkRejectionReason.trim() || isProcessing}
                className="bg-red-600 hover:bg-red-700"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Reject All
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Priority Dialog */}
      <Dialog open={showBulkPriority} onOpenChange={setShowBulkPriority}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Priority Level</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Set priority level for {selectedIds.length} registration(s):
            </p>
            <div>
              <Label htmlFor="bulk-priority">Priority Level</Label>
              <Select value={bulkPriority} onValueChange={setBulkPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-500" />
                      Low Priority
                    </div>
                  </SelectItem>
                  <SelectItem value="normal">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      Normal Priority
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                      High Priority
                    </div>
                  </SelectItem>
                  <SelectItem value="urgent">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      Urgent Priority
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBulkPriority(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBulkPriorityUpdate}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Update Priority
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}