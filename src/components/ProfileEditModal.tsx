import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useUnifiedProfile } from '@/hooks/useUnifiedProfile';
import { UnifiedProfileEditor } from '@/components/UnifiedProfileEditor';

interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  open,
  onOpenChange
}) => {
  const { 
    data, 
    loading, 
    submitEditRequest, 
    updateProfileDirect, 
    updatePrimaryContactProfile,
    canEditDirectly 
  } = useUnifiedProfile();
  const [saving, setSaving] = useState(false);

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

  return (
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
  );
};