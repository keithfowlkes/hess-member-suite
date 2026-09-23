import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ContactVerification {
  id: string;
  organization_id: string;
  contact_name: string;
  contact_title: string | null;
  status: string;
  confidence: string | null;
  found_title: string | null;
  summary: string | null;
  linkedin_url: string | null;
  institutional_url: string | null;
  notes: string | null;
  verified_at: string;
}

export function useContactVerifications(enabled = true) {
  return useQuery({
    queryKey: ['contact-verifications'],
    enabled,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('contact_verifications')
        .select('*');
      if (error) throw error;
      const map: Record<string, ContactVerification> = {};
      (data || []).forEach((row: ContactVerification) => { map[row.organization_id] = row; });
      return map;
    },
  });
}

export function useInvalidateContactVerifications() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['contact-verifications'] });
}

/** A verification counts only if it matches the organization's current primary contact. */
export function isCurrentlyVerified(
  v: ContactVerification | undefined,
  firstName?: string | null,
  lastName?: string | null,
) {
  if (!v || v.status.toUpperCase() !== 'VERIFIED') return false;
  const current = `${firstName || ''} ${lastName || ''}`.trim().toLowerCase();
  return current.length > 0 && v.contact_name.trim().toLowerCase() === current;
}
