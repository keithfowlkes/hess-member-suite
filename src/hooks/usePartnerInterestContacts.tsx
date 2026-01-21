import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface PartnerInterestContact {
  id: string;
  organization_id: string;
  cohort_leader_id: string;
  partner_program: string;
  contacted_at: string;
  notes: string | null;
}

export function usePartnerInterestContacts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<PartnerInterestContact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('partner_interest_contacts')
        .select('*')
        .eq('cohort_leader_id', user.id);

      if (error) throw error;
      setContacts(data || []);
    } catch (err) {
      console.error('Error fetching partner interest contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [user]);

  const markAsContacted = async (organizationId: string, partnerProgram: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('partner_interest_contacts')
        .insert({
          organization_id: organizationId,
          cohort_leader_id: user.id,
          partner_program: partnerProgram,
        });

      if (error) {
        // Handle duplicate - might already be marked
        if (error.code === '23505') {
          toast({
            title: 'Already marked',
            description: 'This organization was already marked as contacted.',
          });
          return true;
        }
        throw error;
      }

      toast({
        title: 'Marked as contacted',
        description: 'Organization has been marked as contacted.',
      });

      await fetchContacts();
      return true;
    } catch (err) {
      console.error('Error marking as contacted:', err);
      toast({
        title: 'Error',
        description: 'Failed to mark as contacted.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const unmarkAsContacted = async (organizationId: string, partnerProgram: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('partner_interest_contacts')
        .delete()
        .eq('organization_id', organizationId)
        .eq('cohort_leader_id', user.id)
        .eq('partner_program', partnerProgram);

      if (error) throw error;

      toast({
        title: 'Unmarked',
        description: 'Organization has been unmarked as contacted.',
      });

      await fetchContacts();
      return true;
    } catch (err) {
      console.error('Error unmarking as contacted:', err);
      toast({
        title: 'Error',
        description: 'Failed to unmark as contacted.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const isContacted = (organizationId: string, partnerProgram: string): boolean => {
    return contacts.some(
      c => c.organization_id === organizationId && c.partner_program === partnerProgram
    );
  };

  const getContactedAt = (organizationId: string, partnerProgram: string): string | null => {
    const contact = contacts.find(
      c => c.organization_id === organizationId && c.partner_program === partnerProgram
    );
    return contact?.contacted_at || null;
  };

  return {
    contacts,
    loading,
    markAsContacted,
    unmarkAsContacted,
    isContacted,
    getContactedAt,
    refetch: fetchContacts,
  };
}
