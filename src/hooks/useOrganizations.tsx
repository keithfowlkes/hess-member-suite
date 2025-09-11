import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export const useOrganizations = () => {
  const queryClient = useQueryClient();

  // Set up real-time subscription to invalidate cache when organizations change
  useEffect(() => {
    const channelName = `organizations_cache_invalidation_${Math.random().toString(36).substr(2, 9)}`;
    const subscription = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'organizations' 
        }, 
        () => {
          console.log('Organizations table changed, invalidating React Query cache...');
          queryClient.invalidateQueries({ queryKey: ['organizations'] });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('membership_status', 'active')
        .eq('organization_type', 'member')
        .order('name');

      if (error) throw error;
      return data;
    },
  });
};