import { supabase } from '@/integrations/supabase/client';
import hessLogoOfficial from '@/assets/hess-logo-official.png';

export async function setupDefaultInvoiceTemplate() {
  try {
    // Convert the imported logo to a blob for upload
    const response = await fetch(hessLogoOfficial);
    const logoBlob = await response.blob();
    
    // Upload the logo to Supabase storage
    const fileName = `hess-logo-official-${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('invoice-logos')
      .upload(fileName, logoBlob, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading logo:', uploadError);
      return;
    }

    // Get the public URL for the uploaded logo
    const { data: { publicUrl } } = supabase.storage
      .from('invoice-logos')
      .getPublicUrl(fileName);

    // Update the default template with the logo URL
    const { error: updateError } = await supabase
      .from('invoice_templates')
      .update({ logo_url: publicUrl })
      .eq('name', 'HESS Consortium Default Template');

    if (updateError) {
      console.error('Error updating template with logo:', updateError);
      return;
    }

    console.log('Default HESS invoice template setup completed with logo');
    return publicUrl;
  } catch (error) {
    console.error('Error setting up default invoice template:', error);
  }
}