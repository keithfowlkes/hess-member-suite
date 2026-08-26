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
      const row = (label: string, value: string) => value.trim() ? `
              <tr>
                <td style="padding:10px 16px;border-bottom:1px solid #eef1f5;font-size:13px;color:#64748b;width:38%;vertical-align:top;">${label}</td>
                <td style="padding:10px 16px;border-bottom:1px solid #eef1f5;font-size:14px;color:#0f172a;font-weight:600;">${value}</td>
              </tr>` : "";
      const addr = [esc(record.address_line_1), esc(record.address_line_2)].filter(Boolean).join(" ").trim();
      const cityLine = [esc(record.city), [esc(record.state), esc(record.zip_code)].filter(Boolean).join(" ")].filter(Boolean).join(", ").trim();
      const fullAddress = [addr, cityLine].filter(Boolean).join("<br>");
      const html = `
        <div style="background:#f4f6f9;padding:28px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
          <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(15,23,42,0.08);">
            <div style="background:#0c2340;padding:24px 28px;text-align:center;">
              <img src="https://members.hessconsortium.app/__l5e/assets-v1/deb5bca1-f67d-48c4-b698-3d443b4e009a/HESSlogoMasterFLAT_white.png" alt="HESS Consortium" width="180" style="max-width:180px;height:auto;display:inline-block;" />
            </div>
            <div style="padding:28px;">
              <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#2563eb;font-weight:700;">Arctic Security</p>
              <h1 style="margin:0 0 10px;font-size:22px;line-height:1.3;color:#0f172a;">New Pricing Request</h1>
              <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#475569;">A HESS member has requested pricing information for Arctic Security services.</p>
              <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #eef1f5;border-radius:8px;overflow:hidden;">
                ${row("Institution", esc(record.organization_name))}
                ${row("Contact", esc(record.contact_name))}
                ${row("Email", `<a href="mailto:${esc(record.contact_email)}" style="color:#2563eb;text-decoration:none;">${esc(record.contact_email)}</a>`)}
                ${row("Phone", esc(record.contact_phone))}
                ${row("Address", fullAddress)}
                ${row("Notes", esc(record.notes))}
              </table>
              <p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.6;">
                Submitted ${new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "America/New_York" })} ET.<br>
                This request is tracked in the Arctic Security admin panel.
              </p>
            </div>
            <div style="background:#f8fafc;padding:16px 28px;text-align:center;border-top:1px solid #eef1f5;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">HESS Consortium Member Portal</p>
            </div>
          </div>
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
