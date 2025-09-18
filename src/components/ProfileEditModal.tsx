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
  const { data, loading, submitEditRequest, updateProfileDirect, canEditDirectly } = useUnifiedProfile();
  const [saving, setSaving] = useState(false);

  const handleSave = async (updates: {
    profile?: Partial<any>;
    organization?: Partial<any>;
  }) => {
    console.log('🚀 Profile modal: handleSave called with:', updates);
    console.log('🚀 Profile modal: canEditDirectly():', canEditDirectly());
    console.log('🚀 Profile modal: data:', data);
    setSaving(true);
    
    try {
      let success = false;
      
      if (canEditDirectly()) {
        console.log('🚀 Profile modal: Taking direct update path');
        // Admin can update directly
        success = await updateProfileDirect(updates);
      } else {
        console.log('🚀 Profile modal: Taking approval request path');
        // Regular users submit for approval
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