import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CustomSoftwareEntry {
  id: string;
  organization_id: string;
  field_name: string;
  custom_value: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_by: string | null;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

// Get all custom entries (admin view)
export const useCustomSoftwareEntries = () => {
  return useQuery({
    queryKey: ['custom-software-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_software_entries')
        .select(`
          *,
          organizations!inner(name)
        `)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      
      // Fetch submitter profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(entry => entry.submitted_by).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name, email')
            .in('user_id', userIds);

          // Map profiles to entries
          return data.map(entry => ({
            ...entry,
            organization: entry.organizations,
            submitter: profiles?.find(p => p.user_id === entry.submitted_by) || null
          }));
        }
      }
      
      return data?.map(entry => ({
        ...entry,
        organization: entry.organizations,
        submitter: null
      })) || [];
    },
  });
};

// Get custom entries for an organization
export const useOrganizationCustomEntries = (organizationId: string) => {
  return useQuery({
    queryKey: ['organization-custom-entries', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_software_entries')
        .select('*')
        .eq('organization_id', organizationId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data as CustomSoftwareEntry[];
    },
    enabled: !!organizationId,
  });
};

// Submit custom software entry
export const useSubmitCustomEntry = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      organizationId, 
      fieldName, 
      customValue 
    }: { 
      organizationId: string; 
      fieldName: string; 
      customValue: string; 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('custom_software_entries')
        .insert({
          organization_id: organizationId,
          field_name: fieldName,
          custom_value: customValue.trim(),
          submitted_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-software-entries'] });
      queryClient.invalidateQueries({ queryKey: ['organization-custom-entries'] });
      toast({
        title: "Custom Entry Submitted",
        description: "Your custom software entry has been submitted for admin review.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit custom entry",
        variant: "destructive"
      });
    }
  });
};

// Review custom entry (admin only)
export const useReviewCustomEntry = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      adminNotes 
    }: { 
      id: string; 
      status: 'approved' | 'rejected'; 
      adminNotes?: string; 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('custom_software_entries')
        .update({
          status,
          admin_notes: adminNotes,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['custom-software-entries'] });
      queryClient.invalidateQueries({ queryKey: ['organization-custom-entries'] });
      toast({
        title: "Entry Reviewed",
        description: `Custom entry has been ${data.status}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to review entry",
        variant: "destructive"
      });
    }
  });
};

// Approve and add to system options
export const useApproveAndAddToSystem = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      entryId, 
      fieldName, 
      optionValue,
      adminNotes 
    }: { 
      entryId: string; 
      fieldName: string; 
      optionValue: string;
      adminNotes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if option already exists in system
      const { data: existingOptions } = await supabase
        .from('system_field_options')
        .select('option_value')
        .eq('field_name', fieldName);
      
      const isDuplicate = existingOptions?.some(opt => 
        opt.option_value.toLowerCase() === optionValue.toLowerCase()
      );
      
      if (!isDuplicate) {
        // Add to system options
        await supabase
          .from('system_field_options')
          .insert({
            field_name: fieldName,
            option_value: optionValue.trim()
          });
      }

      // Approve the custom entry
      const { data, error } = await supabase
        .from('custom_software_entries')
        .update({
          status: 'approved',
          admin_notes: adminNotes,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', entryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-software-entries'] });
      queryClient.invalidateQueries({ queryKey: ['simple-system-field-options'] });
      queryClient.invalidateQueries({ queryKey: ['organization-custom-entries'] });
      toast({
        title: "Entry Approved & Added",
        description: "Custom entry has been approved and added to system options.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve and add entry",
        variant: "destructive"
      });
    }
  });
};