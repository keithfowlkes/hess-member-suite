import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface LoginRecord {
  id: string;
  timestamp: number;
  actor_username: string;
  actor_id: string;
  msg: string;
}

interface LatestLoginsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LatestLoginsModal = ({ open, onOpenChange }: LatestLoginsModalProps) => {
  const [logins, setLogins] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchLatestLogins();
    }
  }, [open]);

  const fetchLatestLogins = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-latest-logins');

      if (error) throw error;

      if (data && data.logins) {
        setLogins(data.logins);
      }
    } catch (error) {
      console.error('Error fetching login history:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" />
            Latest 20 User Logins
          </DialogTitle>
          <DialogDescription>
            Recent login activity across the system
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logins.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User Email</TableHead>
                  <TableHead>User ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logins.map((login) => (
                  <TableRow key={login.id}>
                    <TableCell className="font-medium">
                      {format(new Date(login.timestamp / 1000), 'PPp')}
                    </TableCell>
                    <TableCell>{login.actor_username}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {login.actor_id}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <LogIn className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No login records found</p>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
