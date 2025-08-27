import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Institution {
  id: string;
  name: string;
  city?: string;
  state?: string;
  email?: string;
  website?: string;
}

export const useInstitutionsBySystem = (systemField: string | null, systemName: string | null) => {
  return useQuery({
    queryKey: ['institutions-by-system', systemField, systemName],
    queryFn: async (): Promise<Institution[]> => {
      if (!systemField || !systemName) return [];

      // Handle "Other" case - get all institutions with count < 11 for that system
      if (systemName === 'Other') {
        // First get all data to count occurrences
        const { data: allData, error: allError } = await supabase
          .from('organizations')
          .select('*')
          .eq('membership_status', 'active');

        if (allError) throw allError;
        if (!allData) return [];

        // Count occurrences for the specific system field
        const counts: Record<string, number> = {};
        allData.forEach(org => {
          const value = (org as any)[systemField];
          if (value && typeof value === 'string' && value.trim()) {
            counts[value] = (counts[value] || 0) + 1;
          }
        });

        // Filter for systems with count < 11
        const smallSystems = Object.entries(counts)
          .filter(([, count]) => count < 11)
          .map(([name]) => name);

        if (smallSystems.length === 0) return [];

        // Filter the data to get institutions using small systems
        const filteredData = allData.filter(org => {
          const value = (org as any)[systemField];
          return value && smallSystems.includes(value);
        });

        return filteredData.map(org => ({
          id: org.id,
          name: org.name,
          city: org.city,
          state: org.state,
          email: org.email,
          website: org.website,
        })) as Institution[];
      }

      // Regular case - exact match
      // Get all data and filter in JavaScript to avoid TypeScript issues
      const { data: allData, error } = await supabase
        .from('organizations')
        .select('id, name, city, state, email, website, student_information_system, financial_system, learning_management, financial_aid, hcm_hr, payroll_system, housing_management, admissions_crm, alumni_advancement_crm')
        .eq('membership_status', 'active');

      if (error) throw error;
      if (!allData) return [];

      // Filter the data based on the system field and name
      const filteredData = allData.filter(org => {
        const value = (org as any)[systemField];
        return value === systemName;
      });

      return filteredData.map(org => ({
        id: org.id,
        name: org.name,
        city: org.city,
        state: org.state,
        email: org.email,
        website: org.website,
      })) as Institution[];
    },
    enabled: !!(systemField && systemName),
  });
};