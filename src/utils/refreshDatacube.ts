import { supabase } from '@/integrations/supabase/client';

/**
 * Manually refreshes the analytics datacube by calling the edge function
 */
export async function refreshDatacube() {
  console.log('Refreshing analytics datacube...');
  
  try {
    const { data, error } = await supabase.functions.invoke('refresh-analytics-datacube', {
      body: { manual_refresh: true }
    });
    
    if (error) {
      console.error('Error refreshing datacube:', error);
      throw error;
    }
    
    console.log('Datacube refreshed successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Failed to refresh datacube:', error);
    return { success: false, error };
  }
}

// Make it available globally for console access
if (typeof window !== 'undefined') {
  (window as any).refreshDatacube = refreshDatacube;
}
