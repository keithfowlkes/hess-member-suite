import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FormField {
  id: string;
  field_id: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'email' | 'number' | 'password';
  section: string;
  visibility: 'required' | 'optional' | 'hidden';
  placeholder?: string;
  description?: string;
  display_order: number;
  is_custom: boolean;
}

export interface CreateFormFieldData {
  field_id: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'email' | 'number' | 'password';
  section: string;
  visibility: 'required' | 'optional' | 'hidden';
  placeholder?: string;
  description?: string;
  display_order?: number;
  is_custom?: boolean;
}

export function useFormFields() {
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFormFields = async () => {
    try {
      const { data, error } = await supabase
        .from('form_field_configurations')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      
      // Map database fields to component interface
      const mappedFields = data?.map(field => ({
        id: field.id,
        field_id: field.field_id,
        field_name: field.field_name,
        field_label: field.field_label,
        field_type: field.field_type as 'text' | 'email' | 'number' | 'password',
        section: field.section,
        visibility: field.visibility as 'required' | 'optional' | 'hidden',
        placeholder: field.placeholder || '',
        description: field.description || '',
        display_order: field.display_order || 0,
        is_custom: field.is_custom || false
      })) || [];

      setFormFields(mappedFields);
    } catch (error: any) {
      toast({
        title: 'Error fetching form fields',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFormField = async (id: string, updates: Partial<FormField>) => {
    try {
      const { error } = await supabase
        .from('form_field_configurations')
        .update({
          field_name: updates.field_name,
          field_label: updates.field_label,
          field_type: updates.field_type,
          section: updates.section,
          visibility: updates.visibility,
          placeholder: updates.placeholder,
          description: updates.description,
          display_order: updates.display_order
        })
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      setFormFields(prev => prev.map(field => 
        field.id === id ? { ...field, ...updates } : field
      ));

      return true;
    } catch (error: any) {
      toast({
        title: 'Error updating form field',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const createFormField = async (fieldData: CreateFormFieldData) => {
    try {
      // Get next display order
      const maxOrder = Math.max(...formFields.map(f => f.display_order), 0);
      
      const { data, error } = await supabase
        .from('form_field_configurations')
        .insert({
          field_id: fieldData.field_id,
          field_name: fieldData.field_name,
          field_label: fieldData.field_label,
          field_type: fieldData.field_type,
          section: fieldData.section,
          visibility: fieldData.visibility,
          placeholder: fieldData.placeholder,
          description: fieldData.description,
          display_order: fieldData.display_order || maxOrder + 1,
          is_custom: fieldData.is_custom || true
        })
        .select()
        .single();

      if (error) throw error;
      
      const newField: FormField = {
        id: data.id,
        field_id: data.field_id,
        field_name: data.field_name,
        field_label: data.field_label,
        field_type: data.field_type as 'text' | 'email' | 'number' | 'password',
        section: data.section,
        visibility: data.visibility as 'required' | 'optional' | 'hidden',
        placeholder: data.placeholder || '',
        description: data.description || '',
        display_order: data.display_order || 0,
        is_custom: data.is_custom || false
      };

      setFormFields(prev => [...prev, newField].sort((a, b) => a.display_order - b.display_order));
      
      return newField;
    } catch (error: any) {
      toast({
        title: 'Error creating form field',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const deleteFormField = async (id: string) => {
    try {
      const { error } = await supabase
        .from('form_field_configurations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setFormFields(prev => prev.filter(field => field.id !== id));
      
      return true;
    } catch (error: any) {
      toast({
        title: 'Error deleting form field',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateFieldVisibility = async (id: string, visibility: 'required' | 'optional' | 'hidden') => {
    return updateFormField(id, { visibility });
  };

  const resetToDefaults = async () => {
    try {
      // Delete all custom fields
      await supabase
        .from('form_field_configurations')
        .delete()
        .eq('is_custom', true);

      // Reset all default fields to their original configuration
      const { error } = await supabase
        .from('form_field_configurations')
        .update({ visibility: 'optional' })
        .eq('is_custom', false)
        .neq('field_id', 'firstName')
        .neq('field_id', 'lastName') 
        .neq('field_id', 'email')
        .neq('field_id', 'password')
        .neq('field_id', 'organization');

      // Set required fields back to required
      await supabase
        .from('form_field_configurations')
        .update({ visibility: 'required' })
        .in('field_id', ['firstName', 'lastName', 'email', 'password', 'organization']);

      if (error) throw error;

      await fetchFormFields();
      
      toast({
        title: 'Settings Reset',
        description: 'Form field configurations have been reset to defaults.',
      });
    } catch (error: any) {
      toast({
        title: 'Error resetting form fields',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchFormFields();
  }, []);

  return {
    formFields,
    loading,
    fetchFormFields,
    updateFormField,
    createFormField,
    deleteFormField,
    updateFieldVisibility,
    resetToDefaults
  };
}