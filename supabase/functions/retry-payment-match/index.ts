import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", claimsData.claims.sub)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { notification_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.notification_id) {
    return new Response(JSON.stringify({ error: "notification_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: notif, error: notifErr } = await admin
    .from("inbound_payment_notifications")
    .select("*")
    .eq("id", body.notification_id)
    .maybeSingle();

  if (notifErr || !notif) {
    return new Response(JSON.stringify({ error: "Notification not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const orgName: string = notif.organization_name ?? notif.payload?.data?.organization_name ?? "";
  const contactEmail: string = notif.contact_email ?? notif.payload?.data?.contact_email ?? "";
  const stripeRef: string = notif.external_reference ?? notif.payload?.data?.stripe_session_id ?? "";
  const amount: number = Number(notif.amount_paid ?? notif.payload?.data?.amount_paid ?? 0);
  const paidAt: string = notif.paid_at ?? notif.payload?.data?.paid_at ?? new Date().toISOString();
  const paidAtIso = new Date(paidAt).toISOString();

  let matchedOrgId: string | null = null;

  if (orgName) {
    const { data: nameMatch } = await admin
      .from("organizations")
      .select("id")
      .ilike("name", orgName)
      .eq("organization_type", "member")
      .limit(1)
      .maybeSingle();
    if (nameMatch?.id) matchedOrgId = nameMatch.id;
  }

  if (!matchedOrgId && contactEmail) {
    const domain = contactEmail.split("@")[1]?.toLowerCase();
    if (domain) {
      const { data: domainMatch } = await admin
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
    const paidDateOnly = paidAtIso.slice(0, 10);
    const { data: invoice } = await admin
      .from("invoices")
      .select("id")
      .eq("organization_id", matchedOrgId)
      .lte("period_start_date", paidDateOnly)
      .gte("period_end_date", paidDateOnly)
      .order("period_start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (invoice?.id) {
      await admin.from("invoices").update({
        status: "paid",
        paid_date: paidAtIso,
        payment_source: "medius-events",
        external_reference: stripeRef,
      }).eq("id", invoice.id);
      matchedInvoiceId = invoice.id;
    } else if (stripeRef) {
      const year = new Date(paidAtIso).getUTCFullYear();
      const { data: created } = await admin
        .from("invoices")
        .upsert(
          {
            organization_id: matchedOrgId,
            invoice_number: `MEDIUS-${stripeRef.slice(-12)}`,
            amount,
            status: "paid",
            invoice_date: paidAtIso.slice(0, 10),
            due_date: paidAtIso.slice(0, 10),
            paid_date: paidAtIso,
            period_start_date: `${year}-01-01`,
            period_end_date: `${year}-12-31`,
            payment_source: "medius-events",
            external_reference: stripeRef,
            notes: `Re-matched from Medius Events webhook`,
          },
          { onConflict: "payment_source,external_reference", ignoreDuplicates: false },
        )
        .select("id")
        .maybeSingle();
      matchedInvoiceId = created?.id ?? null;
    }
  }

  await admin
    .from("inbound_payment_notifications")
    .update({
      matched_organization_id: matchedOrgId,
      matched_invoice_id: matchedInvoiceId,
      status: matchedOrgId ? "processed" : "unmatched",
      error_message: null,
    })
    .eq("id", notif.id);

  return new Response(
    JSON.stringify({
      success: true,
      matched: !!matchedOrgId,
      organization_id: matchedOrgId,
      invoice_id: matchedInvoiceId,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
