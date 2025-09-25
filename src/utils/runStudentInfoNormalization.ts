import { executeNormalization } from './normalizeSystemFields';

// Utility to run normalization specifically for student information system
export async function runStudentInfoNormalization() {
  console.log('Starting student_information_system normalization...');
  
  try {
    const result = await executeNormalization(['student_information_system'], true);
    
    console.log('Student Information System normalization completed:', result);
    console.log(`Processed ${result.processed} organizations`);
    
    if (result.errors.length > 0) {
      console.error('Normalization errors:', result.errors);
    }
    
    return result;
  } catch (error) {
    console.error('Error during student information system normalization:', error);
    throw error;
  }
}

// Run the normalization immediately
runStudentInfoNormalization().then((result) => {
  console.log('Final result:', result);
}).catch((error) => {
  console.error('Failed to run student information system normalization:', error);
});