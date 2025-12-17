import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export interface TransferRequest {
  id: string;
  organization_id: string;
  requested_by: string;
  current_contact_id: string;
  new_contact_id: string | null;
  new_contact_email: string;
  transfer_token: string;
  status: 'pending' | 'accepted' | 'completed' | 'rejected' | 'cancelled' | 'expired';
  expires_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  organization?: {
    name: string;
  };
  current_contact?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  new_contact_profile?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export const useTransferRequests = () => {
  const { toast } = useToast();
  
  const query = useQuery({
    queryKey: ['transfer-requests'],
    queryFn: async () => {
      // Get pending and accepted (awaiting admin approval) transfer requests
      const { data, error } = await supabase
        .from('organization_transfer_requests')
        .select('*')
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with organization and contact data
      const enrichedRequests = await Promise.all(
        (data || []).map(async (request) => {
          try {
            // Get organization
            const { data: orgData } = await supabase
              .from('organizations')
              .select('name')
              .eq('id', request.organization_id)
              .maybeSingle();

            // Get current contact profile
            const { data: currentContactData } = await supabase
              .from('profiles')
              .select('first_name, last_name, email')
              .eq('id', request.current_contact_id)
              .maybeSingle();

            // Get new contact profile if exists
            let newContactProfile = null;
            if (request.new_contact_id) {
              const { data: newContact } = await supabase
                .from('profiles')
                .select('first_name, last_name, email')
                .eq('id', request.new_contact_id)
                .maybeSingle();
              newContactProfile = newContact;
            }

            return {
              ...request,
              organization: orgData,
              current_contact: currentContactData,
              new_contact_profile: newContactProfile
            };
          } catch (error) {
            console.error('Error enriching transfer request:', request.id, error);
            return request;
          }
        })
      );

      return enrichedRequests as TransferRequest[];
    },
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('transfer-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_transfer_requests'
        },
        (payload) => {
          console.log('Transfer request change:', payload);
          query.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [query.refetch]);

  return query;
};

export const useApproveTransferRequest = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data, error } = await supabase.functions.invoke('approve-contact-transfer', {
        body: { transfer_id: id, admin_notes: notes }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      
      toast({
        title: "Transfer Approved",
        description: "The primary contact transfer has been completed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve transfer request",
        variant: "destructive"
      });
    }
  });
};

export const useRejectTransferRequest = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { error } = await supabase
        .from('organization_transfer_requests')
        .update({ 
          status: 'rejected',
          completed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      
      toast({
        title: "Transfer Rejected",
        description: "The transfer request has been rejected.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject transfer request",
        variant: "destructive"
      });
    }
  });
};
