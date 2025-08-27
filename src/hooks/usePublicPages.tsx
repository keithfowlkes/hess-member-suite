import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PublicPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  meta_description: string | null;
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const usePublicPages = () => {
  return useQuery({
    queryKey: ['public-pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_pages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PublicPage[];
    },
  });
};

export const useCreatePublicPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pageData: {
      title: string;
      slug: string;
      content: string;
      meta_description?: string;
      is_published?: boolean;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('public_pages')
        .insert({
          ...pageData,
          created_by: userData.user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-pages'] });
      toast({
        title: "Success",
        description: "Public page created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create public page",
        variant: "destructive"
      });
    }
  });
};

export const useUpdatePublicPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      ...updateData 
    }: Partial<PublicPage> & { id: string }) => {
      const { data, error } = await supabase
        .from('public_pages')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-pages'] });
      toast({
        title: "Success",
        description: "Public page updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update public page",
        variant: "destructive"
      });
    }
  });
};

export const useDeletePublicPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('public_pages')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-pages'] });
      toast({
        title: "Success",
        description: "Public page deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete public page",
        variant: "destructive"
      });
    }
  });
};