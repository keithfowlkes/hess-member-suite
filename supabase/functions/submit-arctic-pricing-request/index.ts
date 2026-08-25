import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getServiceClient, requireAuthenticatedUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  organization_id?: string | null;
  organization_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  wants_pricing_info: boolean;
  notes?: string;
}

function clean(v: unknown, max = 300): string {
  return String(v ?? "").trim().slice(0, max);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireAuthenticatedUser(req);
    if (auth instanceof Response) return auth;

    const body = (await req.json()) as Payload;

    const organization_name = clean(body.organization_name);
    const contact_name = clean(body.contact_name, 150);
    const contact_email = clean(body.contact_email, 255).toLowerCase();

    if (!organization_name || !contact_name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)) {
      return new Response(JSON.stringify({ error: "Name, organization and a valid email are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!body.wants_pricing_info) {
      return new Response(JSON.stringify({ error: "Please confirm you would like pricing information" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const service = getServiceClient();

    // Recipients
    const { data: setting } = await service
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "arctic_pricing_notification_emails")
      .maybeSingle();

    const recipients = String(setting?.setting_value || "info@hessconsortium.org")
      .split(",")
      .map((e) => e.trim())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    const record = {
      user_id: auth.userId,
      organization_id: body.organization_id || null,
      organization_name,
      contact_name,
      contact_email,
      contact_phone: clean(body.contact_phone, 50) || null,
      address_line_1: clean(body.address_line_1) || null,
      address_line_2: clean(body.address_line_2) || null,
      city: clean(body.city, 120) || null,
      state: clean(body.state, 80) || null,
      zip_code: clean(body.zip_code, 20) || null,
      wants_pricing_info: true,
      notes: clean(body.notes, 2000) || null,
      notified_emails: recipients,
    };

    const { data: inserted, error } = await service
      .from("arctic_pricing_requests")
      .insert(record)
      .select("id")
      .single();

    if (error) {
      console.error("Insert failed:", error);
      return new Response(JSON.stringify({ error: "Failed to save request" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let emailed = false;
    if (recipients.length > 0) {
      const esc = (s: string | null) =>
        String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Arctic Security Pricing Request</h2>
          <p>A HESS member has requested pricing information for Arctic Security services.</p>
          <table cellpadding="6" style="border-collapse: collapse; font-size: 14px;">
            <tr><td><strong>Institution</strong></td><td>${esc(record.organization_name)}</td></tr>
            <tr><td><strong>Contact</strong></td><td>${esc(record.contact_name)}</td></tr>
            <tr><td><strong>Email</strong></td><td>${esc(record.contact_email)}</td></tr>
            <tr><td><strong>Phone</strong></td><td>${esc(record.contact_phone)}</td></tr>
            <tr><td><strong>Address</strong></td><td>${esc(record.address_line_1)} ${esc(record.address_line_2)}<br>${esc(record.city)}, ${esc(record.state)} ${esc(record.zip_code)}</td></tr>
            <tr><td><strong>Notes</strong></td><td>${esc(record.notes)}</td></tr>
          </table>
          <p style="font-size:13px;color:#666;">Submitted ${new Date().toLocaleString("en-US")}. Tracked in the Arctic Security admin panel.</p>
        </div>`;

      const { error: emailError } = await service.functions.invoke("centralized-email-delivery", {
        body: {
          type: "custom",
          to: recipients,
          subject: `Arctic Security Pricing Request - ${record.organization_name}`,
          template: html,
        },
      });
      if (emailError) console.error("Notification email failed:", emailError);
      else emailed = true;
    }

    return new Response(JSON.stringify({ success: true, id: inserted.id, emailed, recipients }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    console.error("submit-arctic-pricing-request error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
