import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ConferenceRegistrationCode {
  id: string;
  organization_id: string;
  conference_slug: string;
  code: string;
  issued_at: string;
  redeemed_at: string | null;
  redeemed_attendee_email: string | null;
  redeemed_attendee_name: string | null;
}

/**
 * Fetches the conference registration code issued to a given organization
 * for a given conference (default: hess2026). Returns null when no code has
 * been issued yet (e.g. membership fee not yet paid, or feature disabled).
 */
export function useConferenceRegistrationCode(
  organizationId: string | undefined | null,
  conferenceSlug: string = 'hess2026',
) {
  return useQuery({
    queryKey: ['conference-registration-code', organizationId, conferenceSlug],
    enabled: !!organizationId && organizationId !== 'preview-org',
    queryFn: async (): Promise<ConferenceRegistrationCode | null> => {
      const { data, error } = await supabase
        .from('conference_registration_codes')
        .select('*')
        .eq('organization_id', organizationId as string)
        .eq('conference_slug', conferenceSlug)
        .maybeSingle();
      if (error) {
        console.warn('useConferenceRegistrationCode error', error);
        return null;
      }
      return (data as ConferenceRegistrationCode) ?? null;
    },
    staleTime: 60_000,
  });
}
