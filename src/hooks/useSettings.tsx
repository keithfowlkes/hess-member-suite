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
      console.log('🔄 FETCHING USERS: Starting user fetch...');
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

      console.log('🔄 FETCHING USERS: Found', usersWithRoles.length, 'users');
      console.log('🔄 FETCHING USERS: Frank users:', usersWithRoles.filter(u => u.email.includes('frank@deuslogic.com')));
      
      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error('🔄 FETCHING USERS: Error:', error);
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

  const deleteUserByEmail = async (email: string) => {
    try {
      console.log('🗑️ Starting deletion by email:', email);
      
      // Get all users with this email
      const { data: userProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id, email, first_name, last_name')
        .eq('email', email);

      if (profileError) {
        console.error('❌ Error fetching user profiles by email:', profileError);
        throw profileError;
      }

      if (!userProfiles || userProfiles.length === 0) {
        toast({
          title: 'No Users Found',
          description: `No users found with email ${email}`,
        });
        return;
      }

      console.log('👥 Found users with this email:', userProfiles);

      // Delete each user found
      for (const profile of userProfiles) {
        console.log(`🗑️ Deleting user ${profile.user_id}...`);
        
        // Remove as contact person from organizations
        await supabase
          .from('organizations')
          .update({ contact_person_id: null })
          .eq('contact_person_id', profile.id);

        // Delete user roles
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', profile.user_id);

        // Delete profile
        await supabase
          .from('profiles')
          .delete()
          .eq('user_id', profile.user_id);

        // Delete from auth using edge function
        await supabase.functions.invoke('delete-user', {
          body: { userId: profile.user_id }
        });
      }

      toast({
        title: 'Success',
        description: `Deleted ${userProfiles.length} user(s) with email ${email}`
      });

      // Force refresh
      await fetchUsers();
      
    } catch (error: any) {
      console.error('❌ Delete by email error:', error);
      toast({
        title: 'Error deleting users',
        description: error.message || 'Failed to delete users by email',
        variant: 'destructive'
      });
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      console.log('🗑️ Starting user deletion for userId:', userId);
      
      // First check if user is a contact person for any organization
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('❌ Error fetching user profile:', profileError);
        throw profileError;
      }

      if (!userProfile) {
        console.log('⚠️ No profile found for user - may already be deleted');
        // Force refresh the user list since this user seems to be stale data
        toast({
          title: 'User Already Deleted',
          description: 'This user was already deleted from the system. Refreshing user list...',
        });
        
        // Force a hard refresh of the users list
        console.log('🔄 Force refreshing user list...');
        await fetchUsers();
        
        // If that doesn't work, let's also reload the entire settings data
        setTimeout(async () => {
          console.log('🔄 Reloading all settings data...');
          setLoading(true);
          await Promise.all([fetchUsers(), fetchStats(), fetchSettings()]);
          setLoading(false);
        }, 1000);
        
        return;
      }

      console.log('👤 User profile found:', userProfile);

      if (userProfile) {
        const { data: organizations } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('contact_person_id', userProfile.id);

        console.log('🏢 Organizations where user is contact:', organizations);

        if (organizations && organizations.length > 0) {
          // Remove user as contact person from organizations
          const { error: orgUpdateError } = await supabase
            .from('organizations')
            .update({ contact_person_id: null })
            .eq('contact_person_id', userProfile.id);

          if (orgUpdateError) {
            console.error('❌ Error updating organizations:', orgUpdateError);
            throw orgUpdateError;
          }

          console.log('✅ Removed as contact from organizations');

          toast({
            title: 'Contact removed',
            description: `User was removed as contact person from ${organizations.length} organization(s)`,
            variant: 'default'
          });
        }
      }

      // Delete user roles first
      console.log('🔐 Deleting user roles...');
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      
      if (rolesError) {
        console.error('❌ Error deleting user roles:', rolesError);
        throw rolesError;
      }
      console.log('✅ User roles deleted');

      // Delete profile (now has proper DELETE policy)
      console.log('👤 Deleting user profile...');
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);
      
      if (error) {
        console.error('❌ Error deleting profile:', error);
        throw error;
      }
      console.log('✅ User profile deleted');

      // Delete from auth.users table using edge function
      console.log('🔑 Calling delete-user edge function...');
      const { error: authError } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (authError) {
        console.error('❌ Error deleting user from auth:', authError);
        toast({
          title: "Warning",
          description: "User profile deleted but auth account may still exist.",
          variant: "destructive"
        });
      } else {
        console.log('✅ Auth user deletion completed');
      }

      toast({
        title: 'Success',
        description: 'User account deleted successfully'
      });

      console.log('🔄 Refreshing user list...');
      await fetchUsers();
      console.log('✅ User deletion process completed');
    } catch (error: any) {
      console.error('❌ Delete user error:', error);
      toast({
        title: 'Error deleting user',
        description: error.message || 'Failed to delete user account',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      console.log('Starting settings data load...');
      setLoading(true);
      
      try {
        await Promise.all([
          fetchUsers().then(() => console.log('Users fetch completed')),
          fetchStats().then(() => console.log('Stats fetch completed')), 
          fetchSettings().then(() => console.log('Settings fetch completed'))
        ]);
        console.log('All settings data loaded successfully');
      } catch (error) {
        console.error('Error loading settings data:', error);
      } finally {
        setLoading(false);
        console.log('Settings loading state set to false');
      }
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
    deleteUserByEmail,
    resetUserPassword,
    changeUserPassword,
    updateSetting
  };
}