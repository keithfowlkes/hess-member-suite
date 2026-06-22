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
    organizationId?: string;
    organizationName?: string;
  }>;
  type?: string;
  /**
   * If set (>0), schedule emails into the durable queue spread evenly across
   * this many hours instead of sending in-process. Recommended for large
   * batches (e.g. annual invoice runs) to avoid spam-trap flagging.
   */
  scheduleWindowHours?: number;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req: Request): Promise<Response> => {
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

    console.log('[bulk-email-delivery] Request received', {
      correlationId,
      emailCount: bulkRequest.emails?.length ?? 0,
      type: bulkRequest.type,
      scheduleWindowHours: bulkRequest.scheduleWindowHours,
    });

    if (!Array.isArray(bulkRequest.emails) || bulkRequest.emails.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'emails array required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Determine schedule window. Explicit param wins; otherwise consult system setting.
    let windowHours = Number(bulkRequest.scheduleWindowHours ?? NaN);
    if (!Number.isFinite(windowHours) || windowHours < 0) {
      try {
        const { data: setting } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'bulk_email_window_hours')
          .maybeSingle();
        if (setting?.setting_value) {
          windowHours = Number(setting.setting_value);
        }
      } catch (e) {
        console.warn('[bulk-email-delivery] Could not fetch bulk_email_window_hours setting', e);
      }
    }
    if (!Number.isFinite(windowHours) || windowHours < 0) windowHours = 12;

    // ===== Scheduled (durable) path =====
    if (windowHours > 0) {
      const batchId = crypto.randomUUID();
      const n = bulkRequest.emails.length;
      const totalSeconds = windowHours * 3600;
      const stepSeconds = n > 1 ? totalSeconds / (n - 1) : 0;
      const now = Date.now();

      const rows = bulkRequest.emails.map((email, i) => {
        const baseOffset = stepSeconds * i;
        // Jitter ±30s to avoid identical seconds
        const jitter = (Math.random() - 0.5) * 60;
        const sendAt = new Date(now + Math.max(0, baseOffset + jitter) * 1000).toISOString();
        return {
          batch_id: batchId,
          email_type: bulkRequest.type === 'invoice_bulk' ? 'invoice' : (bulkRequest.type || 'custom'),
          recipient: email.to,
          subject: email.subject,
          template_html: email.template,
          invoice_id: email.invoiceId ?? null,
          organization_id: email.organizationId ?? null,
          organization_name: email.organizationName ?? null,
          scheduled_send_at: sendAt,
          status: 'pending',
        };
      });

      // Insert in chunks to avoid payload limits
      const chunkSize = 200;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await supabase.from('scheduled_email_queue').insert(chunk);
        if (error) throw error;
      }

      const firstSendAt = rows[0]?.scheduled_send_at;
      const lastSendAt = rows[rows.length - 1]?.scheduled_send_at;

      console.log('[bulk-email-delivery] Scheduled batch enqueued', {
        correlationId, batchId, count: rows.length, windowHours, firstSendAt, lastSendAt,
      });

      return new Response(
        JSON.stringify({
          success: true,
          scheduled: true,
          batchId,
          count: rows.length,
          windowHours,
          firstSendAt,
          lastSendAt,
          message: `Scheduled ${rows.length} emails spread over ${windowHours}h`,
          correlationId,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // ===== Immediate (legacy) path — kept for non-bulk callers =====
    let delayMs = 550;
    try {
      const { data: delaySetting } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'email_rate_limit_delay_ms')
        .single();
      if (delaySetting?.setting_value) {
        delayMs = parseInt(delaySetting.setting_value, 10) || 550;
      }
    } catch (_e) { /* fall back to default */ }

    const processEmails = async () => {
      let successCount = 0;
      let errorCount = 0;
      for (let i = 0; i < bulkRequest.emails.length; i++) {
        const email = bulkRequest.emails[i];
        try {
          if (i > 0) await new Promise((r) => setTimeout(r, delayMs));
          const { error } = await supabase.functions.invoke('centralized-email-delivery-public', {
            body: { type: 'custom', to: email.to, subject: email.subject, template: email.template },
          });
          if (error) { errorCount++; continue; }
          successCount++;
          if (email.invoiceId) {
            await supabase
              .from('invoices')
              .update({ status: 'sent', sent_date: new Date().toISOString() })
              .eq('id', email.invoiceId);
          }
        } catch (sendError) {
          console.error(`[bulk-email-delivery] Error for ${email.organizationName || email.to}:`, sendError);
          errorCount++;
        }
      }
      console.log('[bulk-email-delivery] Immediate batch complete', { correlationId, successCount, errorCount });
    };

    if (typeof (globalThis as any).EdgeRuntime !== 'undefined' && (globalThis as any).EdgeRuntime.waitUntil) {
      (globalThis as any).EdgeRuntime.waitUntil(processEmails());
    } else {
      processEmails().catch((e) => console.error('[bulk-email-delivery] Background failed:', e));
    }

    return new Response(
      JSON.stringify({
        success: true,
        scheduled: false,
        message: 'Immediate bulk email processing started',
        emailCount: bulkRequest.emails.length,
        delayMs,
        correlationId,
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
