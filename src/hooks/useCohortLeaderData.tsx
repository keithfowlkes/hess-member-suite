import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CohortMemberDetails {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  organization: string;
  city?: string;
  state?: string;
  primary_contact_title?: string;
}

export interface CohortLeaderData {
  userCohorts: string[];
  cohortMembers: CohortMemberDetails[];
  cohortStats: {
    totalMembers: number;
    totalOrganizations: number;
    representedStates: number;
    cohortsBySystem: { [key: string]: number };
  };
}

export function useCohortLeaderData() {
  const { user } = useAuth();
  const [data, setData] = useState<CohortLeaderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCohortLeaderData = async () => {
      if (!user) return;

      try {
        // First, get the cohorts this user leads
        const { data: userCohortsData, error: cohortsError } = await supabase
          .from('user_cohorts')
          .select('cohort')
          .eq('user_id', user.id);

        if (cohortsError) {
          throw new Error('Failed to fetch user cohorts');
        }

        const userCohorts = userCohortsData?.map(c => c.cohort) || [];

        if (userCohorts.length === 0) {
          setData({
            userCohorts: [],
            cohortMembers: [],
            cohortStats: {
              totalMembers: 0,
              totalOrganizations: 0,
              representedStates: 0,
              cohortsBySystem: {}
            }
          });
          return;
        }

        // Get all users in the same cohorts
        const { data: cohortMembersData, error: membersError } = await supabase
          .from('user_cohorts')
          .select(`
            user_id,
            cohort,
            profiles:user_id (
              id,
              first_name,
              last_name,
              email,
              organization,
              city,
              state,
              primary_contact_title
            )
          `)
          .in('cohort', userCohorts);

        if (membersError) {
          throw new Error('Failed to fetch cohort members');
        }

        // Process the data
        const cohortMembers: CohortMemberDetails[] = [];
        const organizationsSet = new Set<string>();
        const statesSet = new Set<string>();
        const cohortsBySystem: { [key: string]: number } = {};

        cohortMembersData?.forEach(item => {
          if (item.profiles) {
            const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
            cohortMembers.push({
              id: profile.id,
              first_name: profile.first_name,
              last_name: profile.last_name,
              email: profile.email,
              organization: profile.organization || '',
              city: profile.city,
              state: profile.state,
              primary_contact_title: profile.primary_contact_title
            });

            // Track organizations and states
            if (profile.organization) {
              organizationsSet.add(profile.organization);
            }
            if (profile.state) {
              statesSet.add(profile.state);
            }

            // Count by cohort system
            if (cohortsBySystem[item.cohort]) {
              cohortsBySystem[item.cohort]++;
            } else {
              cohortsBySystem[item.cohort] = 1;
            }
          }
        });

        setData({
          userCohorts,
          cohortMembers,
          cohortStats: {
            totalMembers: cohortMembers.length,
            totalOrganizations: organizationsSet.size,
            representedStates: statesSet.size,
            cohortsBySystem
          }
        });

      } catch (err) {
        console.error('Error fetching cohort leader data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load cohort data');
      } finally {
        setLoading(false);
      }
    };

    fetchCohortLeaderData();
  }, [user]);

  return { data, loading, error };
}