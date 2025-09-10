import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface OrganizationTotals {
  totalOrganizations: number;
  totalStudentFte: number;
}

export const useOrganizationTotals = () => {
  const queryClient = useQueryClient();

  // Set up real-time subscription to invalidate cache when analytics data changes
  useEffect(() => {
    const channelName = `org_totals_cache_invalidation_${Math.random().toString(36).substr(2, 9)}`;
    const subscription = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'system_analytics_datacube' 
        }, 
        () => {
          console.log('Analytics datacube changed, invalidating organization totals cache...');
          queryClient.invalidateQueries({ queryKey: ['organization-totals-datacube'] });
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'organizations' 
        }, 
        () => {
          console.log('Organizations table changed, invalidating organization totals cache...');
          queryClient.invalidateQueries({ queryKey: ['organization-totals-datacube'] });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['organization-totals-datacube'],
    queryFn: async (): Promise<OrganizationTotals> => {
      // Fetch pre-computed totals from the datacube
      const { data, error } = await supabase
        .from('system_analytics_datacube')
        .select('system_name, institution_count')
        .eq('system_field', 'organization_totals');

      if (error) throw error;

      const totalsMap = data.reduce((acc, item) => {
        acc[item.system_name] = item.institution_count;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalOrganizations: totalsMap['total_organizations'] || 0,
        totalStudentFte: totalsMap['total_student_fte'] || 0
      };
    },
    staleTime: 1000 * 60 * 30, // Consider data stale after 30 minutes
    gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
  });
};