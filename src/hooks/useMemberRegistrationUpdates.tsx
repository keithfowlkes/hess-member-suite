import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MemberRegistrationUpdate {
  id: string;
  submitted_email: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  submitted_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  registration_data: Record<string, any>;
  organization_data: Record<string, any>;
  existing_organization_id?: string;
  existing_organization_name?: string;
  submission_type: 'new_member' | 'member_update' | 'primary_contact_change';
  created_at: string;
  updated_at: string;
}

export function useMemberRegistrationUpdates() {
  const queryClient = useQueryClient();

  // Fetch all pending registration updates
  const { data: registrationUpdates = [], isLoading, error, refetch } = useQuery({
    queryKey: ['member-registration-updates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('member_registration_updates')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error fetching registration updates:', error);
        throw error;
      }

      return data as MemberRegistrationUpdate[];
    }
  });

  // Create new registration update
  const createRegistrationUpdate = useMutation({
    mutationFn: async (updateData: {
      submitted_email: string;
      registration_data: Record<string, any>;
      organization_data: Record<string, any>;
      existing_organization_id?: string;
      existing_organization_name?: string;
      submission_type?: 'new_member' | 'member_update' | 'primary_contact_change';
    }) => {
      console.log('🚀 DEBUG: createRegistrationUpdate called with:', updateData);
      
      const { data, error } = await supabase
        .from('member_registration_updates')
        .insert({
          submitted_email: updateData.submitted_email,
          registration_data: updateData.registration_data,
          organization_data: updateData.organization_data,
          existing_organization_id: updateData.existing_organization_id,
          existing_organization_name: updateData.existing_organization_name,
          submission_type: updateData.submission_type || 'member_update',
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ DEBUG: Error creating registration update:', error);
        throw error;
      }

      console.log('✅ DEBUG: Registration update created successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-registration-updates'] });
      toast.success('Registration update submitted successfully');
      console.log('✅ DEBUG: onSuccess callback called');
    },
    onError: (error: any) => {
      console.error('❌ DEBUG: Failed to create registration update:', error);
      toast.error(`Failed to submit registration update: ${error.message}`);
    }
  });

  // Process registration update (approve/reject)
  const processRegistrationUpdate = useMutation({
    mutationFn: async (params: {
      registrationUpdateId: string;
      action: 'approve' | 'reject';
      adminUserId: string;
      adminNotes?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('process-member-registration-update', {
        body: {
          registrationUpdateId: params.registrationUpdateId,
          adminUserId: params.adminUserId,
          action: params.action,
          adminNotes: params.adminNotes
        }
      });

      if (error) {
        console.error('Error processing registration update:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['member-registration-updates'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      
      if (variables.action === 'approve') {
        toast.success('Registration update approved successfully');
      } else {
        toast.success('Registration update rejected');
      }
    },
    onError: (error: any) => {
      console.error('Failed to process registration update:', error);
      toast.error(`Failed to process registration update: ${error.message}`);
    }
  });

  return {
    registrationUpdates,
    isLoading,
    error,
    refetch,
    createRegistrationUpdate: createRegistrationUpdate.mutateAsync,
    processRegistrationUpdate: processRegistrationUpdate.mutate,
    isCreating: createRegistrationUpdate.isPending,
    isProcessing: processRegistrationUpdate.isPending
  };
}