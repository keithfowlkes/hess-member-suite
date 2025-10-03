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
  cohort?: string; // Added cohort field
  user_roles: {
    role: 'admin' | 'member' | 'cohort_leader';
  }[];
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
        console.log('CohortLeaderData - Fetching cohorts for user:', user.id);

        // First, get the cohorts this user leads
        const { data: userCohortsData, error: cohortsError } = await supabase
          .from('user_cohorts')
          .select('cohort')
          .eq('user_id', user.id);

        console.log('CohortLeaderData - User cohorts:', userCohortsData, 'Error:', cohortsError);

        if (cohortsError) {
          throw new Error('Failed to fetch user cohorts');
        }

        const userCohorts = userCohortsData?.map(c => c.cohort) || [];
        console.log('CohortLeaderData - Extracted cohorts:', userCohorts);

        // Special handling for Ellucian Banner and Colleague cohort leaders
        const isEllucianCohortLeader = userCohorts.some(
          cohort => cohort === 'Ellucian Banner' || cohort === 'Ellucian Colleague'
        );
        
        const cohortsToFetch = isEllucianCohortLeader 
          ? ['Ellucian Banner', 'Ellucian Colleague']
          : userCohorts;

        if (cohortsToFetch.length === 0) {
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
          .select('user_id, cohort')
          .in('cohort', cohortsToFetch);

        console.log('CohortLeaderData - Cohort members query result:', cohortMembersData, 'Error:', membersError);

        if (membersError) {
          throw new Error('Failed to fetch cohort members');
        }

        if (!cohortMembersData || cohortMembersData.length === 0) {
          setData({
            userCohorts,
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

        // Get all user IDs for profile lookup
        const userIds = cohortMembersData.map(item => item.user_id);
        
        // Get profiles for all users with their organization data
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select(`
            id,
            user_id,
            first_name,
            last_name,
            email,
            organization,
            primary_contact_title
          `)
          .in('user_id', userIds);
        
        // Get organization data for cities and states
        const { data: organizationsData, error: orgsError } = await supabase
          .from('organizations')
          .select('name, city, state, contact_person_id')
          .eq('membership_status', 'active');

        // Get user roles for all users
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds);

        if (profilesError) {
          throw new Error('Failed to fetch profiles');
        }

        if (orgsError) {
          console.error('Failed to fetch organizations:', orgsError);
        }

        if (rolesError) {
          throw new Error('Failed to fetch user roles');
        }

        if (!profilesData || profilesData.length === 0) {
          setData({
            userCohorts,
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

        // Create a map of organization name to org data
        const orgMap = new Map(
          organizationsData?.map(org => [org.name, org]) || []
        );

        // Create a map of user_id to profile for easier lookup
        const profileMap = new Map(profilesData.map(profile => {
          const orgData = profile.organization ? orgMap.get(profile.organization) : null;
          return [
            profile.user_id,
            {
              ...profile,
              city: orgData?.city,
              state: orgData?.state
            }
          ];
        }));
        
        // Create a map of user_id to roles for easier lookup
        const rolesMap = new Map<string, { role: 'admin' | 'member' | 'cohort_leader' }[]>();
        rolesData?.forEach(roleRecord => {
          const existingRoles = rolesMap.get(roleRecord.user_id) || [];
          existingRoles.push({ role: roleRecord.role as 'admin' | 'member' | 'cohort_leader' });
          rolesMap.set(roleRecord.user_id, existingRoles);
        });

        // Process the data
        const cohortMembers: CohortMemberDetails[] = [];
        const organizationsSet = new Set<string>();
        const statesSet = new Set<string>();
        const cohortsBySystem: { [key: string]: number } = {};

        cohortMembersData?.forEach(item => {
          const profile = profileMap.get(item.user_id);
          const userRoles = rolesMap.get(item.user_id) || [{ role: 'member' as const }];
          
          if (profile) {
            cohortMembers.push({
              id: profile.id,
              first_name: profile.first_name,
              last_name: profile.last_name,
              email: profile.email,
              organization: profile.organization || '',
              city: profile.city,
              state: profile.state,
              primary_contact_title: profile.primary_contact_title,
              cohort: item.cohort, // Include cohort information
              user_roles: userRoles
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