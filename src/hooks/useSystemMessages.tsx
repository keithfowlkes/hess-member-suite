import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SystemMessage {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  email_type?: string; // Optional field for email templates
}

export const useSystemMessages = (activeOnly: boolean = false) => {
  return useQuery({
    queryKey: ['system-messages', activeOnly],
    queryFn: async () => {
      let query = supabase
        .from('system_messages')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SystemMessage[];
    },
  });
};

export const useCreateSystemMessage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: Omit<SystemMessage, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('system_messages')
        .insert([message])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-messages'] });
      toast({
        title: "Success",
        description: "System message created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create system message",
        variant: "destructive"
      });
    }
  });
};

export const useUpdateSystemMessage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SystemMessage> & { id: string }) => {
      const { data, error } = await supabase
        .from('system_messages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-messages'] });
      toast({
        title: "Success",
        description: "System message updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update system message",
        variant: "destructive"
      });
    }
  });
};

export const useDeleteSystemMessage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('system_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-messages'] });
      toast({
        title: "Success",
        description: "System message deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete system message",
        variant: "destructive"
      });
    }
  });
};