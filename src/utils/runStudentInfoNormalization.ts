import { executeNormalization } from './normalizeSystemFields';
import { supabase } from '@/integrations/supabase/client';

/**
 * Runs normalization specifically for student_information_system field
 * and refreshes the analytics datacube
 */
export async function runStudentInfoNormalization() {
  console.log('Starting Student Information System normalization...');
  
  // Run normalization for student_information_system field only
  const result = await executeNormalization(['student_information_system'], true);
  
  console.log('Normalization result:', result);
  
  if (result.success || result.processed > 0) {
    console.log(`Processed ${result.processed} records. Refreshing analytics datacube...`);
    
    // Refresh the analytics datacube
    try {
      const { data, error } = await supabase.functions.invoke('refresh-analytics-datacube');
      
      if (error) {
        console.error('Error refreshing datacube:', error);
        throw error;
      }
      
      console.log('Analytics datacube refreshed successfully:', data);
      return {
        ...result,
        datacubeRefreshed: true
      };
    } catch (error) {
      console.error('Failed to refresh datacube:', error);
      return {
        ...result,
        datacubeRefreshed: false,
        errors: [...result.errors, 'Failed to refresh datacube']
      };
    }
  }
  
  return {
    ...result,
    datacubeRefreshed: false
  };
}

// Make it available globally for console access
if (typeof window !== 'undefined') {
  (window as any).runStudentInfoNormalization = runStudentInfoNormalization;
}
