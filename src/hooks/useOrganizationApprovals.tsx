import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PendingOrganization {
  id: string;
  name: string;
  email: string;
  phone: string;
  address_line_1: string;
  city: string;
  state: string;
  zip_code: string;
  student_fte: number;
  membership_status: string;
  created_at: string;
  contact_person_id: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
    primary_contact_title: string;
    is_private_nonprofit: boolean;
  };
}

export const useOrganizationApprovals = () => {
  const [pendingOrganizations, setPendingOrganizations] = useState<PendingOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPendingOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          profiles!contact_person_id(
            first_name,
            last_name,
            email,
            primary_contact_title,
            is_private_nonprofit
          )
        `)
        .eq('membership_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPendingOrganizations(data || []);
    } catch (error: any) {
      console.error('Error fetching pending organizations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch pending organizations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const approveOrganization = async (organizationId: string, adminMessage?: string) => {
    try {
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select(`
          *,
          profiles!contact_person_id(email, first_name, last_name)
        `)
        .eq('id', organizationId)
        .single();

      if (orgError) throw orgError;

      // Update organization status
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ 
          membership_status: 'active',
          membership_start_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', organizationId);

      if (updateError) throw updateError;

      // Send approval email
      if (org.profiles?.email) {
        await supabase.functions.invoke('organization-emails', {
          body: {
            type: 'approval',
            to: org.profiles.email,
            organizationName: org.name,
            adminMessage
          }
        });
      }

      // Log the action
      await supabase.from('audit_log').insert({
        action: 'organization_approved',
        entity_type: 'organization',
        entity_id: organizationId,
        details: { organizationName: org.name, adminMessage }
      });

      toast({
        title: "Organization Approved",
        description: `${org.name} has been approved and notified.`,
      });

      await fetchPendingOrganizations();
    } catch (error: any) {
      console.error('Error approving organization:', error);
      toast({
        title: "Error",
        description: "Failed to approve organization",
        variant: "destructive"
      });
    }
  };

  const rejectOrganization = async (organizationId: string, adminMessage: string) => {
    try {
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select(`
          *,
          profiles!contact_person_id(email, first_name, last_name)
        `)
        .eq('id', organizationId)
        .single();

      if (orgError) throw orgError;

      // Update organization status to cancelled instead of rejected
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ membership_status: 'cancelled' })
        .eq('id', organizationId);

      if (updateError) throw updateError;

      // Send rejection email
      if (org.profiles?.email) {
        await supabase.functions.invoke('organization-emails', {
          body: {
            type: 'rejection',
            to: org.profiles.email,
            organizationName: org.name,
            adminMessage
          }
        });
      }

      // Log the action
      await supabase.from('audit_log').insert({
        action: 'organization_rejected',
        entity_type: 'organization',
        entity_id: organizationId,
        details: { organizationName: org.name, adminMessage }
      });

      toast({
        title: "Organization Rejected",
        description: `${org.name} has been rejected and notified.`,
      });

      await fetchPendingOrganizations();
    } catch (error: any) {
      console.error('Error rejecting organization:', error);
      toast({
        title: "Error",
        description: "Failed to reject organization",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchPendingOrganizations();
  }, []);

  return {
    pendingOrganizations,
    loading,
    approveOrganization,
    rejectOrganization,
    refetch: fetchPendingOrganizations
  };
};