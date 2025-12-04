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
  'alumni_advancement_crm',
  'payment_platform',
  'meal_plan_management',
  'identity_management',
  'door_access',
  'document_management',
  'voip',
  'network_infrastructure',
  'cohort_membership',
  'partner_program_interest'
] as const;

export type SystemField = typeof SYSTEM_FIELDS[number];

export const FIELD_LABELS: Record<SystemField, string> = {
  student_information_system: 'Student Information System',
  financial_system: 'Finance System',
  financial_aid: 'FinAid System',
  hcm_hr: 'HCM (HR)',
  payroll_system: 'Payroll System',
  purchasing_system: 'Purchasing System',
  housing_management: 'Housing Management',
  learning_management: 'Learning Management (LMS)',
  admissions_crm: 'Admissions CRM',
  alumni_advancement_crm: 'Alumni / Advancement CRM',
  payment_platform: 'Payment Platform',
  meal_plan_management: 'Meal Plan Management',
  identity_management: 'Identity Management',
  door_access: 'Door Access',
  document_management: 'Document Management',
  voip: 'VoIP',
  network_infrastructure: 'Network Infrastructure',
  cohort_membership: 'Cohort Membership',
  partner_program_interest: 'Partner Program Interest'
};

// Get all system field options
export const useSimpleSystemFieldOptions = () => {
  return useQuery({
    queryKey: ['simple-system-field-options'],
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

// Get options for a specific field
export const useSimpleFieldOptions = (fieldName: SystemField) => {
  const { data: allOptions } = useSimpleSystemFieldOptions();
  
  return allOptions?.filter(opt => opt.field_name === fieldName)
    .map(opt => opt.option_value)
    .sort((a, b) => {
      // Always put "None" at the end
      if (a.toLowerCase() === 'none') return 1;
      if (b.toLowerCase() === 'none') return -1;
      return a.localeCompare(b, undefined, { sensitivity: 'base' });
    }) || [];
};

// Add new system field option
export const useAddSimpleSystemFieldOption = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fieldName, optionValue }: { fieldName: SystemField; optionValue: string }) => {
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
        throw new Error('This option already exists');
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
      queryClient.invalidateQueries({ queryKey: ['simple-system-field-options'] });
      toast({
        title: "Success",
        description: "Option added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add option",
        variant: "destructive"
      });
    }
  });
};

// Update system field option
export const useUpdateSimpleSystemFieldOption = () => {
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
      queryClient.invalidateQueries({ queryKey: ['simple-system-field-options'] });
      toast({
        title: "Success",
        description: "Option updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update option",
        variant: "destructive"
      });
    }
  });
};

// Delete system field option
export const useDeleteSimpleSystemFieldOption = () => {
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
      queryClient.invalidateQueries({ queryKey: ['simple-system-field-options'] });
      toast({
        title: "Success",
        description: "Option deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete option",
        variant: "destructive"
      });
    }
  });
};