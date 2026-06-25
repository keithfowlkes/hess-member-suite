import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Self-contained Stripe webhook: HMAC-SHA256 signature verification via
// the Web Crypto API (no Stripe SDK), then marks the referenced invoice paid.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "stripe-signature, content-type",
};

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
  toleranceSeconds = 300,
): Promise<boolean> {
  const parts: Record<string, string> = {};
  const signatures: string[] = [];
  for (const kv of header.split(",")) {
    const idx = kv.indexOf("=");
    if (idx < 0) continue;
    const k = kv.slice(0, idx).trim();
    const v = kv.slice(idx + 1).trim();
    parts[k] = v;
    if (k === "v1") signatures.push(v);
  }
  const timestamp = parts["t"];
  if (!timestamp || signatures.length === 0) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > toleranceSeconds) return false;

  const expected = await hmacSha256Hex(secret, `${timestamp}.${payload}`);
  return signatures.some((sig) => timingSafeEqualHex(expected, sig));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const payload = await req.text();
  const sigHeader = req.headers.get("stripe-signature") ?? "";
  if (!sigHeader) return new Response("Missing signature", { status: 400 });

  const { data: settingsRows } = await admin
    .from("system_settings")
    .select("setting_key, setting_value")
    .like("setting_key", "stripe_%");
  const settings: Record<string, string> = {};
  for (const r of settingsRows ?? [])
    settings[r.setting_key] = r.setting_value ?? "";

  // Webhook signing secrets are managed in Admin Panel → Online Payments and
  // stored in system_settings. Env vars are kept as legacy fallback.
  const mode = settings.stripe_mode === "live" ? "live" : "test";
  const primarySecret =
    (mode === "live"
      ? settings.stripe_webhook_secret_live
      : settings.stripe_webhook_secret_test) ||
    (mode === "live"
      ? Deno.env.get("STRIPE_WEBHOOK_SECRET_LIVE")
      : Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST"));
  const fallbackSecret =
    (mode === "live"
      ? settings.stripe_webhook_secret_test
      : settings.stripe_webhook_secret_live) ||
    (mode === "live"
      ? Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST")
      : Deno.env.get("STRIPE_WEBHOOK_SECRET_LIVE"));

  let verified = false;
  for (const secret of [primarySecret, fallbackSecret]) {
    if (!secret) continue;
    if (await verifyStripeSignature(payload, sigHeader, secret)) {
      verified = true;
      break;
    }
  }
  if (!verified) {
    console.warn("stripe-webhook: signature verification failed");
    return new Response("Invalid signature", { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const autoMark = settings.stripe_auto_mark_invoice_paid !== "false";

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object;
      const invoiceId =
        session?.client_reference_id ?? session?.metadata?.invoice_id;
      const paid =
        session?.payment_status === "paid" ||
        session?.payment_status === "no_payment_required";

      if (!invoiceId) {
        console.warn("stripe-webhook: no invoice id on session", session?.id);
        return new Response("ok", { status: 200 });
      }
      if (!paid) {
        console.log(
          "stripe-webhook: session not yet paid",
          session?.id,
          session?.payment_status,
        );
        return new Response("ok", { status: 200 });
      }
      if (!autoMark) {
        console.log("stripe-webhook: auto-mark disabled");
        return new Response("ok", { status: 200 });
      }

      const { data: existing } = await admin
        .from("invoices")
        .select("id, status")
        .eq("id", invoiceId)
        .maybeSingle();
      if (!existing) {
        console.warn("stripe-webhook: invoice not found", invoiceId);
        return new Response("ok", { status: 200 });
      }
      if (existing.status === "paid") {
        return new Response("ok", { status: 200 });
      }

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
        console.error("stripe-webhook: invoice update failed", updateErr);
        return new Response("Update failed", { status: 500 });
      }

      try {
        const { data: invDetails } = await admin
          .from("invoices")
          .select("id, organization_id, organizations ( name )")
          .eq("id", invoiceId)
          .maybeSingle();
        const orgName = (invDetails as any)?.organizations?.name;
        const orgId = (invDetails as any)?.organization_id;
        if (orgName) {
          await admin.functions.invoke("notify-payment-status", {
            body: {
              invoice_id: invoiceId,
              organization_name: orgName,
              status: "paid",
              paid_date: new Date().toISOString(),
            },
          });
        }
        // Email the member a receipt: the invoice rendered with a PAID stamp
        // and the date it was paid.
        await admin.functions.invoke("send-paid-invoice-receipt", {
          body: { invoiceId },
        });
        if (orgId) {
          await admin.functions.invoke("issue-conference-registration-code", {
            body: { invoice_id: invoiceId, organization_id: orgId },
          });
        }
      } catch (e) {
        console.warn("stripe-webhook: post-payment notifications failed", e);
      }
    } else {
      console.log("stripe-webhook: ignoring event type", event.type);
    }
    return new Response("ok", { status: 200 });
  } catch (err: any) {
    console.error("stripe-webhook handler error", err);
    return new Response("Internal error", { status: 500 });
  }
});
