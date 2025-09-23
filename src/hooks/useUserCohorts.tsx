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