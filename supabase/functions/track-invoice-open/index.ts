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

    if (!invoiceId || !logoUrl) {
      return new Response('Missing parameters', { status: 400 });
    }

    console.log('Invoice opened:', { invoiceId, timestamp: new Date().toISOString() });

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Log the invoice open event
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

    // Fetch the actual logo and return it
    const logoResponse = await fetch(decodeURIComponent(logoUrl));
    const logoBuffer = await logoResponse.arrayBuffer();
    
    return new Response(logoBuffer, {
      status: 200,
      headers: {
        'Content-Type': logoResponse.headers.get('Content-Type') || 'image/png',
        'Cache-Control': 'no-cache',
        ...corsHeaders
      }
    });

  } catch (error: any) {
    console.error("Error in track-invoice-open function:", error);
    
    // Return a 1x1 transparent pixel as fallback
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