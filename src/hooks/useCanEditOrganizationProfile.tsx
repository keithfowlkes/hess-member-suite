import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Returns whether the signed-in user may submit updates to an institution's profile.
 * Primary contacts always can; invited colleagues only when their invitation granted it.
 */
export function useCanEditOrganizationProfile(organizationId?: string | null) {
  const { user } = useAuth();
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!user?.id || !organizationId) {
        setCanEdit(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('colleague_can_edit_org', {
          _user_id: user.id,
          _org_id: organizationId,
        });
        if (error) throw error;
        if (!cancelled) setCanEdit(data === true);
      } catch (error) {
        console.error('Error checking organization edit permission:', error);
        if (!cancelled) setCanEdit(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [user?.id, organizationId]);

  return { canEditOrganizationProfile: canEdit, loading };
}
