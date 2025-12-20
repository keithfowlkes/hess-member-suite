import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PartnerProgramInterest {
  organizationId: string;
  organizationName: string;
  contactName: string;
  contactEmail: string;
  contactTitle: string;
  city: string;
  state: string;
  studentFte: number | null;
  partnerProgramInterest: string[];
  website: string;
  phone: string;
  membershipStartDate: string | null;
}

// Map partner program interest values to cohort names
const partnerToCohortMap: Record<string, string[]> = {
  'Ellucian': ['Ellucian Banner', 'Ellucian Colleague'],
  'Jenzabar': ['Jenzabar ONE'],
  'Oracle': ['Oracle Cloud'],
  'Workday': ['Workday'],
  'Anthology': ['Anthology'],
};

// Reverse mapping: cohort to partner program interest
const cohortToPartnerMap: Record<string, string> = {
  'Ellucian Banner': 'Ellucian',
  'Ellucian Colleague': 'Ellucian',
  'Jenzabar ONE': 'Jenzabar',
  'Oracle Cloud': 'Oracle',
  'Workday': 'Workday',
  'Anthology': 'Anthology',
};

export function usePartnerProgramInterests() {
  const { user } = useAuth();
  const [interests, setInterests] = useState<PartnerProgramInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPartnerInterests = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

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
          setInterests([]);
          setLoading(false);
          return;
        }

        // Get the partner program interests this cohort leader should see
        const relevantPartnerPrograms = userCohorts
          .map(cohort => cohortToPartnerMap[cohort])
          .filter(Boolean);

        if (relevantPartnerPrograms.length === 0) {
          setInterests([]);
          setLoading(false);
          return;
        }

        // Fetch organizations with matching partner program interests
        const { data: organizationsData, error: orgsError } = await supabase
          .from('organizations')
          .select(`
            id,
            name,
            city,
            state,
            student_fte,
            partner_program_interest,
            website,
            phone,
            membership_start_date,
            contact_person_id
          `)
          .eq('membership_status', 'active')
          .not('partner_program_interest', 'is', null);

        if (orgsError) {
          throw new Error('Failed to fetch organizations');
        }

        // Filter organizations that have partner program interests matching the cohort leader's cohorts
        const matchingOrgs = organizationsData?.filter(org => {
          if (!org.partner_program_interest || !Array.isArray(org.partner_program_interest)) {
            return false;
          }
          // Check if any of the org's partner interests match the cohort leader's relevant programs
          return org.partner_program_interest.some(
            interest => relevantPartnerPrograms.includes(interest) && interest !== 'None'
          );
        }) || [];

        if (matchingOrgs.length === 0) {
          setInterests([]);
          setLoading(false);
          return;
        }

        // Get contact person details for matching organizations
        const contactIds = matchingOrgs
          .map(org => org.contact_person_id)
          .filter(Boolean);

        let contactsMap: Map<string, any> = new Map();
        if (contactIds.length > 0) {
          const { data: contactsData, error: contactsError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, primary_contact_title')
            .in('id', contactIds);

          if (!contactsError && contactsData) {
            contactsMap = new Map(contactsData.map(c => [c.id, c]));
          }
        }

        // Build the result
        const result: PartnerProgramInterest[] = matchingOrgs.map(org => {
          const contact = org.contact_person_id ? contactsMap.get(org.contact_person_id) : null;
          
          // Filter to only include relevant partner interests for this cohort leader
          const relevantInterests = (org.partner_program_interest || []).filter(
            (interest: string) => relevantPartnerPrograms.includes(interest) && interest !== 'None'
          );

          return {
            organizationId: org.id,
            organizationName: org.name,
            contactName: contact ? `${contact.first_name} ${contact.last_name}` : 'Unknown',
            contactEmail: contact?.email || '',
            contactTitle: contact?.primary_contact_title || '',
            city: org.city || '',
            state: org.state || '',
            studentFte: org.student_fte,
            partnerProgramInterest: relevantInterests,
            website: org.website || '',
            phone: org.phone || '',
            membershipStartDate: org.membership_start_date,
          };
        }).filter(item => item.partnerProgramInterest.length > 0);

        setInterests(result);
      } catch (err) {
        console.error('Error fetching partner program interests:', err);
        setError(err instanceof Error ? err.message : 'Failed to load partner program interests');
      } finally {
        setLoading(false);
      }
    };

    fetchPartnerInterests();
  }, [user]);

  return { interests, loading, error, count: interests.length };
}
