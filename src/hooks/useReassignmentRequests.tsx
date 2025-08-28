import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ReassignmentRequest {
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
  return useQuery({
    queryKey: ['reassignment-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_reassignment_requests')
        .select(`
          *,
          organizations!organization_id (
            name,
            contact_person_id,
            profiles!contact_person_id (
              first_name,
              last_name,
              email
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ReassignmentRequest[];
    },
  });
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
      const { data: result, error } = await supabase
        .from('organization_reassignment_requests')
        .insert({
          organization_id: data.organization_id,
          new_contact_email: data.new_contact_email,
          new_organization_data: data.new_organization_data,
          original_organization_data: {}, // Not needed with simpler approach
          requested_by: null, // Not needed - will be handled on approval
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reassignment-requests'] });
      toast({
        title: "Success",
        description: "Reassignment request submitted successfully. Awaiting admin approval.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit reassignment request",
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

      // Delete the reassignment request (simpler approach - no audit trail needed)
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
        description: "Reassignment request approved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve reassignment request",
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
        description: "Reassignment request rejected and removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject reassignment request",
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
        description: "Reassignment request deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete reassignment request",
        variant: "destructive"
      });
    }
  });
};