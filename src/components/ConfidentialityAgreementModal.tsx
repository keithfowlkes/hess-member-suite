import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

const STORAGE_KEY_PREFIX = 'confidentiality-agreed-';

/**
 * Shows a one-time-per-session Confidentiality Agreement modal after login.
 * If the user declines, they are signed out and returned to the auth page.
 */
export function ConfidentialityAgreementModal() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setOpen(false);
      return;
    }
    try {
      const key = `${STORAGE_KEY_PREFIX}${user.id}`;
      const agreed = sessionStorage.getItem(key);
      if (!agreed) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [user]);

  const handleAgree = () => {
    try {
      if (user) sessionStorage.setItem(`${STORAGE_KEY_PREFIX}${user.id}`, '1');
    } catch {}
    setOpen(false);
  };

  const handleDecline = async () => {
    setOpen(false);
    await signOut();
  };

  if (!user) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Prevent closing via overlay/escape — force explicit choice.
        if (!next) return;
        setOpen(next);
      }}
    >
      <DialogContent
        className="max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            CONFIDENTIALITY AGREEMENT
          </DialogTitle>
          <DialogDescription className="sr-only">
            Confidentiality Agreement
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm text-foreground space-y-3 leading-relaxed">
          <p>
            The institutional information on this website is strictly
            confidential to our member institutions.
          </p>
          <p>
            If you or any of your staff are outsourced as an external commercial
            service provider, you are prohibited from sharing any and all of
            this information to your employing company or organization. If you
            agree, click below. If you decline, click decline.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleDecline}>
            Decline
          </Button>
          <Button onClick={handleAgree}>Agree</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConfidentialityAgreementModal;
