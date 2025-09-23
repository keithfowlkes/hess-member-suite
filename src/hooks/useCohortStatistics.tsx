import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CohortStatistics {
  cohortName: string;
  organizationCount: number;
  memberCount: number;
  organizations: {
    id: string;
    name: string;
    memberCount: number;
  }[];
}

export const useCohortStatistics = () => {
  return useQuery({
    queryKey: ['cohort-statistics'],
    queryFn: async (): Promise<CohortStatistics[]> => {
      // Get all available cohorts
      const availableCohorts = [
        'Advancement Services',
        'Business Affairs',
        'Enrollment Management',
        'IT Leadership', 
        'Student Affairs'
      ];

      const cohortStats: CohortStatistics[] = [];

      for (const cohortName of availableCohorts) {
        // Get all users in this cohort
        const { data: userCohorts, error: cohortError } = await supabase
          .from('user_cohorts')
          .select(`
            user_id,
            cohort
          `)
          .eq('cohort', cohortName);

        if (cohortError) {
          console.error(`Error fetching cohort ${cohortName}:`, cohortError);
          continue;
        }

        if (!userCohorts || userCohorts.length === 0) {
          cohortStats.push({
            cohortName,
            organizationCount: 0,
            memberCount: 0,
            organizations: []
          });
          continue;
        }

        // Get profile and organization data for these users
        const userIds = userCohorts.map(uc => uc.user_id);
        
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            user_id,
            organization,
            first_name,
            last_name
          `)
          .in('user_id', userIds);

        if (profileError) {
          console.error(`Error fetching profiles for cohort ${cohortName}:`, profileError);
          continue;
        }

        // Get organizations for these profiles
        const organizationNames = [...new Set(profiles?.map(p => p.organization).filter(Boolean) || [])];
        
        const { data: organizations, error: orgError } = await supabase
          .from('organizations')
          .select(`
            id,
            name,
            contact_person_id
          `)
          .in('name', organizationNames)
          .eq('membership_status', 'active');

        if (orgError) {
          console.error(`Error fetching organizations for cohort ${cohortName}:`, orgError);
          continue;
        }

        // Count members per organization
        const orgStats = organizations?.map(org => {
          const orgProfiles = profiles?.filter(p => p.organization === org.name) || [];
          return {
            id: org.id,
            name: org.name,
            memberCount: orgProfiles.length
          };
        }) || [];

        cohortStats.push({
          cohortName,
          organizationCount: organizations?.length || 0,
          memberCount: profiles?.length || 0,
          organizations: orgStats
        });
      }

      return cohortStats;
    },
    staleTime: 1000 * 60 * 5, // Consider data stale after 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });
};