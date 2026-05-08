import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PayloadSchema = z.object({
  source: z.literal("medius-events"),
  event: z.literal("membership_payment_completed"),
  data: z.object({
    conference_slug: z.string().optional(),
    conference_organization_id: z.string().optional(),
    fee_level_id: z.string().optional(),
    fee_level_name: z.string().optional(),
    registration_id: z.string().optional(),
    organization_name: z.string().min(1),
    contact_full_name: z.string().optional(),
    contact_email: z.string().email(),
    amount_paid: z.number().nonnegative(),
    currency: z.string().default("usd"),
    paid_at: z.string(),
    stripe_session_id: z.string().min(1),
  }),
});

// Constant-time string comparison
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.byteLength !== bb.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < ab.byteLength; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
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
    // Audit the bad payload
    await supabase.from("inbound_payment_notifications").insert({
      payload: rawBody as Record<string, unknown>,
      status: "error",
      error_message: JSON.stringify(parsed.error.flatten()),
    });
    return new Response(
      JSON.stringify({ error: "Invalid payload", details: parsed.error.flatten() }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data } = parsed.data;
  const paidAtIso = new Date(data.paid_at).toISOString();

  try {
    // 1) Match organization (case-insensitive name, then email-domain fallback)
    let matchedOrgId: string | null = null;

    const { data: nameMatch } = await supabase
      .from("organizations")
      .select("id")
      .ilike("name", data.organization_name)
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
          .select("id, website, email")
          .or(`website.ilike.%${domain}%,email.ilike.%@${domain}`)
          .eq("organization_type", "member")
          .limit(1)
          .maybeSingle();
        if (domainMatch?.id) matchedOrgId = domainMatch.id;
      }
    }

    let matchedInvoiceId: string | null = null;

    if (matchedOrgId) {
      // 2) Find invoice whose period contains paid_at, then upsert as paid
      const paidDateOnly = paidAtIso.slice(0, 10);
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
            payment_source: "medius-events",
            external_reference: data.stripe_session_id,
          })
          .eq("id", invoice.id);
        if (updErr) throw updErr;
        matchedInvoiceId = invoice.id;
      } else {
        // Create a new paid invoice covering the membership year of paid_at
        const year = new Date(paidAtIso).getUTCFullYear();
        const periodStart = `${year}-01-01`;
        const periodEnd = `${year}-12-31`;
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
              notes: `Auto-recorded from Medius Events (${data.fee_level_name ?? "membership"})`,
            },
            { onConflict: "payment_source,external_reference", ignoreDuplicates: false },
          )
          .select("id")
          .maybeSingle();
        if (insErr) throw insErr;
        matchedInvoiceId = created?.id ?? null;
      }
    }

    // 3) Audit row
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
      status: matchedOrgId ? "processed" : "unmatched",
    });

    return new Response(
      JSON.stringify({
        success: true,
        matched: !!matchedOrgId,
        organization_id: matchedOrgId,
        invoice_id: matchedInvoiceId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
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

    return new Response(
      JSON.stringify({ success: false, error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
