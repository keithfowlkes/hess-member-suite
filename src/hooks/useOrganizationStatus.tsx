import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface OrganizationStatus {
  hasOrganization: boolean;
  membershipStatus: 'pending' | 'active' | 'cancelled' | null;
  organizationName: string | null;
}

export const useOrganizationStatus = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['organization-status', user?.id],
    queryFn: async (): Promise<OrganizationStatus> => {
      if (!user) {
        return {
          hasOrganization: false,
          membershipStatus: null,
          organizationName: null
        };
      }

      // Get the user's profile to find their organization
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, organization')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        return {
          hasOrganization: false,
          membershipStatus: null,
          organizationName: null
        };
      }

      // Get the organization status where this user is the contact person
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .select('membership_status, name')
        .eq('contact_person_id', profile.id)
        .single();

      if (orgError || !organization) {
        return {
          hasOrganization: false,
          membershipStatus: null,
          organizationName: profile.organization
        };
      }

      return {
        hasOrganization: true,
        membershipStatus: organization.membership_status as 'pending' | 'active' | 'cancelled',
        organizationName: organization.name
      };
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};