import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Communication {
  id: string;
  organization_id: string;
  communication_type: 'email' | 'phone' | 'in_person' | 'other';
  subject?: string;
  notes: string;
  contact_person_name?: string;
  contact_person_email?: string;
  contact_person_phone?: string;
  communication_date: string;
  duration_minutes?: number;
  follow_up_required: boolean;
  follow_up_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCommunicationData {
  organization_id: string;
  communication_type: 'email' | 'phone' | 'in_person' | 'other';
  subject?: string;
  notes: string;
  contact_person_name?: string;
  contact_person_email?: string;
  contact_person_phone?: string;
  communication_date: string;
  duration_minutes?: number;
  follow_up_required: boolean;
  follow_up_date?: string;
}

export function useCommunications(organizationId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch communications for a specific organization
  const { data: communications = [], isLoading, error } = useQuery({
    queryKey: ['communications', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('communications')
        .select('*')
        .eq('organization_id', organizationId)
        .order('communication_date', { ascending: false });

      if (error) throw error;
      return data as Communication[];
    },
    enabled: !!organizationId,
  });

  // Create communication mutation
  const createCommunication = useMutation({
    mutationFn: async (data: CreateCommunicationData) => {
      const { data: result, error } = await supabase
        .from('communications')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', organizationId] });
      toast({
        title: "Communication Added",
        description: "Communication entry has been successfully recorded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add communication",
        variant: "destructive"
      });
    },
  });

  // Update communication mutation
  const updateCommunication = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateCommunicationData> }) => {
      const { data: result, error } = await supabase
        .from('communications')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', organizationId] });
      toast({
        title: "Communication Updated",
        description: "Communication entry has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update communication",
        variant: "destructive"
      });
    },
  });

  // Delete communication mutation
  const deleteCommunication = useMutation({
    mutationFn: async (id: string) => {
      console.log('Attempting to delete communication with ID:', id);
      const { error } = await supabase
        .from('communications')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
      console.log('Delete successful for ID:', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', organizationId] });
      toast({
        title: "Communication Deleted",
        description: "Communication entry has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete communication",
        variant: "destructive"
      });
    },
  });

  return {
    communications,
    isLoading,
    error,
    createCommunication,
    updateCommunication,
    deleteCommunication,
  };
}