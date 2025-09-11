import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface UserMessage {
  id: string;
  user_name: string;
  user_email: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export function useUserMessages() {
  return useQuery({
    queryKey: ['user-messages'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('user_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UserMessage[];
    },
  });
}

export function useUnreadMessageCount() {
  return useQuery({
    queryKey: ['unread-message-count'],
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from('user_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    },
  });
}

export function useCreateUserMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { user_name: string; user_email: string; message: string }) => {
      const { error } = await (supabase as any)
        .from('user_messages')
        .insert([data]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-message-count'] });
      toast({
        title: "Message Sent",
        description: "Your message has been submitted successfully.",
      });
    },
    onError: (error) => {
      console.error('Error creating user message:', error);
      toast({
        title: "Error",
        description: "Failed to submit message. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useMarkMessageAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await (supabase as any)
        .from('user_messages')
        .update({ is_read: true })
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-message-count'] });
    },
    onError: (error) => {
      console.error('Error marking message as read:', error);
    },
  });
}

export function useDeleteUserMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await (supabase as any)
        .from('user_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-message-count'] });
      toast({
        title: "Message Deleted",
        description: "The message has been deleted successfully.",
      });
    },
    onError: (error) => {
      console.error('Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useMarkAllMessagesAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from('user_messages')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-message-count'] });
    },
    onError: (error) => {
      console.error('Error marking all messages as read:', error);
    },
  });
}