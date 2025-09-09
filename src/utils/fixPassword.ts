import { supabase } from '@/integrations/supabase/client';

export const fixUserPassword = async () => {
  try {
    console.log('🔧 Fixing password for fowlkes@thecoalition.us...');
    
    const { data, error } = await supabase.functions.invoke('change-user-password', {
      body: { 
        userEmail: 'fowlkes@thecoalition.us',
        newPassword: 'Tale2tell!!'
      }
    });

    if (error) {
      console.error('❌ Password fix failed:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Password fix successful:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('❌ Password fix error:', error);
    return { success: false, error: error.message };
  }
};

// Auto-execute the fix
fixUserPassword().then(result => {
  console.log('Password fix result:', result);
});