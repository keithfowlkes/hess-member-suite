import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OrganizationProfile {
  // Organization data
  organization: {
    id: string;
    name: string;
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
  // Primary contact profile data
  profile: {
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

export function useOrganizationProfile(profileId?: string) {
  const [data, setData] = useState<OrganizationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOrganizationProfile = async () => {
    if (!profileId) {
      setLoading(false);
      return;
    }

    try {
      // First get the profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (profileError) throw profileError;

      // Then get the organization where this profile is the primary contact
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('contact_person_id', profileId)
        .single();

      if (orgError) throw orgError;

      setData({
        organization: orgData,
        profile: profileData
      });
    } catch (error: any) {
      toast({
        title: 'Error fetching data',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrganizationProfile = async (
    updates: {
      organization?: Partial<OrganizationProfile['organization']>;
      profile?: Partial<OrganizationProfile['profile']>;
    }
  ) => {
    if (!data) return false;

    try {
      console.log('Updating organization profile with:', updates);
      
      // Start a transaction-like operation
      const promises = [];

      // Update organization if provided
      if (updates.organization) {
        console.log('Updating organization:', data.organization.id, updates.organization);
        promises.push(
          supabase
            .from('organizations')
            .update(updates.organization)
            .eq('id', data.organization.id)
        );
      }

      // Update profile if provided
      if (updates.profile) {
        console.log('Updating profile:', data.profile.id, updates.profile);
        promises.push(
          supabase
            .from('profiles')
            .update(updates.profile)
            .eq('id', data.profile.id)
        );
      }

      // Execute all updates
      const results = await Promise.all(promises);

      // Check for errors
      for (const result of results) {
        if (result.error) {
          console.error('Update error:', result.error);
          throw result.error;
        }
        console.log('Update result:', result);
      }

      // Refresh data
      await fetchOrganizationProfile();

      toast({
        title: 'Success',
        description: 'Information updated successfully'
      });

      return true;
    } catch (error: any) {
      console.error('Error in updateOrganizationProfile:', error);
      toast({
        title: 'Error updating information',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  const getUserOrganization = async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!profileData) return null;

      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('contact_person_id', profileData.id)
        .single();

      return orgData;
    } catch (error) {
      console.error('Error getting user organization:', error);
      return null;
    }
  };

  useEffect(() => {
    fetchOrganizationProfile();
  }, [profileId]);

  return {
    data,
    loading,
    updateOrganizationProfile,
    getUserOrganization,
    refetch: fetchOrganizationProfile
  };
}