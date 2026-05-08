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

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.byteLength !== bb.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < ab.byteLength; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
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

  const expectedSecret = Deno.env.get("MEDIUS_EVENTS_WEBHOOK_SECRET");
  if (!expectedSecret) {
    console.error("MEDIUS_EVENTS_WEBHOOK_SECRET not configured");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const providedSecret = req.headers.get("x-webhook-secret") ?? "";
  if (!timingSafeEqual(providedSecret, expectedSecret)) {
    // SAFE DEBUG: log only lengths + first/last 2 chars (never full secret).
    // Remove this block once the conference→portal handshake is confirmed.
    const peek = (s: string) =>
      s.length === 0
        ? "(empty)"
        : `${s.slice(0, 2)}…${s.slice(-2)} (len=${s.length})`;
    const headerNames = [...req.headers.keys()].filter((h) =>
      h.toLowerCase().includes("secret") || h.toLowerCase().includes("webhook")
    );
    console.warn("[receive-membership-payment] 401 secret mismatch", {
      provided: peek(providedSecret),
      expected: peek(expectedSecret),
      provided_header_present: req.headers.has("x-webhook-secret"),
      secret_like_headers_received: headerNames,
    });
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

    if (matchedOrgId) {
      const periodStart = `${periodYear}-01-01`;
      const periodEnd = `${periodYear}-12-31`;
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
            amount: data.amount_paid,
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
              amount: data.amount_paid,
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
