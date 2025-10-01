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
    queryKey: ['institutions-by-system-optimized', systemField, systemName],
    queryFn: async (): Promise<Institution[]> => {
      if (!systemField || !systemName) return [];

      // Handle "Other" case - use datacube to identify small systems first
      if (systemName === 'Other') {
        // Get small systems from datacube (count < 11)
        const { data: systemCounts, error: countsError } = await supabase
          .from('system_analytics_datacube')
          .select('system_name')
          .eq('system_field', systemField)
          .lt('institution_count', 11);

        if (countsError) throw countsError;
        if (!systemCounts || systemCounts.length === 0) return [];

        const smallSystemNames = systemCounts.map(entry => entry.system_name);

        // Get organizations with optimized query - select only needed fields
        const { data: allOrgs, error: orgsError } = await supabase
          .from('organizations')
          .select('id, name, city, state, email, website, student_information_system, financial_system, learning_management, financial_aid, hcm_hr, payroll_system, purchasing_system, housing_management, admissions_crm, alumni_advancement_crm, payment_platform, meal_plan_management, identity_management, door_access, document_management, voip, network_infrastructure')
          .eq('membership_status', 'active');

        if (orgsError) throw orgsError;
        if (!allOrgs) return [];

        // Filter for small systems
        const filteredOrgs = allOrgs.filter(org => {
          const value = (org as any)[systemField];
          return value && smallSystemNames.includes(value);
        });

        return filteredOrgs
          .map(org => ({
            id: org.id,
            name: org.name,
            city: org.city,
            state: org.state,
            email: org.email,
            website: org.website,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
      }

      // Regular case - optimized query for specific system
      const { data: allOrgs, error } = await supabase
        .from('organizations')
        .select('id, name, city, state, email, website, student_information_system, financial_system, learning_management, financial_aid, hcm_hr, payroll_system, purchasing_system, housing_management, admissions_crm, alumni_advancement_crm, payment_platform, meal_plan_management, identity_management, door_access, document_management, voip, network_infrastructure')
        .eq('membership_status', 'active');

      if (error) throw error;
      if (!allOrgs) return [];

      // Filter by system field
      const filteredOrgs = allOrgs.filter(org => {
        const value = (org as any)[systemField];
        return value === systemName;
      });

      return filteredOrgs
        .map(org => ({
          id: org.id,
          name: org.name,
          city: org.city,
          state: org.state,
          email: org.email,
          website: org.website,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!(systemField && systemName),
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  });
};