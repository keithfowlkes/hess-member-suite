import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FollowUpCommunication {
  id: string;
  organization_id: string;
  communication_type: 'email' | 'phone' | 'in_person' | 'other';
  subject?: string;
  notes: string;
  contact_person_name?: string;
  contact_person_email?: string;
  contact_person_phone?: string;
  communication_date: string;
  follow_up_date?: string;
  created_at: string;
  organizations: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
}

export function useFollowUpCommunications() {
  const { data: followUps = [], isLoading, error } = useQuery({
    queryKey: ['follow-up-communications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communications')
        .select(`
          *,
          organizations!inner (
            id,
            name,
            email,
            phone
          )
        `)
        .eq('follow_up_required', true)
        .lte('follow_up_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Show follow-ups within next 30 days
        .order('follow_up_date', { ascending: true });

      if (error) throw error;
      return data as FollowUpCommunication[];
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Separate overdue and upcoming follow-ups
  const today = new Date().toISOString().split('T')[0];
  const overdue = followUps.filter(comm => 
    comm.follow_up_date && comm.follow_up_date < today
  );
  const today_followups = followUps.filter(comm => 
    comm.follow_up_date === today
  );
  const upcoming = followUps.filter(comm => 
    comm.follow_up_date && comm.follow_up_date > today
  );

  return {
    followUps,
    overdue,
    today: today_followups,
    upcoming,
    totalCount: followUps.length,
    overdueCount: overdue.length,
    todayCount: today_followups.length,
    upcomingCount: upcoming.length,
    isLoading,
    error,
  };
}