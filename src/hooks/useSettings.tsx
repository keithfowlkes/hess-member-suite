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
    role: 'admin' | 'member' | 'cohort_leader';
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
      console.log('🔍 Fetching users with validation...');
      
      // First get all profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profileError) throw profileError;

      console.log(`📊 Found ${profiles?.length || 0} profiles in database`);

      // Then get all user roles
      const { data: roles, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (roleError) throw roleError;

      // Filter out any profiles that might be stale or problematic
      // In a perfect world we'd validate against auth.users, but we'll rely on cleanup functions for that
      const validProfiles = profiles?.filter(profile => {
        // Basic validation - must have required fields
        return profile.user_id && profile.email && profile.first_name && profile.last_name;
      }) || [];

      console.log(`✅ Filtered to ${validProfiles.length} valid profiles`);

      // Combine the data
      const usersWithRoles = validProfiles.map(profile => ({
        ...profile,
        user_roles: roles?.filter(role => role.user_id === profile.user_id) || []
      }));
      
      setUsers(usersWithRoles);
      console.log('👥 User list updated with validated profiles');
    } catch (error: any) {
      console.error('❌ Error fetching users:', error);
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

      // Use custom password reset edge function that includes login hint
      const { data, error } = await supabase.functions.invoke('send-password-reset', {
        body: { 
          email: email
          // Let the edge function use the system setting for redirect URL
        }
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
      console.log('🔑 Changing password for user:', userId);
      
      const { data, error } = await supabase.functions.invoke('change-user-password', {
        body: { 
          userId: userId,
          newPassword: newPassword
        }
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(error.message || 'Failed to change password');
      }

      // Check if the response indicates an error (non-2xx status)
      if (data?.error) {
        console.error('❌ Password change failed:', data.error);
        throw new Error(data.error);
      }

      console.log('✅ Password change completed:', data);

      toast({
        title: 'Password changed',
        description: 'User password has been updated successfully'
      });
    } catch (error: any) {
      console.error('❌ Password change error:', error);
      
      // Provide more specific error messages
      let errorMessage = error.message;
      if (errorMessage.includes('User not found')) {
        errorMessage = 'This user account no longer exists in the authentication system. The user may have been deleted.';
      } else if (errorMessage.includes('non-2xx status code')) {
        errorMessage = 'Failed to change password. Please check if the user account still exists.';
      }
      
      toast({
        title: 'Error changing password',
        description: errorMessage,
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
        .upsert({ setting_key: settingKey, setting_value: value }, { onConflict: 'setting_key' });

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

  const updateUserRole = async (userId: string, newRole: 'admin' | 'member' | 'cohort_leader') => {
    try {
      console.log('🔄 Updating role for user:', userId, 'to:', newRole);
      
      // First delete existing role
      console.log('🗑️ Deleting existing roles for user...');
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('❌ Error deleting existing role:', deleteError);
        
        if (deleteError.message?.includes('Cannot remove admin role')) {
          toast({
            title: 'Cannot Remove Admin Role',
            description: 'This user account is protected and cannot have their admin role removed.',
            variant: 'destructive'
          });
          return;
        }
        
        // Check for foreign key constraint error indicating orphaned profile
        if (deleteError.code === '23503' && deleteError.message?.includes('user_roles_user_id_fkey')) {
          console.log('🧹 Detected orphaned profile during deletion, cleaning up...');
          
          // Get user email for better error message
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, id')
            .eq('user_id', userId)
            .single();
          
          // Clean up the orphaned profile immediately
          if (profile) {
            console.log(`🧹 Cleaning up orphaned profile: ${profile.email}`);
            
            try {
              // Remove as contact person from organizations
              await supabase
                .from('organizations')
                .update({ contact_person_id: null })
                .eq('contact_person_id', profile.id);

              // Delete the profile (this should also clean up any remaining user_roles)
              await supabase
                .from('profiles')
                .delete()
                .eq('user_id', userId);
                
              toast({
                title: 'Orphaned Profile Cleaned',
                description: `Removed orphaned profile for ${profile.email}. Refreshing user list...`,
              });
              
              // Refresh the users list
              await fetchUsers();
              return;
            } catch (cleanupError) {
              console.error('❌ Error during orphaned profile cleanup:', cleanupError);
              toast({
                title: 'Cleanup Failed',
                description: `Failed to clean up orphaned profile for ${profile.email}. Please try the full cleanup tool.`,
                variant: 'destructive'
              });
              return;
            }
          }
        }
        
        throw deleteError;
      }

      console.log('✅ Existing roles deleted successfully');

      // Then insert new role
      console.log('➕ Inserting new role...');
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: newRole
        });

      if (insertError) {
        console.error('❌ Error inserting new role:', insertError);
        
        // Check for unique constraint violation (user already has this role)
        if (insertError.code === '23505') {
          console.log('ℹ️ User already has this role, updating anyway...');
          
          toast({
            title: 'Success',
            description: `User already has ${newRole} role - no changes needed`,
          });
          
          await fetchUsers();
          return;
        }
        
        // Check for foreign key constraint error (truly orphaned profile)
        if (insertError.code === '23503' && insertError.message?.includes('user_roles_user_id_fkey')) {
          console.log('🧹 Detected orphaned profile during insertion, cleaning up...');
          
          try {
            // Get user email for better error message
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('email, id')
              .eq('user_id', userId)
              .maybeSingle(); // Use maybeSingle to avoid errors when no profile exists
              
            if (profileError) {
              console.error('❌ Error fetching profile for cleanup:', profileError);
              throw profileError;
            }
              
            // If profile exists, clean it up
            if (profile) {
              console.log(`🧹 Cleaning up orphaned profile: ${profile.email}`);
              
              // Remove as contact person from organizations
              const { error: orgUpdateError } = await supabase
                .from('organizations')
                .update({ contact_person_id: null })
                .eq('contact_person_id', profile.id);

              if (orgUpdateError) {
                console.error('❌ Error updating organizations:', orgUpdateError);
              }

              // Delete the profile
              const { error: profileDeleteError } = await supabase
                .from('profiles')
                .delete()
                .eq('user_id', userId);
                
              if (profileDeleteError) {
                console.error('❌ Error deleting profile:', profileDeleteError);
                throw profileDeleteError;
              }
                
              console.log('✅ Orphaned profile cleaned successfully');
              
              toast({
                title: 'Orphaned Profile Cleaned',
                description: `Removed orphaned profile for ${profile.email}. Refreshing user list...`,
              });
            } else {
              // Profile was already cleaned up, just refresh the list
              console.log('ℹ️ Profile already cleaned up, refreshing user list...');
              
              toast({
                title: 'Profile Already Cleaned',
                description: 'This user was already removed. Refreshing user list...',
              });
            }
            
            // Always refresh the users list
            await fetchUsers();
            return;
          } catch (cleanupError: any) {
            console.error('❌ Error during orphaned profile cleanup:', cleanupError);
            toast({
              title: 'Cleanup Error',
              description: `Error during cleanup: ${cleanupError.message}`,
              variant: 'destructive'
            });
            // Still refresh the list in case something was partially cleaned
            await fetchUsers();
            return;
          }
        }
        
        throw insertError;
      }

      console.log('✅ Role updated successfully');

      toast({
        title: 'Success',
        description: `User role updated to ${newRole} successfully`
      });

      await fetchUsers();
    } catch (error: any) {
      console.error('❌ Role update error:', error);
      
      let errorMessage = error.message || 'Failed to update user role';
      
      if (error.message?.includes('protect_keith_admin_role')) {
        errorMessage = 'This is a protected admin account that cannot have its role changed.';
      } else if (error.message?.includes('Cannot remove admin role')) {
        errorMessage = 'This admin account is protected from role changes for security reasons.';
      } else if (error.code === '23505') {
        errorMessage = 'User already has this role - no changes needed.';
      }

      toast({
        title: 'Error',
        description: errorMessage,
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
        const { data: deleteData, error: deleteError } = await supabase.functions.invoke('delete-user', {
          body: { userId: profile.user_id }
        });

        if (deleteError) {
          console.error('❌ Edge function error for user:', profile.user_id, deleteError);
          throw new Error(deleteError.message || 'Failed to delete user from auth');
        }

        if (deleteData?.error) {
          console.error('❌ User deletion failed for:', profile.user_id, deleteData.error);
          throw new Error(deleteData.error);
        }

        console.log('✅ Successfully deleted user:', profile.user_id, deleteData);
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

  const deleteUser = async (userId: string, userEmail?: string) => {
    try {
      console.log('🗑️ Starting user deletion for userId:', userId);
      
      // Call edge function to handle the deletion without pre-validation
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: userId }
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(error.message || 'Failed to delete user');
      }

      console.log('✅ Delete user response:', data);

      if (data?.error) {
        console.error('❌ User deletion failed:', data.error);
        throw new Error(data.error);
      }

      const message = data?.authUserExists 
        ? 'User account and profile deleted successfully'
        : 'User profile cleaned up successfully (auth user was already removed)';

      toast({
        title: 'Success',
        description: message
      });

      // Refresh user list
      console.log('🔄 Refreshing user list...');
      await fetchUsers();
      
    } catch (error: any) {
      console.error('❌ Delete user error:', error);
      
      let errorMessage = error.message || 'Failed to delete user account';
      if (errorMessage.includes('User not found')) {
        errorMessage = 'User was already deleted from the system. Cleaning up remaining data...';
        // Still refresh to clean up the UI
        await fetchUsers();
      }
      
      toast({
        title: 'Error deleting user',
        description: errorMessage,
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

    // Realtime refresh for Users list (profiles and user_roles)
    const channelName = `settings_users_changes_${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        console.log('Profiles changed, refreshing users...');
        fetchUsers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => {
        console.log('User roles changed, refreshing users...');
        fetchUsers();
      })
      .subscribe();

    return () => {
      try { channel.unsubscribe(); } catch (e) {}
    };
  }, []);

  // Add a cleanup function for orphaned profiles
  const cleanupOrphanedProfiles = async () => {
    try {
      console.log('🧹 Starting orphaned profiles cleanup...');
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('cleanup-orphaned-profiles');
      
      if (error) {
        console.error('❌ Cleanup error:', error);
        throw error;
      }
      
      console.log('✅ Cleanup completed:', data);
      
      if (data?.orphanedProfilesFound > 0) {
        toast({
          title: 'Cleanup Completed',
          description: `Found and cleaned up ${data.orphanedProfilesFound} orphaned user profiles.`,
        });
      } else {
        toast({
          title: 'No Issues Found',
          description: 'All user profiles are properly linked to auth accounts.',
        });
      }
      
      // Refresh the user list
      await fetchUsers();
      
    } catch (error: any) {
      console.error('❌ Cleanup error:', error);
      toast({
        title: 'Cleanup Failed',
        description: error.message || 'Failed to cleanup orphaned profiles',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const cleanupSpecificUser = async (email: string) => {
    try {
      console.log(`🗑️ Cleaning up specific user: ${email}`);
      setLoading(true);
      
      // First, try to use the existing deleteUserByEmail function
      await deleteUserByEmail(email);
      
      // Force refresh the users list
      await fetchUsers();
      
      toast({
        title: 'User Cleaned Up',
        description: `Successfully removed all traces of ${email} from the system.`,
      });
    } catch (error: any) {
      console.error('❌ Specific user cleanup error:', error);
      toast({
        title: 'Cleanup Failed',
        description: error.message || `Failed to cleanup user ${email}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Add a direct deletion function for specific users
  const deleteSpecificUser = async (email: string) => {
    try {
      console.log('🗑️ Starting specific user deletion for:', email);
      
      // Get user data first
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name')
        .eq('email', email)
        .single();

      if (profileError || !userProfile) {
        console.log('❌ No user found with email:', email);
        toast({
          title: 'User Not Found',
          description: `No user found with email ${email}`,
        });
        return false;
      }

      console.log('👤 Found user:', userProfile);

      // Call the delete-user edge function
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: userProfile.user_id }
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(error.message || 'Failed to delete user');
      }

      console.log('✅ Delete user response:', data);

      if (data?.error) {
        console.error('❌ User deletion failed:', data.error);
        throw new Error(data.error);
      }

      const message = data?.authUserExists 
        ? 'User account and profile deleted successfully'
        : 'User profile cleaned up successfully (auth user was already removed)';

      toast({
        title: 'Success',
        description: message
      });

      return true;
    } catch (error: any) {
      console.error('❌ Delete specific user error:', error);
      toast({
        title: 'Error deleting user',
        description: error.message || 'Failed to delete user',
        variant: 'destructive'
      });
      return false;
    }
  };

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
    deleteSpecificUser,
    resetUserPassword,
    changeUserPassword,
    updateSetting,
    cleanupOrphanedProfiles,
    cleanupSpecificUser
  };
}