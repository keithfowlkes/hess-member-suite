import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SystemUsage {
  name: string;
  count: number;
}

const processSystemData = (data: any[], field: string): SystemUsage[] => {
  const counts: Record<string, number> = {};
  
  data.forEach(org => {
    const value = org[field];
    if (value && value.trim()) {
      counts[value] = (counts[value] || 0) + 1;
    }
  });

  // Convert to array and group small values into "Other"
  let systemData = Object.entries(counts).map(([name, count]) => ({ name, count }));
  
  // Separate items with count >= 11 and < 11
  const mainItems = systemData.filter(item => item.count >= 11);
  const smallItems = systemData.filter(item => item.count < 11);
  
  // If there are small items, group them into "Other"
  if (smallItems.length > 0) {
    const otherCount = smallItems.reduce((sum, item) => sum + item.count, 0);
    if (otherCount > 0) {
      mainItems.push({ name: 'Other', count: otherCount });
    }
  }
  
  return mainItems.sort((a, b) => b.count - a.count);
};

export const useProgressiveSystemAnalytics = (systemField: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['progressive-system-analytics', systemField],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select(systemField)
        .eq('membership_status', 'active')
        .neq('name', 'Administrator');

      if (error) throw error;

      return processSystemData(data, systemField);
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
};