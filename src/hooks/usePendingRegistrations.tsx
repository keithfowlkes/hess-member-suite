import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PendingRegistration {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  organization_name: string;
  state_association: string | null;
  student_fte: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  primary_contact_title: string | null;
  secondary_first_name: string | null;
  secondary_last_name: string | null;
  secondary_contact_title: string | null;
  secondary_contact_email: string | null;
  student_information_system: string | null;
  financial_system: string | null;
  financial_aid: string | null;
  hcm_hr: string | null;
  payroll_system: string | null;
  purchasing_system: string | null;
  housing_management: string | null;
  learning_management: string | null;
  admissions_crm: string | null;
  alumni_advancement_crm: string | null;
  primary_office_apple: boolean;
  primary_office_asus: boolean;
  primary_office_dell: boolean;
  primary_office_hp: boolean;
  primary_office_microsoft: boolean;
  primary_office_other: boolean;
  primary_office_other_details: string | null;
  other_software_comments: string | null;
  is_private_nonprofit: boolean;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  rejection_reason?: string | null;
}

export function usePendingRegistrations() {
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPendingRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from('pending_registrations')
        .select('*')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending registrations:', error);
        toast({
          title: "Error",
          description: "Failed to fetch pending registrations",
          variant: "destructive"
        });
        return;
      }

      setPendingRegistrations((data || []) as PendingRegistration[]);
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveRegistration = async (registrationId: string, adminUserId?: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('approve-pending-registration', {
        body: {
          registrationId,
          adminUserId
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Registration Approved",
        description: "The registration has been approved and user account created successfully.",
      });

      // Refresh the list
      await fetchPendingRegistrations();
      return true;
    } catch (error: any) {
      console.error('Error approving registration:', error);
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve registration",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const rejectRegistration = async (
    registrationId: string, 
    reason: string,
    adminUserId?: string
  ): Promise<boolean> => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('pending_registrations')
        .update({
          approval_status: 'rejected',
          rejection_reason: reason,
          approved_by: adminUserId,
          approved_at: new Date().toISOString()
        })
        .eq('id', registrationId);

      if (error) {
        throw error;
      }

      toast({
        title: "Registration Rejected",
        description: "The registration has been rejected.",
      });

      // Refresh the list
      await fetchPendingRegistrations();
      return true;
    } catch (error: any) {
      console.error('Error rejecting registration:', error);
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject registration",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRegistrations();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('pending_registrations_channel')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'pending_registrations' }, 
        () => {
          fetchPendingRegistrations();
          toast({
            title: "New Registration",
            description: "A new registration is pending approval.",
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  return {
    pendingRegistrations,
    loading,
    approveRegistration,
    rejectRegistration,
    refetch: fetchPendingRegistrations
  };
}