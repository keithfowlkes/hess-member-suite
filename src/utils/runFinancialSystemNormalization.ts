import { executeNormalization } from './normalizeSystemFields';

// Utility to run normalization specifically for financial system
export async function runFinancialSystemNormalization() {
  console.log('Starting financial_system normalization...');
  
  try {
    const result = await executeNormalization(['financial_system'], true);
    
    console.log('Financial System normalization completed:', result);
    console.log(`Processed ${result.processed} organizations`);
    
    if (result.errors.length > 0) {
      console.error('Normalization errors:', result.errors);
    }
    
    return result;
  } catch (error) {
    console.error('Fatal error during normalization:', error);
    throw error;
  }
}

// Auto-execute when imported in browser console
if (typeof window !== 'undefined') {
  (window as any).runFinancialSystemNormalization = runFinancialSystemNormalization;
}
