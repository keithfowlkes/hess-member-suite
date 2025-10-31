import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export interface MemberInfoUpdateRequest {
  id: string;
  organization_id: string;
  requested_by: string;
  new_contact_email: string;
  new_organization_data: any;
  original_organization_data: any;
  status: 'pending' | 'approved' | 'rejected' | 'reverted';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  approved_by?: string;
  approved_at?: string;
  organizations?: {
    name: string;
    contact_person_id?: string;
    profiles?: {
      first_name?: string;
      last_name?: string;
      email?: string;
    };
  };
}

export const useReassignmentRequests = () => {
  const { toast } = useToast();
  
  const query = useQuery({
    queryKey: ['reassignment-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_reassignment_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('🔍 Raw reassignment requests from DB:', data);

      // For each request, try to fetch organization data separately
      const enrichedRequests = await Promise.all(
        (data || []).map(async (request) => {
          try {
            const { data: orgData } = await supabase
              .from('organizations')
              .select(`
                name, 
                contact_person_id,
                address_line_1,
                address_line_2,
                city,
                state,
                zip_code,
                phone,
                email,
                website,
                primary_contact_title,
                secondary_first_name,
                secondary_last_name, 
                secondary_contact_title,
                secondary_contact_email,
                secondary_contact_phone,
                student_information_system,
                financial_system,
                financial_aid,
                hcm_hr,
                payroll_system,
                purchasing_system,
                housing_management,
                learning_management,
                admissions_crm,
                alumni_advancement_crm,
                payment_platform,
                meal_plan_management,
                identity_management,
                door_access,
                document_management,
                voip,
                network_infrastructure,
                student_fte,
                membership_status,
                annual_fee_amount,
                notes,
                other_software_comments,
                primary_office_apple,
                primary_office_lenovo,
                primary_office_dell,
                primary_office_hp,
                primary_office_microsoft,
                primary_office_other,
                primary_office_other_details
              `)
              .eq('id', request.organization_id)
              .maybeSingle();

            console.log(`🏢 Organization data for request ${request.id}:`, orgData);
            console.log(`📞 VoIP value:`, orgData?.voip);
            console.log(`🌐 Network Infrastructure value:`, orgData?.network_infrastructure);

            let profileData = null;
            if (orgData?.contact_person_id) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('first_name, last_name, email')
                .eq('id', orgData.contact_person_id)
                .maybeSingle();
              profileData = profile;
            }

            const enrichedRequest = {
              ...request,
              organizations: orgData ? {
                ...orgData,
                profiles: profileData
              } : null
            };

            console.log(`📦 Enriched request ${request.id}:`, enrichedRequest);
            
            return enrichedRequest;
          } catch (error) {
            console.error('Error fetching org data for request:', request.id, error);
            // Return request without org data if fetch fails
            return {
              ...request,
              organizations: null
            };
          }
        })
      );

      console.log('✅ Final enriched requests:', enrichedRequests);
      return enrichedRequests as MemberInfoUpdateRequest[];
    },
  });

  // Subscribe to realtime updates for new member information update requests
  useEffect(() => {
    const channel = supabase
      .channel('reassignment-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'organization_reassignment_requests'
        },
        (payload) => {
          console.log('New member info update request:', payload);
          // Refetch to get the complete data
          query.refetch();
          
          // Show notification
          toast({
            title: "New Member Information Update Request",
            description: `A new member information update request has been submitted and is awaiting approval.`,
            duration: 5000,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'organization_reassignment_requests'
        },
        (payload) => {
          console.log('Member info update request updated:', payload);
          // Refetch to ensure we have the latest data
          query.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [query.refetch, toast]);

  return query;
};

export const useCreateReassignmentRequest = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      organization_id: string;
      new_contact_email: string;
      new_organization_data: any;
      user_registration_data: any;
    }) => {
      console.log('Creating member info update request with data:', data);
      console.log('Current user auth state:', await supabase.auth.getUser());
      
      const { data: result, error } = await supabase
        .from('organization_reassignment_requests')
        .insert({
          organization_id: data.organization_id,
          new_contact_email: data.new_contact_email,
          new_organization_data: data.new_organization_data,
          user_registration_data: data.user_registration_data,
          status: 'pending',
          original_organization_data: null, // Not needed with simpler approach
          requested_by: null, // Not needed - will be handled on approval
        })
        .select()
        .maybeSingle(); // Changed from .single() to .maybeSingle()

      console.log('Insert result:', result);
      console.log('Insert error:', error);
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reassignment-requests'] });
      toast({
        title: "Member information update request submitted successfully",
        description: "Your organization update request has been submitted for admin approval. You'll receive an email when it's processed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit member information update request",
        variant: "destructive"
      });
    }
  });
};

export const useApproveReassignmentRequest = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes, adminUserId }: { id: string; notes?: string; adminUserId?: string }) => {
      const { data, error } = await supabase.functions.invoke('approve-reassignment-request', {
        body: {
          requestId: id,
          adminUserId
        }
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate all queries that could affect badge counts and listings
      queryClient.invalidateQueries({ queryKey: ['reassignment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['pending-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['organization-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['organization-profile-edit-requests'] });
      
      toast({
        title: "Success",
        description: "Member information update request approved and user account created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve member information update request",
        variant: "destructive"
      });
    }
  });
};

// Removed revert functionality - simpler approach doesn't need it

export const useRejectReassignmentRequest = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      // Simply delete the request - no need to track rejection
      const { error } = await supabase
        .from('organization_reassignment_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all queries that could affect badge counts and listings
      queryClient.invalidateQueries({ queryKey: ['reassignment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['pending-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['organization-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['organization-profile-edit-requests'] });
      
      toast({
        title: "Success",
        description: "Member information update request rejected and removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject member information update request",
        variant: "destructive"
      });
    }
  });
};

export const useDeleteReassignmentRequest = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('organization_reassignment_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all queries that could affect badge counts and listings
      queryClient.invalidateQueries({ queryKey: ['reassignment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['pending-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['organization-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['organization-profile-edit-requests'] });
      
      toast({
        title: "Success",
        description: "Member information update request deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete member information update request",
        variant: "destructive"
      });
    }
  });
};