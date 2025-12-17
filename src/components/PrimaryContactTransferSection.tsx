import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Loader2, UserPlus, AlertTriangle, Clock, X, Mail } from 'lucide-react';
import { useContactTransfer } from '@/hooks/useContactTransfer';

interface PrimaryContactTransferSectionProps {
  organizationId: string;
  organizationName: string;
  currentContactEmail: string;
  isEditing: boolean;
}

export const PrimaryContactTransferSection: React.FC<PrimaryContactTransferSectionProps> = ({
  organizationId,
  organizationName,
  currentContactEmail,
  isEditing
}) => {
  const [newContactEmail, setNewContactEmail] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { 
    initiateTransfer, 
    cancelTransfer, 
    pendingTransfer, 
    loading, 
    isInitiating,
    isCancelling 
  } = useContactTransfer(organizationId);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInitiateTransfer = async () => {
    if (!validateEmail(newContactEmail)) {
      return;
    }
    
    if (newContactEmail.toLowerCase() === currentContactEmail.toLowerCase()) {
      return;
    }

    const success = await initiateTransfer(newContactEmail, organizationName);
    if (success) {
      setNewContactEmail('');
      setShowConfirmDialog(false);
    }
  };

  const handleCancelTransfer = async () => {
    if (pendingTransfer) {
      await cancelTransfer(pendingTransfer.id);
    }
  };

  const canInitiate = validateEmail(newContactEmail) && 
    newContactEmail.toLowerCase() !== currentContactEmail.toLowerCase();

  if (!isEditing) {
    return null;
  }

  return (
    <>
      <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <UserPlus className="h-5 w-5" />
            Transfer Primary Contact
          </CardTitle>
          <CardDescription>
            Transfer the primary contact role for {organizationName} to another person
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingTransfer ? (
            // Show pending transfer status
            <div className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50">
                <Clock className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  <div className="font-medium mb-1">Transfer Pending</div>
                  <p className="text-sm">
                    A transfer request has been sent to <strong>{pendingTransfer.new_contact_email}</strong>.
                  </p>
                  <p className="text-xs mt-2 text-blue-600 dark:text-blue-400">
                    Initiated: {new Date(pendingTransfer.created_at).toLocaleDateString()}
                    {' • '}
                    Expires: {new Date(pendingTransfer.expires_at).toLocaleDateString()}
                  </p>
                </AlertDescription>
              </Alert>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCancelTransfer}
                disabled={isCancelling}
                className="text-destructive hover:text-destructive"
              >
                {isCancelling ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                Cancel Transfer Request
              </Button>
            </div>
          ) : (
            // Show transfer initiation form
            <div className="space-y-4">
              <Alert className="border-amber-300 bg-amber-100/50 dark:border-amber-700 dark:bg-amber-900/30">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
                  <strong>Important:</strong> After transferring, you will no longer be the primary contact 
                  and will lose direct editing access to this organization's profile. The new contact 
                  will receive an email to accept the transfer.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="new_contact_email">New Primary Contact Email</Label>
                <div className="flex gap-2">
                  <Input
                    id="new_contact_email"
                    type="email"
                    placeholder="Enter email address"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={!canInitiate || isInitiating}
                  >
                    {isInitiating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    Send Transfer Request
                  </Button>
                </div>
                {newContactEmail && !validateEmail(newContactEmail) && (
                  <p className="text-xs text-destructive">Please enter a valid email address</p>
                )}
                {newContactEmail.toLowerCase() === currentContactEmail.toLowerCase() && (
                  <p className="text-xs text-destructive">Cannot transfer to yourself</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Primary Contact Transfer</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to transfer the primary contact role for <strong>{organizationName}</strong> to:
              </p>
              <p className="font-medium text-foreground bg-muted px-3 py-2 rounded">
                {newContactEmail}
              </p>
              <p className="text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                After the transfer is complete, you will no longer have primary access to update 
                this organization's profile.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleInitiateTransfer}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isInitiating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Confirm Transfer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
