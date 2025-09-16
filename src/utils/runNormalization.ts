import { executeNormalization } from './normalizeSystemFields';
import { supabase } from '@/integrations/supabase/client';

// Utility to run normalization for all system fields
export async function runFullNormalization() {
  console.log('Starting normalization process...');
  
  const fieldNames = [
    'student_information_system',
    'financial_system', 
    'financial_aid',
    'admissions_crm',
    'alumni_advancement_crm'
  ];

  try {
    const result = await executeNormalization(fieldNames, true);
    
    console.log('Normalization completed:', result);
    console.log(`Processed ${result.processed} organizations`);
    
    if (result.errors.length > 0) {
      console.error('Normalization errors:', result.errors);
    }
    
    return result;
  } catch (error) {
    console.error('Error during normalization:', error);
    throw error;
  }
}

// Run the normalization immediately
runFullNormalization().then((result) => {
  console.log('Final result:', result);
}).catch((error) => {
  console.error('Failed to run normalization:', error);
});