import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface UserCohort {
  id: string;
  user_id: string;
  cohort: string;
  created_at: string;
}

const availableCohorts = ['Anthology', 'Ellucian Banner', 'Ellucian Colleague', 'Jenzabar ONE', 'Oracle Cloud', 'Workday'];

export function useUserCohorts(userId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cohorts, setCohorts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const targetUserId = userId || user?.id;

  const fetchUserCohorts = async () => {
    if (!targetUserId) return;

    try {
      const { data, error } = await supabase
        .from('user_cohorts')
        .select('cohort')
        .eq('user_id', targetUserId);

      if (error) {
        console.error('Error fetching user cohorts:', error);
        return;
      }

      setCohorts(data?.map(c => c.cohort) || []);
    } catch (error) {
      console.error('Error fetching user cohorts:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserCohorts = async (newCohorts: string[]) => {
    if (!targetUserId || updating) return false;

    setUpdating(true);
    const oldCohorts = [...cohorts];
    
    try {
      // First, remove all existing cohorts for this user
      const { error: deleteError } = await supabase
        .from('user_cohorts')
        .delete()
        .eq('user_id', targetUserId);

      if (deleteError) {
        console.error('Error removing existing cohorts:', deleteError);
        toast({
          title: 'Error',
          description: 'Failed to update cohorts',
          variant: 'destructive',
        });
        return false;
      }

      // Then, insert the new cohorts
      if (newCohorts.length > 0) {
        const cohortsToInsert = newCohorts.map(cohort => ({
          user_id: targetUserId,
          cohort: cohort
        }));

        const { error: insertError } = await supabase
          .from('user_cohorts')
          .insert(cohortsToInsert);

        if (insertError) {
          console.error('Error inserting new cohorts:', insertError);
          toast({
            title: 'Error',
            description: 'Failed to update cohorts',
            variant: 'destructive',
          });
          return false;
        }
      }

      setCohorts(newCohorts);
      
      toast({
        title: 'Success',
        description: 'Cohort memberships updated successfully',
      });

      // Sync Simplelists cohort list changes (non-blocking)
      syncSimplelistsCohortChanges(targetUserId, oldCohorts, newCohorts);

      return true;
    } catch (error) {
      console.error('Error updating user cohorts:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const syncSimplelistsCohortChanges = async (userId: string, oldCohorts: string[], newCohorts: string[]) => {
    try {
      const removed = oldCohorts.filter(c => !newCohorts.includes(c));
      const added = newCohorts.filter(c => !oldCohorts.includes(c));

      if (removed.length === 0 && added.length === 0) return;

      // Get user's profile info for Simplelists contact
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, organization')
        .eq('user_id', userId)
        .maybeSingle();

      if (!profile?.email) return;

      // Get active cohort membership mappings
      const { data: mappings } = await supabase
        .from('simplelists_cohort_mappings')
        .select('field_value, simplelists_list_name')
        .eq('system_field', 'cohort_membership')
        .eq('is_active', true);

      if (!mappings || mappings.length === 0) return;

      // Build lookup: cohort value → list names
      const valueToLists = new Map<string, string[]>();
      for (const m of mappings) {
        const key = m.field_value.toLowerCase();
        if (!valueToLists.has(key)) valueToLists.set(key, []);
        valueToLists.get(key)!.push(m.simplelists_list_name);
      }

      // Remove from old cohort lists
      for (const cohort of removed) {
        const lists = valueToLists.get(cohort.toLowerCase());
        if (!lists) continue;
        for (const listName of lists) {
          supabase.functions.invoke('simplelists-sync', {
            body: {
              action: 'remove_contact',
              email: profile.email,
              organization_name: profile.organization || '',
              list_name: listName,
            },
          }).catch(err => console.error('Simplelists cohort remove error:', err));
        }
      }

      // Add to new cohort lists
      for (const cohort of added) {
        const lists = valueToLists.get(cohort.toLowerCase());
        if (!lists) continue;
        for (const listName of lists) {
          supabase.functions.invoke('simplelists-sync', {
            body: {
              action: 'add_contacts',
              contacts: [{
                firstname: profile.first_name,
                surname: profile.last_name,
                email: profile.email,
                organization_name: profile.organization || '',
              }],
              list_name: listName,
            },
          }).catch(err => console.error('Simplelists cohort add error:', err));
        }
      }
    } catch (err) {
      console.error('Simplelists cohort sync error (non-blocking):', err);
    }
  };

  useEffect(() => {
    fetchUserCohorts();
  }, [targetUserId]);

  return {
    cohorts,
    availableCohorts,
    loading,
    updating,
    updateUserCohorts,
    refetch: fetchUserCohorts
  };
}