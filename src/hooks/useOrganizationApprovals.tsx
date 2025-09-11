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
        .neq('name', 'Administrator')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Targeted cleanup: remove duplicate pending entry for J.K. Fowlkes University
      let pending = (data || []) as PendingOrganization[];
      try {
        const normalize = (s?: string | null) => (s ?? '')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .trim();
        const targetName = 'J.K. Fowlkes University';
        const targetNormalized = normalize(targetName);

        const jkPendings = pending.filter(o => normalize(o.name) === targetNormalized && o.membership_status === 'pending');
        if (jkPendings.length > 0) {
          console.log('🧹 ORG APPROVALS: Deleting duplicate pending organizations for J.K. Fowlkes University', { ids: jkPendings.map(o => o.id) });
          const { error: delErr } = await supabase
            .from('organizations')
            .delete()
            .in('id', jkPendings.map(o => o.id));
          if (delErr) {
            console.warn('⚠️ ORG APPROVALS: Failed to delete duplicate pending orgs:', delErr);
          } else {
            // Remove them from local list immediately
            pending = pending.filter(o => !jkPendings.some(jk => jk.id === o.id));
            console.log('✅ ORG APPROVALS: Duplicate pending orgs deleted successfully');
          }
        }
      } catch (cleanupErr) {
        console.warn('⚠️ ORG APPROVALS: Error during targeted duplicate cleanup:', cleanupErr);
      }

      // Hide any temporary reassignment placeholder orgs from UI
      const cleaned = (pending || []).filter(o => !/__reassign_/.test(o.name));
      setPendingOrganizations(cleaned);
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
        .maybeSingle();

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

      // Send welcome email to primary contact with full organization details
      if (org.profiles?.email) {
        console.log('Preparing welcome email for organization approval...');
        const primaryContactName = `${org.profiles.first_name} ${org.profiles.last_name}`;
        
        const organizationData = {
          primary_contact_name: primaryContactName,
          primary_contact_title: org.primary_contact_title,
          secondary_first_name: org.secondary_first_name,
          secondary_last_name: org.secondary_last_name,
          secondary_contact_title: org.secondary_contact_title,
          secondary_contact_email: org.secondary_contact_email,
          student_fte: org.student_fte,
          address_line_1: org.address_line_1,
          city: org.city,
          state: org.state,
          zip_code: org.zip_code,
          phone: org.phone,
          email: org.email,
          website: org.website,
          student_information_system: org.student_information_system,
          financial_system: org.financial_system,
          financial_aid: org.financial_aid,
          hcm_hr: org.hcm_hr,
          payroll_system: org.payroll_system,
          purchasing_system: org.purchasing_system,
          housing_management: org.housing_management,
          learning_management: org.learning_management,
          admissions_crm: org.admissions_crm,
          alumni_advancement_crm: org.alumni_advancement_crm,
          primary_office_apple: org.primary_office_apple,
          primary_office_asus: org.primary_office_asus,
          primary_office_dell: org.primary_office_dell,
          primary_office_hp: org.primary_office_hp,
          primary_office_microsoft: org.primary_office_microsoft,
          primary_office_other: org.primary_office_other,
          primary_office_other_details: org.primary_office_other_details,
          other_software_comments: org.other_software_comments,
        };

        console.log('Sending welcome email with data:', {
          type: 'welcome_approved',
          to: org.profiles.email,
          organizationName: org.name,
          secondaryEmail: org.secondary_contact_email,
          organizationDataKeys: Object.keys(organizationData)
        });

        const { error: emailError } = await supabase.functions.invoke('organization-emails', {
          body: {
            type: 'welcome_approved',
            to: org.profiles.email,
            organizationName: org.name,
            secondaryEmail: org.secondary_contact_email,
            organizationData: organizationData,
            adminMessage
          }
        });

        if (emailError) {
          console.error('Email sending failed:', emailError);
          throw new Error(`Failed to send welcome email: ${emailError.message}`);
        }

        console.log('Welcome email sent successfully');
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
          profiles!contact_person_id(user_id, email, first_name, last_name)
        `)
        .eq('id', organizationId)
        .maybeSingle();

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

      // Delete the associated user account
      if (org.profiles?.user_id) {
        const { error: userDeleteError } = await supabase.functions.invoke('delete-user', {
          body: { userId: org.profiles.user_id }
        });
        
        if (userDeleteError) {
          console.error('Error deleting user account:', userDeleteError);
          // Don't throw here as the organization rejection should still proceed
        }
      }

      // Log the action
      await supabase.from('audit_log').insert({
        action: 'organization_rejected',
        entity_type: 'organization',
        entity_id: organizationId,
        details: { organizationName: org.name, adminMessage, userDeleted: !!org.profiles?.user_id }
      });

      toast({
        title: "Organization Rejected",
        description: `${org.name} has been rejected and the associated user account has been deleted.`,
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