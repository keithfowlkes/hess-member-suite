import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export interface Organization {
  id: string;
  name: string;
  contact_person_id?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  membership_status: 'active' | 'pending' | 'expired' | 'cancelled';
  membership_start_date?: string;
  membership_end_date?: string;
  annual_fee_amount: number;
  student_fte?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // System fields
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
  payment_platform?: string;
  meal_plan_management?: string;
  identity_management?: string;
  door_access?: string;
  document_management?: string;
  voip?: string;
  network_infrastructure?: string;
  // Hardware fields
  primary_office_apple?: boolean;
  primary_office_lenovo?: boolean;
  primary_office_dell?: boolean;
  primary_office_hp?: boolean;
  primary_office_microsoft?: boolean;
  primary_office_other?: boolean;
  primary_office_other_details?: string;
  other_software_comments?: string;
  profiles?: {
    id?: string;
    user_id?: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    organization?: string;
    primary_contact_title?: string;
    secondary_first_name?: string;
    secondary_last_name?: string;
    secondary_contact_title?: string;
    secondary_contact_email?: string;
    secondary_contact_phone?: string;
  };
}

export interface CreateOrganizationData {
  name: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  country: string;
  membership_status: 'active' | 'pending' | 'expired' | 'cancelled';
  membership_start_date?: string | null;
  membership_end_date?: string | null;
  annual_fee_amount: number;
  notes?: string | null;
}

export function useMembers(statusFilter: 'all' | 'active' | 'pending' | 'expired' | 'cancelled' = 'active') {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['organizations', statusFilter],
    queryFn: async () => {
      // Build query
      let dbQuery = supabase
        .from('organizations')
        .select(`
          *,
          profiles:contact_person_id (
            id, user_id, first_name, last_name, email, phone, organization,
            primary_contact_title,
            secondary_first_name, secondary_last_name, secondary_contact_title,
            secondary_contact_email, secondary_contact_phone
          )
        `)
        .eq('organization_type', 'member')
        .not('name', 'ilike', '%Administrator%');

      // Apply status filter if not 'all'
      if (statusFilter !== 'all') {
        dbQuery = dbQuery.eq('membership_status', statusFilter);
      }

      const { data, error } = await dbQuery.order('name');

      if (error) throw error;
      return data || [];
    },
    refetchOnWindowFocus: false,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['organizations'] });
  };

  const createOrganizationMutation = useMutation({
    mutationFn: async (orgData: CreateOrganizationData) => {
      const { data, error } = await supabase
        .from('organizations')
        .insert(orgData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast({
        title: 'Success',
        description: 'Organization created successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating organization',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const createOrganization = createOrganizationMutation.mutateAsync;

  const updateOrganizationMutation = useMutation({
    mutationFn: async ({ id, orgData }: { id: string; orgData: Partial<Organization> }) => {
      const { data, error } = await supabase
        .from('organizations')
        .update(orgData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, orgData }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['organizations'] });

      // Snapshot the previous value
      const previousOrgs = queryClient.getQueryData(['organizations', statusFilter]);

      // Optimistically update cache
      queryClient.setQueryData(['organizations', statusFilter], (old: Organization[] | undefined) => {
        if (!old) return old;
        return old.map(org => 
          org.id === id ? { ...org, ...orgData, updated_at: new Date().toISOString() } : org
        );
      });

      return { previousOrgs };
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Organization updated successfully'
      });
    },
    onError: (error: any, _variables, context) => {
      // Rollback on error
      if (context?.previousOrgs) {
        queryClient.setQueryData(['organizations', statusFilter], context.previousOrgs);
      }
      toast({
        title: 'Error updating organization',
        description: error.message,
        variant: 'destructive'
      });
    },
    onSettled: () => {
      // Refetch in background to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['organizations', statusFilter] });
    }
  });

  const updateOrganization = (id: string, orgData: Partial<Organization>) => 
    updateOrganizationMutation.mutateAsync({ id, orgData });

  const markAllOrganizationsActiveMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .update({ 
          membership_status: 'active',
          membership_start_date: new Date().toISOString().split('T')[0]
        })
        .neq('membership_status', 'active')
        .neq('name', 'Administrator')
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast({
        title: 'Success',
        description: `${data?.length || 0} organizations marked as active`
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating organizations',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const markAllOrganizationsActive = markAllOrganizationsActiveMutation.mutateAsync;

  const deleteOrganizationMutation = useMutation({
    mutationFn: async (id: string) => {
      // Get current user for admin tracking
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Must be authenticated to delete organizations');
      }

      // Call the edge function for comprehensive deletion
      const { data, error } = await supabase.functions.invoke('delete-organization', {
        body: {
          organizationId: id,
          adminUserId: user.id
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast({
        title: "Success",
        description: data.message || "Organization and all associated data deleted successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Error deleting organization:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete organization",
        variant: "destructive"
      });
    }
  });

  const deleteOrganization = deleteOrganizationMutation.mutateAsync;

  const unapproveOrganizationMutation = useMutation({
    mutationFn: async (id: string) => {
      // Get current user for admin tracking
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Must be authenticated to unapprove organizations');
      }

      // Call the edge function to unapprove and restore to pending queue
      const { data, error } = await supabase.functions.invoke('unapprove-organization', {
        body: {
          organizationId: id,
          adminUserId: user.id
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast({
        title: "Success",
        description: data.message || "Organization unapproved and restored to pending approval queue.",
      });
    },
    onError: (error: any) => {
      console.error('Error unapproving organization:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to unapprove organization",
        variant: "destructive"
      });
    }
  });

  const unapproveOrganization = unapproveOrganizationMutation.mutateAsync;

  // Debounced real-time subscription for organization changes
  useEffect(() => {
    let invalidateTimeout: NodeJS.Timeout;
    
    const channelName = `organizations_changes_${Math.random().toString(36).substr(2, 9)}`;
    const subscription = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'organizations' 
        }, 
        (payload) => {
          console.log('Organizations table changed (debounced)');
          
          // Debounce to avoid multiple rapid invalidations
          clearTimeout(invalidateTimeout);
          invalidateTimeout = setTimeout(() => {
            // Only invalidate queries that don't match current status filter to avoid disrupting active view
            queryClient.invalidateQueries({ 
              queryKey: ['organizations'],
              predicate: (query) => {
                const key = query.queryKey[1];
                return key !== statusFilter;
              }
            });
          }, 300);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(invalidateTimeout);
      subscription.unsubscribe();
    };
  }, [queryClient, statusFilter]);

  return { 
    organizations: query.data || [],
    loading: query.isLoading,
    refresh,
    createOrganization, 
    updateOrganization, 
    markAllOrganizationsActive,
    deleteOrganization,
    unapproveOrganization
  };
}