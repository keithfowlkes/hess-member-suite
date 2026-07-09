import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DataSchema = z.object({
  membership_dues_paid: z.boolean().optional(),
  payment_type: z.string().optional(),
  period_year: z.number().int().optional(),
  source_channel: z.string().optional(),
  registration_option: z.string().optional(),

  conference_slug: z.string().nullable().optional(),
  conference_organization_id: z.string().nullable().optional(),
  fee_level_id: z.string().nullable().optional(),
  fee_level_name: z.string().nullable().optional(),
  registration_id: z.string().nullable().optional(),

  organization_name: z.string().min(1),
  contact_full_name: z.string().nullable().optional(),
  contact_email: z.string().email(),

  amount_paid: z.number().nonnegative(),
  currency: z.string().default("usd"),
  paid_at: z.string(),
  stripe_session_id: z.string().min(1),
});

const PayloadSchema = z.object({
  source: z.literal("medius-events"),
  event: z.enum(["membership_dues_paid", "membership_payment_completed"]),
  data: DataSchema,
});

const CURRENT_INVOICE_PERIOD_START = "2026-07-30";
const CURRENT_INVOICE_PERIOD_END = "2027-07-30";

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.byteLength !== bb.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < ab.byteLength; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

// Normalize a secret string so trivial formatting differences on the sender
// side (whitespace, surrounding quotes, "Bearer " prefix, accidental double
// concatenation of the same secret) don't cause a 401. The receiver still
// requires the caller to know the actual secret.
function normalizeSecret(raw: string): string[] {
  const variants = new Set<string>();
  const base = (raw ?? "").trim().replace(/^["']|["']$/g, "");
  if (base) variants.add(base);
  const noBearer = base.replace(/^Bearer\s+/i, "").trim();
  if (noBearer) variants.add(noBearer);
  // Duplicate-concatenation case (observed in production: sender posted the
  // secret twice back-to-back, producing a 2x-length header).
  if (noBearer.length % 2 === 0) {
    const half = noBearer.length / 2;
    const a = noBearer.slice(0, half);
    const b = noBearer.slice(half);
    if (a === b && a) variants.add(a);
  }
  // Multiple identical X-Webhook-Secret headers can be coalesced by the
  // platform as "secret, secret". Accept only when every comma-separated
  // value is the same known secret, not arbitrary alternate values.
  const commaParts = noBearer
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (commaParts.length > 1 && commaParts.every((part) => part === commaParts[0])) {
    variants.add(commaParts[0]);
  }
  return [...variants];
}

function secretMatches(provided: string, expected: string): boolean {
  const normalizedExpected = expected.trim();
  for (const v of normalizeSecret(provided)) {
    if (timingSafeEqual(v, normalizedExpected)) return true;
  }
  return false;
}

function findMatchingSecret(
  provided: string,
  expectedSecrets: Array<{ name: string; value: string }>,
): string | null {
  for (const secret of expectedSecrets) {
    if (secretMatches(provided, secret.value)) return secret.name;
  }
  return null;
}

function ok(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const expectedSecrets = [
    "MEDIUS_EVENTS_WEBHOOK_SECRET_V2",
    "MEDIUS_EVENTS_WEBHOOK_SECRET",
    "HESS_PORTAL_WEBHOOK_SECRET",
    "HESS_MEMBER_PORTAL_WEBHOOK_SECRET",
  ]
    .map((name) => ({ name, value: Deno.env.get(name)?.trim() ?? "" }))
    .filter((secret) => secret.value.length > 0);

  if (expectedSecrets.length === 0) {
    console.error("No Medius webhook secret configured");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Accept the secret from the primary header OR from a Bearer token in
  // Authorization, which some senders default to.
  const providedSecret =
    req.headers.get("x-webhook-secret") ??
    req.headers.get("authorization") ??
    "";
  const matchedSecretName = findMatchingSecret(providedSecret, expectedSecrets);

  if (!matchedSecretName) {
    const peek = (s: string) =>
      s.length === 0
        ? "(empty)"
        : s.length <= 10
          ? `${s.slice(0, 2)}…${s.slice(-2)} (len=${s.length})`
          : `${s.slice(0, 6)}…${s.slice(-4)} (len=${s.length})`;
    console.warn("[receive-membership-payment] 401 secret mismatch", {
      x_source: req.headers.get("x-source") ?? "(missing)",
      provided: peek(providedSecret),
      expected: expectedSecrets.map((secret) => ({
        name: secret.name,
        fingerprint: peek(secret.value),
      })),
      provided_header_present: req.headers.has("x-webhook-secret"),
      authorization_header_present: req.headers.has("authorization"),
    });


    // Persist the failed delivery so an admin can retry via the Inbound
    // Payments screen once the sender's secret is corrected. Without this,
    // rejected webhooks were invisible and led to silent sync gaps.
    try {
      const supabaseLog = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      let payload: unknown = null;
      try {
        payload = await req.json();
      } catch {
        payload = { raw: await req.text().catch(() => "") };
      }
      const d =
        (payload as any)?.data && typeof (payload as any).data === "object"
          ? (payload as any).data
          : {};
      await supabaseLog.from("inbound_payment_notifications").insert({
        payload: payload as Record<string, unknown>,
        organization_name: d.organization_name ?? null,
        contact_email: d.contact_email ?? null,
        amount_paid: typeof d.amount_paid === "number" ? d.amount_paid : null,
        currency: d.currency ?? null,
        paid_at: d.paid_at ? new Date(d.paid_at).toISOString() : null,
        external_reference: d.stripe_session_id ?? null,
        status: "error",
        error_message: "Webhook secret mismatch — payload preserved for retry",
      });
    } catch (logErr) {
      console.error("Failed to log rejected webhook", logErr);
    }

    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }


  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = PayloadSchema.safeParse(rawBody);
  if (!parsed.success) {
    await supabase.from("inbound_payment_notifications").insert({
      payload: rawBody as Record<string, unknown>,
      status: "error",
      error_message: JSON.stringify(parsed.error.flatten()),
    });
    // Return 200 so sender's audit log records delivery (per spec)
    return ok({
      success: false,
      matched: false,
      status: "error",
      error: "Invalid payload",
    });
  }

  const { event, data } = parsed.data;
  const paidAtIso = new Date(data.paid_at).toISOString();
  const periodYear =
    data.period_year ?? new Date(paidAtIso).getUTCFullYear();

  // Authoritative dues confirmation check.
  // Legacy event name is accepted for backward compatibility.
  const isDuesConfirmation =
    event === "membership_payment_completed" ||
    (event === "membership_dues_paid" &&
      data.membership_dues_paid === true &&
      data.payment_type === "annual_membership_dues");

  if (!isDuesConfirmation) {
    await supabase.from("inbound_payment_notifications").insert({
      payload: parsed.data as unknown as Record<string, unknown>,
      organization_name: data.organization_name,
      contact_email: data.contact_email,
      amount_paid: data.amount_paid,
      currency: data.currency,
      paid_at: paidAtIso,
      external_reference: data.stripe_session_id,
      status: "error",
      error_message: "Not a membership dues confirmation",
    });
    return ok({ success: true, matched: false, status: "ignored" });
  }

  try {
    // 1) Match organization
    let matchedOrgId: string | null = null;
    const trimmedName = data.organization_name.trim();

    const { data: nameMatch } = await supabase
      .from("organizations")
      .select("id")
      .ilike("name", trimmedName)
      .eq("organization_type", "member")
      .limit(1)
      .maybeSingle();

    if (nameMatch?.id) {
      matchedOrgId = nameMatch.id;
    } else {
      const domain = data.contact_email.split("@")[1]?.toLowerCase();
      if (domain) {
        const { data: domainMatch } = await supabase
          .from("organizations")
          .select("id")
          .or(`website.ilike.%${domain}%,email.ilike.%@${domain}`)
          .eq("organization_type", "member")
          .limit(1)
          .maybeSingle();
        if (domainMatch?.id) matchedOrgId = domainMatch.id;
      }
    }

    let matchedInvoiceId: string | null = null;

    // For annual membership dues, always use the portal's configured
    // full_member_fee (which includes the Stripe processing fee) so the
    // invoice matches what direct-Stripe payers are charged. This prevents
    // Medius-side base-price payments (e.g. $300) from producing invoices
    // that don't reflect the fee-inclusive amount ($309.27) shown elsewhere.
    let invoiceAmount = data.amount_paid;
    try {
      const { data: feeSetting } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "full_member_fee")
        .maybeSingle();
      const configuredFee = feeSetting?.setting_value
        ? Number(feeSetting.setting_value)
        : NaN;
      if (Number.isFinite(configuredFee) && configuredFee > 0) {
        invoiceAmount = configuredFee;
      }
    } catch (e) {
      console.warn("receive-membership-payment: fee lookup failed, using amount_paid", e);
    }

    if (matchedOrgId) {
      const periodStart = CURRENT_INVOICE_PERIOD_START;
      const periodEnd = CURRENT_INVOICE_PERIOD_END;
      const paidDateOnly = paidAtIso.slice(0, 10);

      // Find invoice whose period contains paid_at
      const { data: invoice } = await supabase
        .from("invoices")
        .select("id")
        .eq("organization_id", matchedOrgId)
        .lte("period_start_date", paidDateOnly)
        .gte("period_end_date", paidDateOnly)
        .order("period_start_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (invoice?.id) {
        const { error: updErr } = await supabase
          .from("invoices")
          .update({
            status: "paid",
            paid_date: paidAtIso,
            amount: invoiceAmount,
            payment_source: "medius-events",
            external_reference: data.stripe_session_id,
          })
          .eq("id", invoice.id);
        if (updErr) throw updErr;
        matchedInvoiceId = invoice.id;
      } else {
        const invoiceNumber = `MEDIUS-${data.stripe_session_id.slice(-12)}`;
        const { data: created, error: insErr } = await supabase
          .from("invoices")
          .upsert(
            {
              organization_id: matchedOrgId,
              invoice_number: invoiceNumber,
              amount: invoiceAmount,

              status: "paid",
              invoice_date: paidAtIso.slice(0, 10),
              due_date: paidAtIso.slice(0, 10),
              paid_date: paidAtIso,
              period_start_date: periodStart,
              period_end_date: periodEnd,
              payment_source: "medius-events",
              external_reference: data.stripe_session_id,
              notes: `Auto-recorded from Medius Events (${data.fee_level_name ?? "HESS Annual Membership Fee"}) for ${periodYear}`,
            },
            { onConflict: "payment_source,external_reference", ignoreDuplicates: false },
          )
          .select("id")
          .maybeSingle();
        if (insErr) throw insErr;
        matchedInvoiceId = created?.id ?? null;
      }
    }

    const status = matchedOrgId ? "processed" : "unmatched";

    await supabase.from("inbound_payment_notifications").insert({
      payload: parsed.data as unknown as Record<string, unknown>,
      matched_organization_id: matchedOrgId,
      matched_invoice_id: matchedInvoiceId,
      organization_name: data.organization_name,
      contact_email: data.contact_email,
      amount_paid: data.amount_paid,
      currency: data.currency,
      paid_at: paidAtIso,
      external_reference: data.stripe_session_id,
      status,
    });

    // After recording the inbound payment as paid, send the PAID-stamped
    // receipt and issue the conference registration code. Both are
    // idempotent so re-deliveries are safe.
    if (matchedInvoiceId && matchedOrgId) {
      try {
        await supabase.functions.invoke("send-paid-invoice-receipt", {
          body: { invoiceId: matchedInvoiceId },
        });
      } catch (e) {
        console.warn("receive-membership-payment: receipt email failed", e);
      }
      try {
        await supabase.functions.invoke("issue-conference-registration-code", {
          body: { invoice_id: matchedInvoiceId, organization_id: matchedOrgId },
        });
      } catch (e) {
        console.warn(
          "receive-membership-payment: registration code issue failed",
          e,
        );
      }
    }

    return ok({
      success: true,
      matched: !!matchedOrgId,
      organization_id: matchedOrgId,
      invoice_id: matchedInvoiceId,
      status,
    });
  } catch (err: any) {
    console.error("receive-membership-payment error:", err);
    await supabase.from("inbound_payment_notifications").insert({
      payload: parsed.data as unknown as Record<string, unknown>,
      organization_name: data.organization_name,
      contact_email: data.contact_email,
      amount_paid: data.amount_paid,
      currency: data.currency,
      paid_at: paidAtIso,
      external_reference: data.stripe_session_id,
      status: "error",
      error_message: String(err?.message ?? err),
    });

    // Return 200 per spec — only auth/JSON parse return non-2xx.
    return ok({
      success: false,
      matched: false,
      status: "error",
      error: String(err?.message ?? err),
    });
  }
});
