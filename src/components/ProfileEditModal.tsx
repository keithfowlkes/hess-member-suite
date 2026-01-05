import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Key } from 'lucide-react';
import { useUnifiedProfile } from '@/hooks/useUnifiedProfile';
import { UnifiedProfileEditor } from '@/components/UnifiedProfileEditor';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  open,
  onOpenChange
}) => {
  const { user } = useAuth();
  const { 
    data, 
    loading, 
    submitEditRequest, 
    updateProfileDirect, 
    updatePrimaryContactProfile,
    canEditDirectly 
  } = useUnifiedProfile();
  const [saving, setSaving] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSave = async (updates: {
    profile?: Partial<any>;
    organization?: Partial<any>;
  }) => {
    console.log('🚀 Profile modal: handleSave called with:', updates);
    setSaving(true);
    
    try {
      // Check if user is primary contact of their organization
      const isPrimaryContact = data?.organization?.contact_person_id === data?.profile?.id;
      console.log('🚀 Profile modal: isPrimaryContact:', isPrimaryContact);
      console.log('🚀 Profile modal: contact_person_id:', data?.organization?.contact_person_id);
      console.log('🚀 Profile modal: profile.id:', data?.profile?.id);
      
      let success = false;
      
      if (isPrimaryContact) {
        console.log('🚀 Profile modal: Using primary contact direct update');
        // Primary contact users can update directly through this modal
        success = await updatePrimaryContactProfile(updates);
      } else {
        console.log('🚀 Profile modal: Using approval request workflow');
        // All other users go through approval
        success = await submitEditRequest(updates);
      }
      
      if (success) {
        onOpenChange(false); // Close modal on successful save
      }
      
      return success;
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Missing Fields",
        description: "Please fill in both password fields.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords match.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    setChangingPassword(true);
    try {
      // Use the auth user_id, not the profile id
      const authUserId = user?.id;
      
      if (!authUserId) {
        throw new Error("User ID not found");
      }

      const { data: result, error } = await supabase.functions.invoke('change-user-password', {
        body: { userId: authUserId, newPassword }
      });

      if (error) throw error;

      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully."
      });
      
      setShowPasswordDialog(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to change password.",
        variant: "destructive"
      });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Organization Profile Management</DialogTitle>
          </DialogHeader>
          
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : !data ? (
            <div className="text-center py-8">
              <h3 className="text-lg font-medium text-foreground mb-2">Profile Not Found</h3>
              <p className="text-muted-foreground">Unable to load your profile information.</p>
            </div>
          ) : (
            <div className="mt-4">
              {/* Change Password Button - Always visible */}
              <div className="flex justify-end mb-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowPasswordDialog(true)}
                  className="gap-2"
                >
                  <Key className="h-4 w-4" />
                  Change Password
                </Button>
              </div>

              <UnifiedProfileEditor
                data={data}
                canEditDirectly={canEditDirectly()}
                onSave={handleSave}
                saving={saving}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Your Password</DialogTitle>
            <DialogDescription>
              Enter your new password below. Password must be at least 6 characters.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="modal-new-password">New Password</Label>
              <Input
                id="modal-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-confirm-password">Confirm Password</Label>
              <Input
                id="modal-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={changingPassword}>
              {changingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Changing...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
