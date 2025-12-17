import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TransferRequest {
  id: string;
  organization_id: string;
  new_contact_email: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export function useContactTransfer(organizationId: string) {
  const [pendingTransfer, setPendingTransfer] = useState<TransferRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitiating, setIsInitiating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const { toast } = useToast();

  const fetchPendingTransfer = async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('organization_transfer_requests')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .maybeSingle();

      if (error) throw error;
      setPendingTransfer(data);
    } catch (error: any) {
      console.error('Error fetching pending transfer:', error);
    } finally {
      setLoading(false);
    }
  };

  const initiateTransfer = async (newContactEmail: string, organizationName: string) => {
    setIsInitiating(true);
    try {
      const { data, error } = await supabase.functions.invoke('initiate-contact-transfer', {
        body: {
          organization_id: organizationId,
          new_contact_email: newContactEmail,
          organization_name: organizationName
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Transfer Request Sent',
        description: `An email has been sent to ${newContactEmail} with instructions to accept the transfer.`
      });

      await fetchPendingTransfer();
      return true;
    } catch (error: any) {
      console.error('Error initiating transfer:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to initiate transfer',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsInitiating(false);
    }
  };

  const cancelTransfer = async (requestId: string) => {
    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from('organization_transfer_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Transfer Cancelled',
        description: 'The transfer request has been cancelled.'
      });

      setPendingTransfer(null);
      return true;
    } catch (error: any) {
      console.error('Error cancelling transfer:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel transfer',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsCancelling(false);
    }
  };

  useEffect(() => {
    fetchPendingTransfer();

    // Subscribe to changes
    const channel = supabase
      .channel(`transfer_requests_${organizationId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'organization_transfer_requests',
          filter: `organization_id=eq.${organizationId}`
        }, 
        () => {
          fetchPendingTransfer();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [organizationId]);

  return {
    pendingTransfer,
    loading,
    isInitiating,
    isCancelling,
    initiateTransfer,
    cancelTransfer,
    refetch: fetchPendingTransfer
  };
}
