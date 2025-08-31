import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const invoiceId = url.searchParams.get('invoice_id');
    const logoUrl = url.searchParams.get('logo_url');

    console.log('Invoice tracking request:', { invoiceId, logoUrl });

    if (!invoiceId) {
      console.log('Missing invoice_id parameter');
      // Return a transparent pixel if no invoice ID
      const transparentPixel = new Uint8Array([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
        0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
        0xAE, 0x42, 0x60, 0x82
      ]);
      
      return new Response(transparentPixel, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache',
          ...corsHeaders
        }
      });
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Log the invoice open event
    console.log('Logging invoice open event for:', invoiceId);
    await supabase.from('audit_log').insert({
      action: 'invoice_opened',
      entity_type: 'invoice',
      entity_id: invoiceId,
      details: { 
        timestamp: new Date().toISOString(),
        user_agent: req.headers.get('user-agent') || '',
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || ''
      }
    });

    // Update invoice to mark as opened if not already done
    await supabase
      .from('invoices')
      .update({
        opened_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .is('opened_at', null);

    console.log('Invoice tracking logged successfully');

    // If no logo URL provided, try to get it from the template
    let finalLogoUrl = logoUrl;
    if (!logoUrl) {
      console.log('No logo URL provided, fetching from default template');
      const { data: template } = await supabase
        .from('invoice_templates')
        .select('logo_url')
        .eq('is_default', true)
        .single();
      
      if (template?.logo_url) {
        finalLogoUrl = template.logo_url.startsWith('http') 
          ? template.logo_url 
          : `https://9f0afb12-d741-415b-9bbb-e40cfcba281a.sandbox.lovable.dev${template.logo_url}`;
      }
    } else {
      finalLogoUrl = decodeURIComponent(logoUrl);
    }

    // Fetch and return the actual logo
    if (finalLogoUrl) {
      console.log('Fetching logo from:', finalLogoUrl);
      try {
        const logoResponse = await fetch(finalLogoUrl);
        if (logoResponse.ok) {
          const logoBuffer = await logoResponse.arrayBuffer();
          const contentType = logoResponse.headers.get('Content-Type') || 'image/png';
          
          console.log('Logo fetched successfully, size:', logoBuffer.byteLength);
          return new Response(logoBuffer, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
              ...corsHeaders
            }
          });
        } else {
          console.log('Failed to fetch logo, status:', logoResponse.status);
        }
      } catch (logoError) {
        console.error('Error fetching logo:', logoError);
      }
    }

    // Fallback: return default HESS logo as base64 if available, or transparent pixel
    console.log('Returning fallback image');
    const transparentPixel = new Uint8Array([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
      0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
      0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
      0xAE, 0x42, 0x60, 0x82
    ]);
    
    return new Response(transparentPixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache',
        ...corsHeaders
      }
    });

  } catch (error: any) {
    console.error("Error in track-invoice-open function:", error);
    
    // Return a transparent pixel as fallback
    const transparentPixel = new Uint8Array([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
      0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
      0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
      0xAE, 0x42, 0x60, 0x82
    ]);
    
    return new Response(transparentPixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache',
        ...corsHeaders
      }
    });
  }
});