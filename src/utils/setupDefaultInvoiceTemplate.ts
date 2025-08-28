import { supabase } from '@/integrations/supabase/client';

export async function setupDefaultInvoiceTemplate() {
  try {
    // Use the uploaded HESS logo directly
    const logoUrl = '/lovable-uploads/4a98a7dc-4bad-4f5b-94d4-fa028adbc2f6.png';

    // Update the default template with the official logo URL
    const { error: updateError } = await supabase
      .from('invoice_templates')
      .update({ logo_url: logoUrl })
      .eq('name', 'HESS Consortium Default Template');

    if (updateError) {
      console.error('Error updating template with logo:', updateError);
      return;
    }

    console.log('Default HESS invoice template setup completed with official logo');
    return logoUrl;
  } catch (error) {
    console.error('Error setting up default invoice template:', error);
  }
}