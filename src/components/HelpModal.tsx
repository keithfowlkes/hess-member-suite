import { ReactNode, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface HelpModalProps {
  title: string;
  children: ReactNode;
  ariaLabel?: string;
}

/**
 * Small "?" icon button that opens a modal with contextual help.
 * Used to explain UI blocks to end users and admins.
 */
export function HelpModal({ title, children, ariaLabel = 'Help' }: HelpModalProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={ariaLabel}
      >
        <HelpCircle className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              {title}
            </DialogTitle>
            <DialogDescription className="sr-only">Help and instructions</DialogDescription>
          </DialogHeader>
          <div className="text-sm text-foreground space-y-3 leading-relaxed">
            {children}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default HelpModal;
