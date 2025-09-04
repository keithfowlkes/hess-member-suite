import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const UserDeletionHandler = () => {
  const [deletionStatus, setDeletionStatus] = useState<string>('checking...');

  useEffect(() => {
    const deleteKeithUser = async () => {
      try {
        console.log('🗑️ Starting deletion of keith.fowlkes@higheredcommunities.org...');
        setDeletionStatus('Deleting keith.fowlkes@higheredcommunities.org...');
        
        // Call the delete-user edge function directly
        const { data, error } = await supabase.functions.invoke('delete-user', {
          body: { userId: '5cdb96c0-3ecb-4a92-9e9d-e5f161b73c2e' }
        });

        if (error) {
          console.error('❌ Edge function error:', error);
          setDeletionStatus(`Error: ${error.message}`);
          return;
        }

        console.log('✅ Delete user response:', data);

        if (data?.error) {
          console.error('❌ User deletion failed:', data.error);
          setDeletionStatus(`Failed: ${data.error}`);
          return;
        }

        const message = data?.authUserExists 
          ? 'User account and profile deleted successfully'
          : 'User profile cleaned up successfully (auth user was already removed)';

        console.log('✅ Deletion completed:', message);
        setDeletionStatus(`Success: ${message}`);
        
        // Verify deletion worked
        setTimeout(async () => {
          const { data: verifyProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('user_id', '5cdb96c0-3ecb-4a92-9e9d-e5f161b73c2e')
            .single();
          
          if (verifyProfile) {
            console.log('⚠️ Profile still exists after deletion');
            setDeletionStatus('Warning: Profile still exists after deletion');
          } else {
            console.log('✅ Verified: Profile successfully deleted');
            setDeletionStatus('Verified: Profile successfully deleted');
          }
        }, 2000);
        
      } catch (error: any) {
        console.error('❌ Delete user error:', error);
        setDeletionStatus(`Error: ${error.message || 'Failed to delete user'}`);
      }
    };

    deleteKeithUser();
  }, []);

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: '#f0f0f0', 
      padding: '10px', 
      border: '1px solid #ccc',
      borderRadius: '4px',
      fontSize: '12px',
      maxWidth: '300px',
      zIndex: 1000
    }}>
      <strong>Deletion Status:</strong>
      <br />
      {deletionStatus}
    </div>
  );
};