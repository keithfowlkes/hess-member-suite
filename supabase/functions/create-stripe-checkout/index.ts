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

function formEncode(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

async function loadSettings(
  admin: ReturnType<typeof createClient>,
): Promise<Record<string, string>> {
  const { data, error } = await admin
    .from("system_settings")
    .select("setting_key, setting_value")
    .like("setting_key", "stripe_%");
  if (error) throw error;
  const out: Record<string, string> = {};
  for (const row of data ?? []) out[row.setting_key] = row.setting_value ?? "";
  return out;
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
    const user = userResp.user;

    const body = await req.json().catch(() => ({}));
    const invoiceId = String(body?.invoiceId ?? "");
    if (!invoiceId) return json({ error: "invoiceId required" }, 400);

    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile) return json({ error: "Profile not found" }, 403);

    const { data: org } = await admin
      .from("organizations")
      .select("id, name, email")
      .eq("contact_person_id", profile.id)
      .maybeSingle();
    if (!org) return json({ error: "Organization not found for caller" }, 403);

    const { data: invoice, error: invErr } = await admin
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .maybeSingle();
    if (invErr || !invoice) return json({ error: "Invoice not found" }, 404);
    if (invoice.organization_id !== org.id) {
      return json({ error: "Forbidden" }, 403);
    }
    if (invoice.status === "paid") {
      return json({ error: "Invoice already paid" }, 400);
    }

    const settings = await loadSettings(admin);
    if (settings.stripe_enabled !== "true") {
      return json({ error: "Stripe payments are not enabled" }, 400);
    }
    const mode = settings.stripe_mode === "live" ? "live" : "test";
    // Secret keys are managed in the Admin Panel → Online Payments view and
    // stored in `system_settings`. Edge-function env vars are kept as a
    // fallback for legacy installs only.
    const secretKey =
      (mode === "live"
        ? settings.stripe_secret_key_live
        : settings.stripe_secret_key_test) ||
      (mode === "live"
        ? Deno.env.get("STRIPE_SECRET_KEY_LIVE")
        : Deno.env.get("STRIPE_SECRET_KEY_TEST"));
    if (!secretKey) {
      return json(
        {
          error: `Stripe ${mode}-mode secret key is not configured. Add it in Admin Panel → Online Payments.`,
        },
        500,
      );
    }

    const currency = (settings.stripe_default_currency || "usd").toLowerCase();
    const amountCents = Math.round(
      Number(invoice.prorated_amount ?? invoice.amount) * 100,
    );
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return json({ error: "Invalid invoice amount" }, 400);
    }

    const origin = req.headers.get("origin") ?? "";
    const baseSuccess = settings.stripe_success_url || `${origin}/`;
    const baseCancel = settings.stripe_cancel_url || `${origin}/`;
    const sep = (u: string) => (u.includes("?") ? "&" : "?");
    const successUrl = `${baseSuccess}${sep(baseSuccess)}payment=success&invoice=${invoice.id}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseCancel}${sep(baseCancel)}payment=cancelled&invoice=${invoice.id}`;

    const productName = `HESS Consortium Membership — Invoice ${invoice.invoice_number}`;
    const productDesc = `Membership period ${invoice.period_start_date} to ${invoice.period_end_date}`;

    const params: Record<string, string> = {
      mode: "payment",
      "payment_method_types[0]": "card",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": currency,
      "line_items[0][price_data][unit_amount]": String(amountCents),
      "line_items[0][price_data][product_data][name]": productName,
      "line_items[0][price_data][product_data][description]": productDesc,
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: invoice.id,
      "metadata[invoice_id]": invoice.id,
      "metadata[organization_id]": org.id,
      "metadata[invoice_number]": invoice.invoice_number,
    };
    if (org.email) params.customer_email = org.email;
    if (settings.stripe_statement_descriptor) {
      params["payment_intent_data[statement_descriptor]"] =
        settings.stripe_statement_descriptor.slice(0, 22);
    }

    const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formEncode(params),
    });

    const session = await resp.json();
    if (!resp.ok) {
      console.error("Stripe session error:", session);
      return json(
        { error: session?.error?.message ?? "Stripe error" },
        resp.status,
      );
    }

    return json({ url: session.url, id: session.id });
  } catch (err: any) {
    console.error("create-stripe-checkout failure:", err);
    return json({ error: err?.message ?? "Internal error" }, 500);
  }
});
