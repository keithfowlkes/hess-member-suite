import { supabase } from '@/integrations/supabase/client';

// One-time script to delete keith.fowlkes@higheredcommunities.org
export const deleteKeithUser = async () => {
  try {
    console.log('🗑️ Deleting keith.fowlkes@higheredcommunities.org...');
    
    // First get the user to confirm they exist
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, email, first_name, last_name')
      .eq('email', 'keith.fowlkes@higheredcommunities.org')
      .single();

    if (profileError || !userProfile) {
      console.log('❌ User not found');
      return { success: false, message: 'User not found' };
    }

    console.log('👤 Found user:', userProfile);

    // Call the delete-user edge function
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { userId: userProfile.user_id }
    });

    if (error) {
      console.error('❌ Edge function error:', error);
      return { success: false, message: error.message || 'Failed to delete user' };
    }

    console.log('✅ Delete user response:', data);

    if (data?.error) {
      console.error('❌ User deletion failed:', data.error);
      return { success: false, message: data.error };
    }

    const message = data?.authUserExists 
      ? 'User account and profile deleted successfully'
      : 'User profile cleaned up successfully (auth user was already removed)';

    console.log('✅ Deletion completed:', message);
    
    return { success: true, message };
  } catch (error: any) {
    console.error('❌ Delete user error:', error);
    return { success: false, message: error.message || 'Failed to delete user' };
  }
};

// Auto-execute if this file is run directly
if (typeof window !== 'undefined') {
  // Execute the deletion
  deleteKeithUser().then(result => {
    console.log('Final result:', result);
  });
}