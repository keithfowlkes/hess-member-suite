import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PendingOrganization {
  id: string;
  name: string;
  email: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  zip_code: string;
  country?: string;
  website?: string;
  student_fte: number;
  annual_fee_amount?: number;
  membership_status: string;
  created_at: string;
  contact_person_id: string;
  notes?: string;
  secondary_first_name?: string;
  secondary_last_name?: string;
  secondary_contact_title?: string;
  secondary_contact_email?: string;
  student_information_system?: string;
  financial_system?: string;
  financial_aid?: string;
  hcm_hr?: string;
  payroll_system?: string;
  purchasing_system?: string;
  housing_management?: string;
  learning_management?: string;
  admissions_crm?: string;
  alumni_advancement_crm?: string;
  primary_office_apple?: boolean;
  primary_office_asus?: boolean;
  primary_office_dell?: boolean;
  primary_office_hp?: boolean;
  primary_office_microsoft?: boolean;
  primary_office_other?: boolean;
  primary_office_other_details?: string;
  other_software_comments?: string;
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

      // Find and approve all members of this organization
      const { data: memberProfiles, error: memberError } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name')
        .eq('organization', org.name);

      if (memberError) {
        console.error('Error fetching organization members:', memberError);
      } else if (memberProfiles && memberProfiles.length > 0) {
        // Send approval emails to all members
        for (const member of memberProfiles) {
          try {
            await supabase.functions.invoke('organization-emails', {
              body: {
                type: 'member_approval',
                to: member.email,
                organizationName: org.name,
                memberName: `${member.first_name} ${member.last_name}`,
                adminMessage
              }
            });
          } catch (emailError) {
            console.error(`Error sending approval email to ${member.email}:`, emailError);
          }
        }
      }

      // Send approval email to primary contact
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
        details: { 
          organizationName: org.name, 
          adminMessage,
          membersCount: memberProfiles?.length || 0
        }
      });

      toast({
        title: "Organization Approved",
        description: `${org.name} has been approved with ${memberProfiles?.length || 0} members notified.`,
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
    
    // Subscribe to realtime updates for new pending organizations
    const channel = supabase
      .channel('organization-approvals')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'organizations',
          filter: 'membership_status=eq.pending'
        },
        (payload) => {
          console.log('New pending organization:', payload);
          // Refetch to get the complete data with profiles
          fetchPendingOrganizations();
          
          // Show notification
          toast({
            title: "New Registration",
            description: `A new organization registration has been submitted and is awaiting approval.`,
            duration: 5000,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'organizations'
        },
        (payload) => {
          console.log('Organization updated:', payload);
          // Refetch to ensure we have the latest data
          fetchPendingOrganizations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    pendingOrganizations,
    loading,
    approveOrganization,
    rejectOrganization,
    refetch: fetchPendingOrganizations
  };
};