// Sends a "Paid" receipt email containing the invoice rendered with a PAID
// stamp and paid-on date. Invoked from stripe-webhook and from the
// get-stripe-session-status fallback as soon as an invoice is confirmed paid.
//
// Idempotent: an audit_log entry `paid_invoice_receipt_sent` is written and
// re-sends are skipped for the same invoice unless `force: true`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildInvoiceEmailHtml } from "../_shared/invoice-html.ts";

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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const invoiceId = String(body?.invoiceId ?? body?.invoice_id ?? "");
    const force = body?.force === true;
    if (!invoiceId) return json({ error: "invoiceId required" }, 400);

    // Load invoice + organization (incl. primary contact email)
    const { data: invoice, error: invErr } = await admin
      .from("invoices")
      .select(
        `
        id, invoice_number, invoice_date, due_date,
        period_start_date, period_end_date,
        amount, prorated_amount, notes, status, paid_date,
        organization_id,
        organizations:organization_id (
          id, name, email,
          contact_person:contact_person_id ( email, first_name, last_name )
        )
      `,
      )
      .eq("id", invoiceId)
      .maybeSingle();

    if (invErr || !invoice) {
      console.error("send-paid-invoice-receipt: invoice not found", invErr);
      return json({ error: "invoice not found" }, 404);
    }
    if (invoice.status !== "paid") {
      return json({ error: "invoice is not paid" }, 409);
    }

    const org = (invoice as any).organizations;
    if (!org) return json({ error: "organization missing" }, 422);

    // De-dupe by audit log unless force=true
    if (!force) {
      const { data: alreadySent } = await admin
        .from("audit_log")
        .select("id")
        .eq("entity_type", "invoice")
        .eq("entity_id", invoiceId)
        .eq("action", "paid_invoice_receipt_sent")
        .limit(1)
        .maybeSingle();
      if (alreadySent) {
        return json({ skipped: true, reason: "already_sent" });
      }
    }

    // Collect recipients: primary contact + organization email
    const recipients = new Set<string>();
    const contactEmail = org?.contact_person?.email as string | undefined;
    if (contactEmail) recipients.add(contactEmail);
    if (org.email) recipients.add(org.email);
    if (recipients.size === 0) {
      return json({ error: "no recipient email available" }, 422);
    }

    const paidDate = invoice.paid_date ?? new Date().toISOString();

    const html = buildInvoiceEmailHtml({
      invoiceNumber: invoice.invoice_number,
      invoiceId: invoice.id,
      invoiceDate: invoice.invoice_date,
      dueDate: invoice.due_date,
      periodStart: invoice.period_start_date,
      periodEnd: invoice.period_end_date,
      organizationName: org.name,
      organizationEmail: org.email,
      amount: Number(invoice.amount) || 0,
      proratedAmount: invoice.prorated_amount
        ? Number(invoice.prorated_amount)
        : null,
      notes: invoice.notes,
      paidDate,
    });

    const subject = `Payment Received — Invoice ${invoice.invoice_number} (PAID)`;

    const emailResp = await admin.functions.invoke(
      "centralized-email-delivery-public",
      {
        body: {
          type: "invoice",
          to: Array.from(recipients),
          subject,
          data: {
            organization_name: org.name,
            invoice_number: invoice.invoice_number,
            amount:
              (invoice.prorated_amount ?? invoice.amount)?.toString() ?? "0",
            due_date: invoice.due_date,
            invoice_content: html,
          },
        },
      },
    );

    if (emailResp.error) {
      console.error(
        "send-paid-invoice-receipt: delivery failed",
        emailResp.error,
      );
      return json(
        { error: `delivery failed: ${emailResp.error.message}` },
        500,
      );
    }

    await admin.from("audit_log").insert({
      action: "paid_invoice_receipt_sent",
      entity_type: "invoice",
      entity_id: invoiceId,
      details: {
        organization_id: org.id,
        organization_name: org.name,
        invoice_number: invoice.invoice_number,
        paid_date: paidDate,
        recipients: Array.from(recipients),
      },
    });

    return json({
      success: true,
      invoiceId,
      recipients: Array.from(recipients),
    });
  } catch (err: any) {
    console.error("send-paid-invoice-receipt error", err);
    return json({ error: err?.message ?? "Internal error" }, 500);
  }
});
