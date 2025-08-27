import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  'alumni_advancement_crm'
] as const;

export type SystemField = typeof SYSTEM_FIELDS[number];

// Get existing unique values from profiles table with better deduplication
export const useSystemFieldValues = () => {
  return useQuery({
    queryKey: ['system-field-values-from-profiles'],
    queryFn: async () => {
      const fieldValues: Record<SystemField, string[]> = {} as any;
      
      for (const field of SYSTEM_FIELDS) {
        const { data, error } = await supabase
          .from('profiles')
          .select(field)
          .not(field, 'is', null)
          .not(field, 'eq', '');

        if (error) throw error;
        
        // Extract unique non-empty values with better filtering
        const rawValues = data
          .map(item => item[field])
          .filter(value => value && typeof value === 'string' && value.trim().length > 0)
          .map(value => value.trim());
        
        // Remove duplicates using case-insensitive comparison and preserve original casing
        const uniqueValues = Array.from(
          new Map(rawValues.map(val => [val.toLowerCase(), val])).values()
        ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        
        fieldValues[field] = uniqueValues;
      }
      
      return fieldValues;
    },
  });
};

// Get managed system field options (from database table)
export const useSystemFieldOptions = () => {
  return useQuery({
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
};

// Get options for a specific field with advanced deduplication
export const useFieldOptions = (fieldName: SystemField) => {
  const { data: allOptions } = useSystemFieldOptions();
  const { data: profileValues } = useSystemFieldValues();
  
  // Combine managed options with existing profile values
  const managedOptions = allOptions?.filter(opt => opt.field_name === fieldName) || [];
  const profileValuesList = profileValues?.[fieldName] || [];
  
  // Merge and deduplicate - ensure no empty/null values
  const allValues = [
    ...managedOptions.map(opt => opt.option_value),
    ...profileValuesList
  ].filter(value => value && typeof value === 'string' && value.trim().length > 0);
  
  // Advanced deduplication: case-insensitive, trim whitespace, preserve original casing
  const valueMap = new Map<string, string>();
  
  allValues.forEach(value => {
    const normalizedKey = value.trim().toLowerCase();
    if (!valueMap.has(normalizedKey)) {
      valueMap.set(normalizedKey, value.trim());
    }
  });
  
  // Convert back to array and sort case-insensitively
  return Array.from(valueMap.values()).sort((a, b) => 
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
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