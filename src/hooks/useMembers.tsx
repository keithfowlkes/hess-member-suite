import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  profiles?: {
    id?: string;
    user_id?: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    organization?: string;
    state_association?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    primary_contact_title?: string;
    secondary_first_name?: string;
    secondary_last_name?: string;
    secondary_contact_title?: string;
    secondary_contact_email?: string;
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
    primary_office_apple?: boolean;
    primary_office_asus?: boolean;
    primary_office_dell?: boolean;
    primary_office_hp?: boolean;
    primary_office_microsoft?: boolean;
    primary_office_other?: boolean;
    primary_office_other_details?: string;
    other_software_comments?: string;
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

export function useMembers() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          profiles:contact_person_id (
            id, user_id, first_name, last_name, email, phone, organization, state_association,
            address, city, state, zip, primary_contact_title,
            secondary_first_name, secondary_last_name, secondary_contact_title,
            secondary_contact_email, student_information_system, financial_system,
            financial_aid, hcm_hr, payroll_system, purchasing_system,
            housing_management, learning_management, admissions_crm,
            alumni_advancement_crm, primary_office_apple, primary_office_asus,
            primary_office_dell, primary_office_hp, primary_office_microsoft,
            primary_office_other, primary_office_other_details, other_software_comments
          )
        `)
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching members',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createOrganization = async (orgData: CreateOrganizationData) => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .insert(orgData)
        .select()
        .single();

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Organization created successfully'
      });
      
      await fetchOrganizations();
      return data;
    } catch (error: any) {
      toast({
        title: 'Error creating organization',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateOrganization = async (id: string, orgData: Partial<Organization>) => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .update(orgData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Organization updated successfully'
      });
      
      await fetchOrganizations();
      return data;
    } catch (error: any) {
      toast({
        title: 'Error updating organization',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const markAllOrganizationsActive = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .update({ 
          membership_status: 'active',
          membership_start_date: new Date().toISOString().split('T')[0]
        })
        .neq('membership_status', 'active')
        .select();

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: `${data?.length || 0} organizations marked as active`
      });
      
      await fetchOrganizations();
      return data;
    } catch (error: any) {
      toast({
        title: 'Error updating organizations',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const deleteOrganization = async (id: string) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Refetch organizations after deletion
      await fetchOrganizations();
      
      toast({
        title: "Success",
        description: "Organization deleted successfully.",
      });
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete organization",
        variant: "destructive"
      });
      throw error;
    }
  };

  return { 
    organizations, 
    loading, 
    fetchOrganizations, 
    createOrganization, 
    updateOrganization, 
    markAllOrganizationsActive,
    deleteOrganization
  };
}