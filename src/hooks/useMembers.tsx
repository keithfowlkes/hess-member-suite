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
  notes?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    student_fte?: number;
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
            first_name,
            last_name,
            email,
            phone,
            student_fte
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

  return {
    organizations,
    loading,
    fetchOrganizations,
    createOrganization,
    updateOrganization
  };
}