import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UnifiedProfile {
  // Profile (user) data
  profile: {
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    primary_contact_title?: string;
    secondary_first_name?: string;
    secondary_last_name?: string;
    secondary_contact_title?: string;
    secondary_contact_email?: string;
    secondary_contact_phone?: string;
    state_association?: string;
    is_private_nonprofit?: boolean;
    // System fields - available for all users
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
    // Hardware fields - available for all users
    primary_office_apple?: boolean;
    primary_office_lenovo?: boolean;
    primary_office_dell?: boolean;
    primary_office_hp?: boolean;
    primary_office_microsoft?: boolean;
    primary_office_other?: boolean;
    primary_office_other_details?: string;
    other_software_comments?: string;
  };
  // Organization data (if user is primary contact)
  organization?: {
    id: string;
    name: string;
    contact_person_id: string;
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
    approximate_date_joined_hess?: string;
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
  };
}

export function useUnifiedProfile(userId?: string) {
  const [data, setData] = useState<UnifiedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  const fetchUnifiedProfile = async () => {
    try {
      const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!targetUserId) return;

      // Check if current user is admin
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id);
        setIsAdmin(roleData?.some(r => r.role === 'admin') || false);
      }

      // Get profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (profileError) throw profileError;

      // Get organization data if user is a primary contact OR organization member
      let orgData = null;
      
      // First, try to get organization where user is primary contact
      const { data: primaryOrgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('contact_person_id', profileData.id)
        .maybeSingle();
      
      if (primaryOrgData) {
        orgData = primaryOrgData;
      } else {
        // If not primary contact, check if user belongs to an organization by profile.organization field
        if (profileData.organization) {
          const { data: memberOrgData } = await supabase
            .from('organizations')
            .select('*')
            .eq('name', profileData.organization)
            .maybeSingle();
          
          if (memberOrgData) {
            orgData = memberOrgData;
          }
        }
      }

      setData({
        profile: profileData,
        organization: orgData || undefined
      });
    } catch (error: any) {
      console.error('Error fetching unified profile:', error);
      toast({
        title: 'Error fetching profile data',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const submitEditRequest = async (
    updates: {
      profile?: Partial<UnifiedProfile['profile']>;
      organization?: Partial<UnifiedProfile['organization']>;
    }
  ) => {
    if (!data) return false;

    try {
      console.log('🚀 Submitting unified profile edit request:', updates);
      console.log('🚀 canEditDirectly value:', canEditDirectly());
      console.log('🚀 isAdmin:', isAdmin);
      console.log('🚀 data.organization?.contact_person_id:', data?.organization?.contact_person_id);
      console.log('🚀 data.profile?.id:', data?.profile?.id);

      // If there's an organization, submit organization profile edit request
      if (data.organization) {
        // Create properly merged updated data
        const updatedOrganizationData = updates.organization 
          ? { ...data.organization, ...updates.organization }
          : data.organization;
        
        const updatedProfileData = updates.profile 
          ? { ...data.profile, ...updates.profile }
          : data.profile;

        console.log('🚀 Submitting unified profile edit request:', updates);

        const { error } = await supabase
          .from('organization_profile_edit_requests')
          .insert({
            organization_id: data.organization.id,
            requested_by: data.profile.user_id,
            original_organization_data: data.organization,
            updated_organization_data: updatedOrganizationData,
            original_profile_data: data.profile,
            updated_profile_data: updatedProfileData
          });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Profile changes submitted for admin approval'
        });
      } else {
        // If no organization, just update profile directly (or create edit request system for profiles too)
        if (updates.profile) {
          const success = await updateProfileDirect({ profile: updates.profile });
          if (!success) return false;
        }
      }

      return true;
    } catch (error: any) {
      console.error('Error submitting edit request:', error);
      toast({
        title: 'Error submitting changes',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  const updateProfileDirect = async (
    updates: {
      profile?: Partial<UnifiedProfile['profile']>;
      organization?: Partial<UnifiedProfile['organization']>;
    }
  ) => {
    if (!data) return false;

    try {
      console.log('🚀 Updating unified profile directly:', updates);
      console.log('🚀 Direct update - canEditDirectly value:', canEditDirectly());
      console.log('🚀 Direct update - isAdmin:', isAdmin);
      console.log('🚀 Direct update - data.organization?.contact_person_id:', data?.organization?.contact_person_id);
      console.log('🚀 Direct update - data.profile?.id:', data?.profile?.id);

      const promises = [];

      // Update profile if provided
      if (updates.profile) {
        promises.push(
          supabase
            .from('profiles')
            .update(updates.profile)
            .eq('id', data.profile.id)
        );
      }

      // Update organization if provided and exists
      if (updates.organization && data.organization) {
        promises.push(
          supabase
            .from('organizations')
            .update(updates.organization)
            .eq('id', data.organization.id)
        );
      }

      // Execute all updates
      const results = await Promise.all(promises);

      // Check for errors
      for (const result of results) {
        if (result.error) throw result.error;
      }

      // Refresh data
      await fetchUnifiedProfile();

      toast({
        title: 'Success',
        description: 'Profile updated successfully'
      });

      return true;
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error updating profile',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  const canEditDirectly = () => {
    // Admins can always edit directly
    if (isAdmin) return true;
    
    // Primary account holders (contact persons) can edit their organization directly
    if (data?.organization?.contact_person_id === data?.profile?.id) {
      return true;
    }
    
    return false;
  };

  const getDisplayName = () => {
    if (!data) return '';
    return `${data.profile.first_name} ${data.profile.last_name}`.trim();
  };

  const getOrganizationName = () => {
    return data?.organization?.name || '';
  };

  const getUserOrganization = async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!profileData) return null;

      // First, try to get organization where user is primary contact
      let { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('contact_person_id', profileData.id)
        .maybeSingle();

      // If not primary contact, check if user belongs to an organization by profile.organization field
      if (!orgData && profileData.organization) {
        const { data: memberOrgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('name', profileData.organization)
          .maybeSingle();
        
        orgData = memberOrgData;
      }

      return orgData;
    } catch (error) {
      console.error('Error getting user organization:', error);
      return null;
    }
  };

  useEffect(() => {
    fetchUnifiedProfile();

    // Set up real-time subscription for organization changes
    const channelName = `unified_profile_org_changes_${Math.random().toString(36).substr(2, 9)}`;
    const subscription = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'organizations' 
        }, 
        () => {
          console.log('Organizations table changed, refreshing unified profile...');
          fetchUnifiedProfile();
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'profiles' 
        }, 
        () => {
          console.log('Profiles table changed, refreshing unified profile...');
          fetchUnifiedProfile();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  // Simplified method specifically for primary contact users updating through profile modal
  const updatePrimaryContactProfile = async (
    updates: {
      profile?: Partial<UnifiedProfile['profile']>;
      organization?: Partial<UnifiedProfile['organization']>;
    }
  ) => {
    if (!data) return false;

    // Only allow primary contact users to use this method
    const isPrimaryContact = data.organization?.contact_person_id === data.profile.id;
    if (!isPrimaryContact && !isAdmin) {
      console.log('❌ User is not primary contact or admin, cannot use direct update');
      return false;
    }

    try {
      console.log('🚀 Primary contact direct update:', updates);
      const promises = [];

      // Update profile if provided
      if (updates.profile) {
        console.log('🚀 Updating profile directly:', updates.profile);
        promises.push(
          supabase
            .from('profiles')
            .update(updates.profile)
            .eq('id', data.profile.id)
        );
      }

      // Update organization if provided and exists
      if (updates.organization && data.organization) {
        console.log('🚀 Updating organization directly:', updates.organization);
        promises.push(
          supabase
            .from('organizations')
            .update(updates.organization)
            .eq('id', data.organization.id)
        );
      }

      // Execute all updates
      const results = await Promise.all(promises);

      // Check for errors
      for (const result of results) {
        if (result.error) {
          console.error('❌ Database update error:', result.error);
          throw result.error;
        }
      }

      // Don't manually refresh - realtime subscription will handle it
      console.log('🚀 Primary contact update completed successfully');

      toast({
        title: 'Success',
        description: 'Profile updated successfully'
      });

      return true;
    } catch (error: any) {
      console.error('❌ Error in primary contact update:', error);
      toast({
        title: 'Error updating profile',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  return {
    data,
    loading,
    isAdmin,
    submitEditRequest,
    updateProfileDirect,
    updatePrimaryContactProfile,
    canEditDirectly,
    getDisplayName,
    getOrganizationName,
    getUserOrganization,
    refetch: fetchUnifiedProfile
  };
}