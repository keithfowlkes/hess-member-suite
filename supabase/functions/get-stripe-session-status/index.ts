// Returns the status of a Stripe Checkout Session (used after embedded
// checkout return_url to confirm payment without exposing the secret key
// to the browser). Caller must be authenticated; the session is fetched
// using the system_settings Stripe secret key.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: userResp, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userResp.user) {
      return json({ error: "Not authenticated" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const sessionId = String(body?.sessionId ?? "");
    if (!sessionId) return json({ error: "sessionId required" }, 400);

    const { data: settingsRows } = await admin
      .from("system_settings")
      .select("setting_key, setting_value")
      .like("setting_key", "stripe_%");
    const settings: Record<string, string> = {};
    for (const r of settingsRows ?? []) {
      settings[r.setting_key] = r.setting_value ?? "";
    }
    const mode = settings.stripe_mode === "live" ? "live" : "test";
    const secretKey =
      (mode === "live"
        ? settings.stripe_secret_key_live
        : settings.stripe_secret_key_test) ||
      (mode === "live"
        ? Deno.env.get("STRIPE_SECRET_KEY_LIVE")
        : Deno.env.get("STRIPE_SECRET_KEY_TEST"));
    if (!secretKey) return json({ error: "Stripe key missing" }, 500);

    const resp = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    );
    const session = await resp.json();
    if (!resp.ok) {
      return json(
        { error: session?.error?.message ?? "Stripe error" },
        resp.status,
      );
    }

    const invoiceId =
      session.metadata?.invoice_id ?? session.client_reference_id ?? null;
    const paid =
      session.payment_status === "paid" ||
      session.payment_status === "no_payment_required";
    const autoMark = settings.stripe_auto_mark_invoice_paid !== "false";

    // Fallback to the webhook: if Stripe reports the session as paid, ensure
    // the invoice is marked paid here too. This keeps the member dashboard
    // PAID badge in sync even when the webhook is not yet configured.
    if (paid && autoMark && invoiceId) {
      try {
        const { data: existing } = await admin
          .from("invoices")
          .select("id, status")
          .eq("id", invoiceId)
          .maybeSingle();
        if (existing && existing.status !== "paid") {
          const { error: updateErr } = await admin
            .from("invoices")
            .update({
              status: "paid",
              paid_date: new Date().toISOString(),
              payment_source: "stripe",
              external_reference: session.payment_intent ?? session.id,
            })
            .eq("id", invoiceId);
          if (updateErr) {
            console.error(
              "get-stripe-session-status: invoice update failed",
              updateErr,
            );
          } else {
            // Webhook may not be configured; send the PAID-stamped receipt
            // here too. The receipt function is idempotent via audit_log.
            try {
              await admin.functions.invoke("send-paid-invoice-receipt", {
                body: { invoiceId },
              });
            } catch (e) {
              console.warn(
                "get-stripe-session-status: receipt email failed",
                e,
              );
            }
          }
        }
      } catch (e) {
        console.warn(
          "get-stripe-session-status: auto-mark fallback failed",
          e,
        );
      }
    }

    return json({
      status: session.status,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
      customerEmail: session.customer_details?.email ?? session.customer_email,
      invoiceId,
      testMode: session.metadata?.test_mode === "true",
    });

  } catch (err: any) {
    console.error("get-stripe-session-status failure:", err);
    return json({ error: err?.message ?? "Internal error" }, 500);
  }
});
