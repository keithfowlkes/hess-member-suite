import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
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

  // Fetch only pending registration updates
  const { data: registrationUpdates = [], isLoading, error, refetch } = useQuery({
    queryKey: ['member-registration-updates'],
    queryFn: async () => {
      console.log('🔍 REGISTRATION UPDATES DEBUG: Fetching pending member registration updates...');
      const { data, error } = await supabase
        .from('member_registration_updates')
        .select('*')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('❌ REGISTRATION UPDATES DEBUG: Error fetching registration updates:', error);
        throw error;
      }

      console.log('✅ REGISTRATION UPDATES DEBUG: Successfully fetched pending registration updates:', {
        count: data?.length || 0,
        updates: data?.map(u => ({ 
          id: u.id, 
          email: u.submitted_email, 
          organization: (u.organization_data as any)?.name || 'Unknown', 
          status: u.status 
        }))
      });

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
        console.error('Failed to create registration update:', error);
        throw error;
      }

      console.log('✅ Registration update created successfully:', data);

      // Send organization update alert email if this is an existing organization update
      if (updateData.existing_organization_id && updateData.submission_type === 'member_update') {
        console.log('🔔 Sending organization update alert for existing organization:', updateData.existing_organization_id);
        
        try {
          const alertResponse = await supabase.functions.invoke('send-organization-update-alert', {
            body: {
              organization_id: updateData.existing_organization_id,
              submitted_email: updateData.submitted_email,
              organization_name: updateData.existing_organization_name || updateData.organization_data.organization
            }
          });

          if (alertResponse.error) {
            console.error('⚠️ Failed to send organization update alert:', alertResponse.error);
            // Don't fail the entire operation if email fails
          } else {
            console.log('✅ Organization update alert sent successfully:', alertResponse.data);
          }
        } catch (alertError) {
          console.error('⚠️ Error sending organization update alert:', alertError);
          // Don't fail the entire operation if email fails
        }
      }

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

  // Set up real-time subscription to remove approved/rejected items immediately
  useEffect(() => {
    console.log('📡 REGISTRATION UPDATES DEBUG: Setting up real-time subscription');
    const subscription = supabase
      .channel('member_registration_updates_channel')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'member_registration_updates' },
        (payload) => {
          console.log('🔔 REGISTRATION UPDATES DEBUG: Real-time UPDATE event received:', {
            old: payload.old,
            new: payload.new,
            status: payload.new?.status
          });
          if (payload.new?.status !== 'pending') {
            // If status changed to approved/rejected, refetch to remove from pending list
            refetch();
          }
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'member_registration_updates' },
        (payload) => {
          console.log('🔔 REGISTRATION UPDATES DEBUG: Real-time DELETE event received:', payload.old);
          refetch();
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'member_registration_updates' },
        (payload) => {
          console.log('🔔 REGISTRATION UPDATES DEBUG: Real-time INSERT event received:', payload.new);
          refetch();
        }
      )
      .subscribe((status) => {
        console.log('📡 REGISTRATION UPDATES DEBUG: Subscription status changed:', status);
      });

    return () => {
      console.log('🛑 REGISTRATION UPDATES DEBUG: Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, [refetch]);

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