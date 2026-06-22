import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const MAX_PER_RUN = 25;       // throughput cap per minute
const MAX_ATTEMPTS = 3;
const WALL_TIME_BUDGET_MS = 110_000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  // Authorize: shared secret header set by pg_cron. Accept either env-provided
  // value or one stored in system_settings (the latter is what pg_cron reads).
  const providedSecret = req.headers.get("x-cron-secret") ?? "";
  const envSecret = Deno.env.get("SCHEDULED_EMAIL_CRON_SECRET") ?? "";
  let dbSecret = "";
  try {
    const { data: s } = await supabaseAdmin
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "scheduled_email_cron_secret")
      .maybeSingle();
    dbSecret = s?.setting_value ?? "";
  } catch (_e) { /* ignore */ }

  const validSecret =
    !!providedSecret && (providedSecret === envSecret || providedSecret === dbSecret);
  if (!validSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const startedAt = Date.now();
  let processed = 0;
  let sent = 0;
  let failed = 0;

  try {
    // Fetch a batch of due rows. Using update with returning to atomically claim them.
    const { data: claimed, error: claimError } = await supabaseAdmin.rpc("claim_scheduled_emails", {
      _limit: MAX_PER_RUN,
    });

    let rows: any[] | null = null;
    if (claimError) {
      // Fallback path: no RPC available — claim via two-step update.
      console.warn("[process-scheduled-email-queue] claim_scheduled_emails RPC unavailable, using fallback", claimError);

      const { data: due, error: dueErr } = await supabase
        .from("scheduled_email_queue")
        .select("id")
        .eq("status", "pending")
        .lte("scheduled_send_at", new Date().toISOString())
        .order("scheduled_send_at", { ascending: true })
        .limit(MAX_PER_RUN);

      if (dueErr) throw dueErr;
      const ids = (due ?? []).map((r) => r.id);
      if (ids.length === 0) {
        return new Response(JSON.stringify({ ok: true, processed: 0, message: "nothing due" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: updated, error: updErr } = await supabase
        .from("scheduled_email_queue")
        .update({ status: "sending", attempts: 0 })
        .in("id", ids)
        .eq("status", "pending")
        .select("*");
      if (updErr) throw updErr;
      rows = updated ?? [];
    } else {
      rows = claimed ?? [];
    }

    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0, message: "nothing due" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const row of rows) {
      if (Date.now() - startedAt > WALL_TIME_BUDGET_MS) {
        // Out of time — release remaining claimed rows back to pending
        await supabase
          .from("scheduled_email_queue")
          .update({ status: "pending" })
          .eq("id", row.id)
          .eq("status", "sending");
        continue;
      }

      processed++;
      try {
        const { error: sendError } = await supabaseAdmin.functions.invoke(
          "centralized-email-delivery-public",
          {
            body: {
              type: row.email_type || "custom",
              to: row.recipient,
              subject: row.subject,
              template: row.template_html,
            },
          }
        );

        if (sendError) throw sendError;

        await supabase
          .from("scheduled_email_queue")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            last_error: null,
          })
          .eq("id", row.id);

        if (row.invoice_id) {
          await supabase
            .from("invoices")
            .update({
              status: "sent",
              sent_date: new Date().toISOString(),
            })
            .eq("id", row.invoice_id);
        }
        sent++;
      } catch (err: any) {
        const attempts = (row.attempts ?? 0) + 1;
        const finalStatus = attempts >= MAX_ATTEMPTS ? "failed" : "pending";
        const nextSchedule =
          finalStatus === "pending"
            ? new Date(Date.now() + 5 * 60 * 1000).toISOString() // retry in 5 min
            : row.scheduled_send_at;
        await supabase
          .from("scheduled_email_queue")
          .update({
            status: finalStatus,
            attempts,
            last_error: String(err?.message ?? err).slice(0, 1000),
            scheduled_send_at: nextSchedule,
          })
          .eq("id", row.id);
        failed++;
        console.error(
          `[process-scheduled-email-queue] send failed for ${row.recipient}:`,
          err?.message ?? err
        );
      }
    }

    return new Response(
      JSON.stringify({ ok: true, processed, sent, failed, elapsed_ms: Date.now() - startedAt }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[process-scheduled-email-queue] fatal error:", error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
