import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useMemo } from 'react';

export interface SystemFieldOption {
  id: string;
  field_name: string;
  option_value: string;
  created_at: string;
  updated_at: string;
}

export const SYSTEM_FIELDS = [
  'student_information_system',
  'financial_system',
  'financial_aid',
  'hcm_hr',
  'payroll_system',
  'purchasing_system',
  'housing_management',
  'learning_management',
  'admissions_crm',
  'alumni_advancement_crm',
  'voip',
  'network_infrastructure'
] as const;

export type SystemField = typeof SYSTEM_FIELDS[number];

// Get existing unique values from profiles table with better deduplication
export const useSystemFieldValues = () => {
  return useQuery({
    queryKey: ['system-field-values-from-profiles'],
    queryFn: async () => {
      console.log('Fetching system field values from profiles...');
      const fieldValues: Record<SystemField, string[]> = {} as any;
      
      // Get all profiles data once instead of making multiple queries
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) {
        console.error('Error fetching profiles:', error);
        throw error;
      }

      console.log('Profiles fetched:', profiles?.length);
      
      for (const field of SYSTEM_FIELDS) {
        // Extract unique non-empty values with better filtering
        const rawValues = profiles
          ?.map(profile => profile[field])
          .filter(value => value && typeof value === 'string' && value.trim().length > 0)
          .map(value => value.trim()) || [];
        
        // Remove duplicates using case-insensitive comparison and preserve original casing
        const uniqueValues = Array.from(
          new Map(rawValues.map(val => [val.toLowerCase(), val])).values()
        ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        
        fieldValues[field] = uniqueValues;
        console.log(`Field ${field} has ${uniqueValues.length} unique values:`, uniqueValues);
      }
      
      return fieldValues;
    },
  });
};

// Get managed system field options (from database table) with real-time updates
export const useSystemFieldOptions = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['system-field-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_field_options')
        .select('*')
        .order('field_name, option_value');

      if (error) throw error;
      return data as SystemFieldOption[];
    },
  });

  // Set up real-time subscription for system field options
  useEffect(() => {
    const channel = supabase
      .channel('system-field-options-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'system_field_options' },
        (payload) => {
          console.log('🔄 System field options changed, refetching...', payload);
          // Invalidate all related queries to ensure UI updates
          queryClient.invalidateQueries({ queryKey: ['system-field-options'] });
          queryClient.invalidateQueries({ queryKey: ['system-field-values'] });
          // Force refetch to ensure immediate update
          queryClient.refetchQueries({ queryKey: ['system-field-options'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

// Get options for a specific field - simplified to only use managed options
export const useFieldOptions = (fieldName: SystemField) => {
  const { data: allOptions } = useSystemFieldOptions();
  
  // Return only the managed options from the database
  return useMemo(() => {
    const managedOptions = allOptions?.filter(opt => opt.field_name === fieldName) || [];
    
    // Return sorted option values
    return managedOptions
      .map(opt => opt.option_value)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [fieldName, allOptions]);
};

// Add new system field option
export const useAddSystemFieldOption = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fieldName, optionValue }: { fieldName: SystemField; optionValue: string }) => {
      // Trim and validate the input
      const cleanValue = optionValue.trim();
      if (!cleanValue) {
        throw new Error('Option value cannot be empty');
      }
      
      // Check for duplicates (case-insensitive)
      const { data: existingOptions } = await supabase
        .from('system_field_options')
        .select('option_value')
        .eq('field_name', fieldName);
      
      const isDuplicate = existingOptions?.some(opt => 
        opt.option_value.toLowerCase() === cleanValue.toLowerCase()
      );
      
      if (isDuplicate) {
        throw new Error('This option already exists (case-insensitive match)');
      }

      const { data, error } = await supabase
        .from('system_field_options')
        .insert({
          field_name: fieldName,
          option_value: cleanValue
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-field-options'] });
      toast({
        title: "Success",
        description: "System field option added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add system field option",
        variant: "destructive"
      });
    }
  });
};

// Update system field option
export const useUpdateSystemFieldOption = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, optionValue }: { id: string; optionValue: string }) => {
      const { data, error } = await supabase
        .from('system_field_options')
        .update({ option_value: optionValue.trim() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-field-options'] });
      toast({
        title: "Success",
        description: "System field option updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update system field option",
        variant: "destructive"
      });
    }
  });
};

// Delete system field option
export const useDeleteSystemFieldOption = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('system_field_options')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-field-options'] });
      toast({
        title: "Success",
        description: "System field option deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete system field option",
        variant: "destructive"
      });
    }
  });
};