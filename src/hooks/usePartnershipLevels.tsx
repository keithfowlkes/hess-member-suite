import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type PartnershipBadgeStyle = 'default' | 'secondary' | 'outline';

export interface PartnershipLevel {
  id: string;
  name: string;
  description: string | null;
  badge_style: PartnershipBadgeStyle;
  display_order: number;
  is_active: boolean;
}

export const usePartnershipLevels = () =>
  useQuery({
    queryKey: ['partnership-levels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partnership_levels')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PartnershipLevel[];
    },
  });

export const useSavePartnershipLevel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (level: Partial<PartnershipLevel> & { name: string }) => {
      const { id, ...fields } = level as any;
      if (id) {
        const { error } = await supabase.from('partnership_levels').update(fields).eq('id', id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from('partnership_levels').insert(fields);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnership-levels'] });
      toast({ title: 'Saved', description: 'Partnership level saved.' });
    },
    onError: (error: any) =>
      toast({
        title: 'Error',
        description: error.message || 'Could not save this partnership level.',
        variant: 'destructive',
      }),
  });
};

export const useDeletePartnershipLevel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('partnership_levels').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnership-levels'] });
      queryClient.invalidateQueries({ queryKey: ['business-partners'] });
      toast({ title: 'Deleted', description: 'Partnership level removed.' });
    },
    onError: (error: any) =>
      toast({
        title: 'Error',
        description: error.message || 'Could not delete this partnership level.',
        variant: 'destructive',
      }),
  });
};
