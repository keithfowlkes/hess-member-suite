import { supabase } from "@/integrations/supabase/client";

export const cleanupOrphanedRecords = async (email: string) => {
  try {
    console.log(`Calling cleanup function for email: ${email}`);
    
    const { data, error } = await supabase.functions.invoke('cleanup-orphaned-records', {
      body: { email, adminUserId: null }
    });

    if (error) {
      console.error('Cleanup function error:', error);
      throw error;
    }

    console.log('Cleanup function result:', data);
    return data;
  } catch (error) {
    console.error('Failed to cleanup orphaned records:', error);
    throw error;
  }
};