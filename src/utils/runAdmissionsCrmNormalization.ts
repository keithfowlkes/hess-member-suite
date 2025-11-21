import { executeNormalization } from './normalizeSystemFields';
import { supabase } from '@/integrations/supabase/client';

/**
 * Runs normalization for Admissions CRM, Purchasing System, and Payroll System fields
 * and refreshes the analytics datacube
 */
export async function runAdmissionsCrmNormalization() {
  console.log('Starting normalization for Admissions CRM, Purchasing System, and Payroll System...');
  
  try {
    // Run normalization for these specific fields
    const result = await executeNormalization([
      'admissions_crm',
      'purchasing_system', 
      'payroll_system'
    ], true);
    
    console.log(`Processed ${result.processed} records. Refreshing analytics datacube...`);
    
    // Refresh the analytics datacube
    try {
      const { data, error } = await supabase.functions.invoke('refresh-analytics-datacube');
      
      if (error) {
        console.error('Error refreshing datacube:', error);
        return {
          ...result,
          datacubeRefreshed: false,
          errors: [...result.errors, `Datacube refresh error: ${error.message}`]
        };
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
  } catch (error) {
    console.error('Normalization failed:', error);
    return {
      success: false,
      processed: 0,
      datacubeRefreshed: false,
      errors: [`Normalization failed: ${error}`]
    };
  }
}

// Make it globally accessible for console usage
if (typeof window !== 'undefined') {
  (window as any).runAdmissionsCrmNormalization = runAdmissionsCrmNormalization;
}
