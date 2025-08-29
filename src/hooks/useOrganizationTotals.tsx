import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrganizationTotals {
  totalOrganizations: number;
  totalStudentFte: number;
}

export const useOrganizationTotals = () => {
  return useQuery({
    queryKey: ['organization-totals'],
    queryFn: async (): Promise<OrganizationTotals> => {
      const { data, error } = await supabase
        .from('organizations')
        .select('student_fte')
        .eq('membership_status', 'active') // Only count active organizations
        .neq('name', 'Administrator'); // Exclude admin organization

      if (error) throw error;

      const totalOrganizations = data.length;
      const totalStudentFte = data.reduce((sum, org) => {
        const fte = org.student_fte || 0;
        return sum + fte;
      }, 0);

      return {
        totalOrganizations,
        totalStudentFte
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};