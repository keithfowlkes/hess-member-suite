import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useOrganizationByName = (organizationName: string | null) => {
  return useQuery({
    queryKey: ['organization-by-name', organizationName],
    queryFn: async () => {
      if (!organizationName) return null;

      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          profiles:contact_person_id (
            first_name,
            last_name,
            email,
            phone,
            organization,
            primary_contact_title,
            secondary_first_name,
            secondary_last_name,
            secondary_contact_title,
            secondary_contact_email,
            secondary_contact_phone
          )
        `)
        .eq('name', organizationName)
        .eq('membership_status', 'active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - organization not found
          return null;
        }
        throw error;
      }

      return data;
    },
    enabled: !!organizationName,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};