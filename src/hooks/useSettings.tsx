import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  organization?: string;
  created_at: string;
  user_roles?: {
    role: 'admin' | 'member';
  }[];
}

export interface SystemStats {
  totalMembers: number;
  activeMembers: number;
  totalInvoices: number;
  totalRevenue: number;
  pendingInvoices: number;
}

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string | null;
  description: string | null;
}

export function useSettings() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      // First get all profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profileError) throw profileError;

      // Then get all user roles
      const { data: roles, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (roleError) throw roleError;

      // Combine the data
      const usersWithRoles = profiles?.map(profile => ({
        ...profile,
        user_roles: roles?.filter(role => role.user_id === profile.user_id) || []
      })) || [];

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast({
        title: 'Error fetching users',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const resetUserPassword = async (email: string) => {
    try {
      // Get custom password reset message
      const passwordResetSetting = settings.find(s => s.setting_key === 'password_reset_message');
      const customMessage = passwordResetSetting?.setting_value || "A password reset link has been sent to your email address.";

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`
      });

      if (error) throw error;

      toast({
        title: 'Password reset sent',
        description: customMessage
      });
    } catch (error: any) {
      toast({
        title: 'Error sending password reset',
        description: error.message,
        variant: 'destructive'  
      });
    }
  };

  const changeUserPassword = async (userId: string, newPassword: string) => {
    try {
      // Note: This requires a service role key which should be handled server-side
      // For now, we'll use the admin updateUser function
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: 'Password changed',
        description: 'User password has been updated successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error changing password',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('setting_key', { ascending: true });

      if (error) throw error;

      setSettings(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching settings',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const updateSetting = async (settingKey: string, value: string) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ setting_value: value })
        .eq('setting_key', settingKey);

      if (error) throw error;

      toast({
        title: 'Setting updated',
        description: 'The setting has been saved successfully'
      });

      await fetchSettings();
    } catch (error: any) {
      toast({
        title: 'Error updating setting',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const fetchStats = async () => {
    try {
      // Get organization stats
      const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .select('membership_status, annual_fee_amount');

      if (orgError) throw orgError;

      // Get invoice stats
      const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select('status, amount, prorated_amount');

      if (invError) throw invError;

      const totalMembers = orgs?.length || 0;
      const activeMembers = orgs?.filter(org => org.membership_status === 'active').length || 0;
      const totalInvoices = invoices?.length || 0;
      const pendingInvoices = invoices?.filter(inv => inv.status === 'sent' || inv.status === 'overdue').length || 0;
      
      const totalRevenue = invoices?.reduce((sum, inv) => {
        if (inv.status === 'paid') {
          return sum + (inv.prorated_amount || inv.amount);
        }
        return sum;
      }, 0) || 0;

      setStats({
        totalMembers,
        activeMembers,
        totalInvoices,
        totalRevenue,
        pendingInvoices
      });
    } catch (error: any) {
      toast({
        title: 'Error fetching statistics',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'member') => {
    try {
      // First delete existing role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Then insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: newRole
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User role updated successfully'
      });

      await fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error updating user role',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      console.log('Starting user deletion for userId:', userId);
      
      // First check if user is a contact person for any organization
      console.log('Checking if user is a contact person...');
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('user_id', userId)
        .single();

      console.log('User profile data:', userProfile);
      if (profileError) {
        console.log('Profile fetch error:', profileError);
      }

      if (userProfile) {
        console.log('Checking organizations with contact_person_id:', userProfile.id);
        const { data: organizations, error: orgError } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('contact_person_id', userProfile.id);

        console.log('Organizations found:', organizations);
        if (orgError) {
          console.log('Organizations fetch error:', orgError);
        }

        if (organizations && organizations.length > 0) {
          console.log(`Removing user as contact person from ${organizations.length} organizations`);
          // Remove user as contact person from organizations
          const { error: orgUpdateError } = await supabase
            .from('organizations')
            .update({ contact_person_id: null })
            .eq('contact_person_id', userProfile.id);

          if (orgUpdateError) {
            console.log('Organization update error:', orgUpdateError);
            throw orgUpdateError;
          }

          console.log('Successfully removed as contact person');
          toast({
            title: 'Contact removed',
            description: `User was removed as contact person from ${organizations.length} organization(s)`,
            variant: 'default'
          });
        }
      }

      // Delete user roles first
      console.log('Deleting user roles...');
      const { error: roleDeleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (roleDeleteError) {
        console.log('Role deletion error:', roleDeleteError);
        throw roleDeleteError;
      }

      // Delete profile (this will cascade due to auth.users reference)
      console.log('Deleting profile...');
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);
      
      if (error) {
        console.log('Profile deletion error:', error);
        throw error;
      }

      // Also delete from auth.users table
      console.log('Deleting from auth.users...');
      try {
        const { error: authError } = await supabase.auth.admin.deleteUser(userId);
        if (authError && !authError.message?.includes('User not found')) {
          console.warn('Could not delete from auth.users:', authError.message);
        } else {
          console.log('Successfully deleted from auth.users');
        }
      } catch (authErr) {
        console.warn('Auth deletion warning:', authErr);
      }

      console.log('User deletion completed successfully');
      toast({
        title: 'Success',
        description: 'User account deleted successfully'
      });

      await fetchUsers();
    } catch (error: any) {
      console.error('Delete user error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      toast({
        title: 'Error deleting user',
        description: error.message || 'Failed to delete user account',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchStats(), fetchSettings()]);
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    users,
    stats,
    settings,
    loading,
    fetchUsers,
    fetchStats,
    fetchSettings,
    updateUserRole,
    deleteUser,
    resetUserPassword,
    changeUserPassword,
    updateSetting
  };
}