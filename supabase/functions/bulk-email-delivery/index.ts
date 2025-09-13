import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkEmailRequest {
  emails: Array<{
    to: string;
    subject: string;
    template: string;
    invoiceId?: string;
    organizationName?: string;
  }>;
  type?: string;
}

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  try {
    const bulkRequest: BulkEmailRequest = await req.json();
    const correlationId = crypto.randomUUID();
    
    console.log('[bulk-email-delivery] Processing bulk email request', {
      correlationId,
      emailCount: bulkRequest.emails.length,
      type: bulkRequest.type
    });

    // Get email rate limit delay from system settings
    let delayMs = 550; // Default fallback
    try {
      const { data: delaySetting } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'email_rate_limit_delay_ms')
        .single();
      
      if (delaySetting?.setting_value) {
        delayMs = parseInt(delaySetting.setting_value, 10) || 550;
      }
    } catch (error) {
      console.warn('[bulk-email-delivery] Could not fetch rate limit delay, using default', { error });
    }

    console.log('[bulk-email-delivery] Using email delay:', delayMs, 'ms');

    // Process emails with rate limiting using background tasks
    const processEmails = async () => {
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < bulkRequest.emails.length; i++) {
        const email = bulkRequest.emails[i];
        
        try {
          // Add progressive delay for rate limiting
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
          
          // Call the centralized email delivery function
          const { data, error } = await supabase.functions.invoke('centralized-email-delivery-public', {
            body: {
              type: 'custom',
              to: email.to,
              subject: email.subject,
              template: email.template
            }
          });
          
          if (error) {
            console.error(`[bulk-email-delivery] Failed to send email to ${email.to}:`, error);
            errorCount++;
          } else {
            console.log(`[bulk-email-delivery] Successfully sent email to ${email.organizationName || email.to}`);
            successCount++;
            
            // If this is an invoice email, mark it as sent
            if (email.invoiceId) {
              try {
                await supabase
                  .from('invoices')
                  .update({ 
                    status: 'sent',
                    sent_date: new Date().toISOString()
                  })
                  .eq('id', email.invoiceId);
              } catch (updateError) {
                console.error(`[bulk-email-delivery] Failed to update invoice ${email.invoiceId}:`, updateError);
              }
            }
          }
        } catch (sendError) {
          console.error(`[bulk-email-delivery] Error processing email for ${email.organizationName || email.to}:`, sendError);
          errorCount++;
        }
      }
      
      console.log('[bulk-email-delivery] Bulk email processing completed', {
        correlationId,
        successCount,
        errorCount,
        totalProcessed: successCount + errorCount
      });
    };

    // Use EdgeRuntime.waitUntil to process emails in background
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(processEmails());
    } else {
      // Fallback for local development
      processEmails().catch(error => {
        console.error('[bulk-email-delivery] Background processing failed:', error);
      });
    }

    // Return immediate response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Bulk email processing started',
        emailCount: bulkRequest.emails.length,
        delayMs,
        correlationId
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('[bulk-email-delivery] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

// Handle function shutdown
addEventListener('beforeunload', (ev) => {
  console.log('[bulk-email-delivery] Function shutdown due to:', ev.detail?.reason);
});