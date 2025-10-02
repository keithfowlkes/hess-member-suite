import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CohortStatistics {
  cohortName: string;
  organizationCount: number;
  memberCount: number;
  organizations: {
    id: string;
    name: string;
    city?: string;
    state?: string;
    memberCount: number;
    primaryContactName?: string;
  }[];
}

export const useCohortStatistics = () => {
  return useQuery({
    queryKey: ['cohort-statistics'],
    queryFn: async (): Promise<CohortStatistics[]> => {
      try {
        // Get all unique cohorts from the database
        const { data: allCohorts, error: cohortListError } = await supabase
          .from('user_cohorts')
          .select('cohort')
          .order('cohort');

        if (cohortListError) {
          console.error('Error fetching cohort list:', cohortListError);
          throw cohortListError;
        }

        // Get unique cohort names
        const uniqueCohorts = [...new Set(allCohorts?.map(c => c.cohort) || [])];
        
        if (uniqueCohorts.length === 0) {
          return [];
        }

        const cohortStats: CohortStatistics[] = [];

        for (const cohortName of uniqueCohorts) {
          // Get all users in this cohort
          const { data: userCohorts, error: cohortError } = await supabase
            .from('user_cohorts')
            .select('user_id, cohort')
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

          // Get profiles for these users
          const userIds = userCohorts.map(uc => uc.user_id);
          
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, user_id, organization, first_name, last_name')
            .in('user_id', userIds);

          if (profileError) {
            console.error(`Error fetching profiles for cohort ${cohortName}:`, profileError);
            continue;
          }

          if (!profiles || profiles.length === 0) {
            cohortStats.push({
              cohortName,
              organizationCount: 0,
              memberCount: 0,
              organizations: []
            });
            continue;
          }

          // Get organization data for cities and states
          const organizationNames = [...new Set(profiles.map(p => p.organization).filter(Boolean))] as string[];
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('name, city, state, contact_person_id, profiles!organizations_contact_person_id_fkey(first_name, last_name)')
            .in('name', organizationNames);

          if (orgError) {
            console.error(`Error fetching organization data for cohort ${cohortName}:`, orgError);
          }

          // Create a map of organization names to org data
          const orgDataMap = new Map(
            orgData?.map(org => [org.name, org]) || []
          );

          // Create a map of organization names to primary contact info
          const orgContactMap = new Map<string, string>();
          orgData?.forEach(org => {
            if (org.profiles && org.profiles.first_name && org.profiles.last_name) {
              orgContactMap.set(org.name, `${org.profiles.first_name} ${org.profiles.last_name}`);
            }
          });

          // Group by organization
          const organizationMap = new Map<string, {
            members: typeof profiles,
            city?: string,
            state?: string,
            primaryContactName?: string
          }>();

          profiles.forEach(profile => {
            if (profile.organization) {
              const orgInfo = orgDataMap.get(profile.organization);
              if (!organizationMap.has(profile.organization)) {
                organizationMap.set(profile.organization, {
                  members: [],
                  city: orgInfo?.city || undefined,
                  state: orgInfo?.state || undefined,
                  primaryContactName: orgContactMap.get(profile.organization) || undefined
                });
              }
              organizationMap.get(profile.organization)!.members.push(profile);
            }
          });

          // Convert to organization stats
          const orgStats = Array.from(organizationMap.entries()).map(([orgName, data]) => ({
            id: `org-${orgName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            name: orgName,
            city: data.city,
            state: data.state,
            memberCount: data.members.length,
            primaryContactName: data.primaryContactName
          }));

          cohortStats.push({
            cohortName,
            organizationCount: orgStats.length,
            memberCount: profiles.length,
            organizations: orgStats.sort((a, b) => b.memberCount - a.memberCount)
          });
        }

        return cohortStats.sort((a, b) => a.cohortName.localeCompare(b.cohortName));
        
      } catch (error) {
        console.error('Error in cohort statistics query:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // Consider data stale after 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    retry: 2,
    retryDelay: 1000,
  });
};