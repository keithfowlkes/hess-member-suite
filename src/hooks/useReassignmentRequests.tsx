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
        .order('created_at', { ascending: false });

      if (error) throw error;

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
                student_fte,
                membership_status,
                annual_fee_amount,
                notes,
                other_software_comments,
                primary_office_apple,
                primary_office_asus,
                primary_office_dell,
                primary_office_hp,
                primary_office_microsoft,
                primary_office_other,
                primary_office_other_details
              `)
              .eq('id', request.organization_id)
              .maybeSingle();

            let profileData = null;
            if (orgData?.contact_person_id) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('first_name, last_name, email')
                .eq('id', orgData.contact_person_id)
                .maybeSingle();
              profileData = profile;
            }

            return {
              ...request,
              organizations: orgData ? {
                ...orgData,
                profiles: profileData
              } : null
            };
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
    }) => {
      console.log('Creating member info update request with data:', data);
      console.log('Current user auth state:', await supabase.auth.getUser());
      
      const { data: result, error } = await supabase
        .from('organization_reassignment_requests')
        .insert({
          organization_id: data.organization_id,
          new_contact_email: data.new_contact_email,
          new_organization_data: data.new_organization_data,
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
        title: "Success",
        description: "Member information update request submitted successfully. Awaiting admin approval.",
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
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      // Get the request data
      const { data: request, error: fetchError } = await supabase
        .from('organization_reassignment_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Find or create profile for new contact
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', request.new_contact_email)
        .maybeSingle();

      if (profileError) throw profileError;

      let contactPersonId = existingProfile?.id;

      // If no existing profile, we'll need the new user to complete registration
      // For now, just update the organization data without changing contact person
      
      // Replace the organization with new data
      const { error: updateOrgError } = await supabase
        .from('organizations')
        .update({
          ...request.new_organization_data as any,
          contact_person_id: contactPersonId || null, // Will be updated when user registers
        })
        .eq('id', request.organization_id);

      if (updateOrgError) throw updateOrgError;

      // Delete the member info update request (simpler approach - no audit trail needed)
      const { error: deleteRequestError } = await supabase
        .from('organization_reassignment_requests')
        .delete()
        .eq('id', id);

      if (deleteRequestError) throw deleteRequestError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reassignment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast({
        title: "Success",
        description: "Member information update request approved successfully.",
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
      queryClient.invalidateQueries({ queryKey: ['reassignment-requests'] });
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
      queryClient.invalidateQueries({ queryKey: ['reassignment-requests'] });
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