import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCustomSoftwareEntries } from '@/hooks/useCustomSoftwareEntries';
import { CustomEntriesReviewDialog } from '@/components/CustomEntriesReviewDialog';

export const AdminCustomEntriesNotification = () => {
  const { data: entries } = useCustomSoftwareEntries();
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const pendingCount = entries?.filter(entry => entry.status === 'pending').length || 0;
  
  if (pendingCount === 0) {
    return null;
  }
  
  return (
    <>
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => setDialogOpen(true)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 px-1.5 py-0.5 text-xs min-w-[1.2rem] h-5"
        >
          {pendingCount}
        </Badge>
        <span className="ml-2">Custom Entries</span>
      </Button>
      
      <CustomEntriesReviewDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
};