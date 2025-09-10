import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export interface OrganizationProfileEditRequest {
  id: string;
  organization_id: string;
  requested_by: string;
  original_organization_data: any;
  updated_organization_data: any;
  original_profile_data?: any;
  updated_profile_data?: any;
  status: string;
  admin_notes?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  organization?: any;
  requester_profile?: any;
}

export function useOrganizationProfileEditRequests() {
  const [requests, setRequests] = useState<OrganizationProfileEditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      // Debug: Check current user and role
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user?.email);
      
      if (!user) {
        console.log('No authenticated user found');
        setRequests([]);
        return;
      }

      // Check user role
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      console.log('User role:', userRole?.role);
      
      if (userRole?.role !== 'admin') {
        console.log('User is not admin, skipping profile edit requests fetch');
        setRequests([]);
        return;
      }

      const { data, error } = await supabase
        .from('organization_profile_edit_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Profile edit requests loaded:', data?.length || 0);
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching profile edit requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile edit requests',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();

    // Subscribe to changes
    const subscription = supabase
      .channel('organization_profile_edit_requests_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'organization_profile_edit_requests' 
        }, 
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    requests,
    loading,
    refetch: fetchRequests
  };
}

export function useCreateOrganizationProfileEditRequest() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createRequest = async (data: {
    organizationId: string;
    requestedBy: string;
    originalOrganizationData: any;
    updatedOrganizationData: any;
    originalProfileData?: any;
    updatedProfileData?: any;
  }) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('organization_profile_edit_requests')
        .insert({
          organization_id: data.organizationId,
          requested_by: data.requestedBy,
          original_organization_data: data.originalOrganizationData,
          updated_organization_data: data.updatedOrganizationData,
          original_profile_data: data.originalProfileData,
          updated_profile_data: data.updatedProfileData
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Profile edit request submitted for admin review'
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['organization-profile-edit-requests'] });
      
      return true;
    } catch (error: any) {
      console.error('Error creating profile edit request:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    createRequest,
    loading
  };
}

export function useApproveOrganizationProfileEditRequest() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const approveRequest = async (requestId: string, adminNotes?: string) => {
    setLoading(true);
    try {
      // First get the request data
      const { data: request, error: fetchError } = await supabase
        .from('organization_profile_edit_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      // Start a transaction by updating organization and profile data
      const promises = [];

      // Update organization data
      if (request.updated_organization_data) {
        promises.push(
          supabase
            .from('organizations')
            .update(request.updated_organization_data as any)
            .eq('id', request.organization_id)
        );
      }

      // Update profile data if provided
      if (request.updated_profile_data) {
        // Get the profile ID from the organization
        const { data: org } = await supabase
          .from('organizations')
          .select('contact_person_id')
          .eq('id', request.organization_id)
          .single();

        if (org?.contact_person_id) {
          promises.push(
            supabase
              .from('profiles')
              .update(request.updated_profile_data as any)
              .eq('id', org.contact_person_id)
          );
        }
      }

      // Execute all updates
      const results = await Promise.all(promises);
      
      // Check for errors
      for (const result of results) {
        if (result.error) throw result.error;
      }

      // Mark request as approved
      const { error: approvalError } = await supabase
        .from('organization_profile_edit_requests')
        .update({
          status: 'approved',
          admin_notes: adminNotes,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (approvalError) throw approvalError;

      // Send profile update approval email
      try {
        console.log('Sending profile update approval email...');
        
        // Get organization and profile data for the email
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*, profiles!organizations_contact_person_id_fkey(*)')
          .eq('id', request.organization_id)
          .single();

        if (orgError) {
          console.error('Error fetching organization data for email:', orgError);
        } else if (orgData) {
          const profile = orgData.profiles;
          const organizationData = {
            primary_contact_name: `${profile.first_name} ${profile.last_name}`,
            primary_contact_title: profile.primary_contact_title || orgData.primary_contact_title || '',
            secondary_first_name: profile.secondary_first_name || orgData.secondary_first_name || '',
            secondary_last_name: profile.secondary_last_name || orgData.secondary_last_name || '',
            secondary_contact_title: profile.secondary_contact_title || orgData.secondary_contact_title || '',
            secondary_contact_email: profile.secondary_contact_email || orgData.secondary_contact_email || '',
            student_fte: profile.student_fte || orgData.student_fte,
            address_line_1: orgData.address_line_1 || '',
            city: orgData.city || '',
            state: orgData.state || '',
            zip_code: orgData.zip_code || '',
            phone: orgData.phone || '',
            email: orgData.email || profile.email,
            website: orgData.website || '',
            student_information_system: orgData.student_information_system || '',
            financial_system: orgData.financial_system || '',
            financial_aid: orgData.financial_aid || '',
            hcm_hr: orgData.hcm_hr || '',
            payroll_system: orgData.payroll_system || '',
            purchasing_system: orgData.purchasing_system || '',
            housing_management: orgData.housing_management || '',
            learning_management: orgData.learning_management || '',
            admissions_crm: orgData.admissions_crm || '',
            alumni_advancement_crm: orgData.alumni_advancement_crm || '',
            primary_office_apple: orgData.primary_office_apple || false,
            primary_office_asus: orgData.primary_office_asus || false,
            primary_office_dell: orgData.primary_office_dell || false,
            primary_office_hp: orgData.primary_office_hp || false,
            primary_office_microsoft: orgData.primary_office_microsoft || false,
            primary_office_other: orgData.primary_office_other || false,
            primary_office_other_details: orgData.primary_office_other_details || '',
            other_software_comments: orgData.other_software_comments || '',
          };

          await supabase.functions.invoke('organization-emails', {
            body: {
              type: 'profile_update_approved',
              to: profile.email,
              organizationName: orgData.name,
              secondaryEmail: organizationData.secondary_contact_email,
              organizationData: organizationData
            }
          });
          console.log('Profile update approval email sent successfully');
        }
      } catch (emailError) {
        console.error('Error sending profile update approval email:', emailError);
        // Don't fail the approval process if email fails
      }

      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['organization-profile-edit-requests'] });

      toast({
        title: 'Success',
        description: 'Profile edit request approved and changes applied'
      });

      return true;
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    approveRequest,
    loading
  };
}

export function useRejectOrganizationProfileEditRequest() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const rejectRequest = async (requestId: string, adminNotes: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('organization_profile_edit_requests')
        .update({
          status: 'rejected',
          admin_notes: adminNotes
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Profile edit request rejected'
      });

      return true;
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    rejectRequest,
    loading
  };
}