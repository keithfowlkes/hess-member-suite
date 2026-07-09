import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Crockford-base32-ish, ambiguous chars removed
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(prefix: string, length = 8): string {
  let out = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `${prefix}-${out}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const {
      invoice_id,
      organization_id,
      conference_slug = "hess2026",
    } = body ?? {};

    if (!organization_id) {
      return json(
        { success: false, error: "organization_id is required" },
        400,
      );
    }

    // Feature flag
    const { data: flag } = await admin
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "conference_hub_registration_codes_enabled")
      .maybeSingle();
    if (!flag || flag.setting_value !== "true") {
      return json({
        success: true,
        skipped: true,
        reason: "Registration codes disabled",
      });
    }

    // Org name
    const { data: org, error: orgErr } = await admin
      .from("organizations")
      .select("id, name")
      .eq("id", organization_id)
      .maybeSingle();
    if (orgErr || !org) {
      return json({ success: false, error: "Organization not found" }, 404);
    }

    // Idempotent: re-use existing code if present
    const { data: existing } = await admin
      .from("conference_registration_codes")
      .select("*")
      .eq("organization_id", organization_id)
      .eq("conference_slug", conference_slug)
      .maybeSingle();

    let row = existing;
    if (!row) {
      const prefix = conference_slug.toUpperCase().replace(/[^A-Z0-9]/g, "");
      // Collision-safe insert with a few retries
      for (let attempt = 0; attempt < 5 && !row; attempt++) {
        const code = generateCode(prefix);
        const { data, error } = await admin
          .from("conference_registration_codes")
          .insert({
            organization_id,
            conference_slug,
            code,
            invoice_id: invoice_id ?? null,
            sent_status: "pending",
          })
          .select("*")
          .maybeSingle();
        if (!error && data) {
          row = data;
          break;
        }
        if (error && !`${error.message}`.toLowerCase().includes("unique")) {
          console.error("issue-conference-registration-code insert error", error);
          return json({ success: false, error: error.message }, 500);
        }
      }
      if (!row) {
        return json(
          { success: false, error: "Could not generate unique code" },
          500,
        );
      }
    }

    // Look up Conference Hub app
    const { data: app } = await admin
      .from("external_applications")
      .select("id, app_url, is_active")
      .eq("app_identifier", "conference-hub")
      .eq("is_active", true)
      .maybeSingle();

    if (!app) {
      await admin
        .from("conference_registration_codes")
        .update({
          sent_status: "failed",
          send_error: "Conference Hub app not configured",
        })
        .eq("id", row.id);
      return json({
        success: true,
        code: row.code,
        delivered: false,
        reason: "Conference Hub app not configured",
      });
    }

    const webhookUrl = `${app.app_url.replace(/\/$/, "")}/functions/v1/receive-registration-code`;
    const payload = {
      source: "hess-member-portal",
      event: "registration_code_issued",
      timestamp: new Date().toISOString(),
      data: {
        conference_slug,
        organization_id: org.id,
        organization_name: org.name,
        registration_code: row.code,
        issued_at: row.issued_at,
        max_attendees: 1,
      },
    };

    try {
      // Outbound auth to Conference Hub uses the portal's outbound webhook
      // secret. MEDIUS_EVENTS_WEBHOOK_SECRET is the INBOUND secret used to
      // verify payment webhooks coming INTO the portal — using it here caused
      // HTTP 401 Unauthorized responses from Conference Hub.
      const webhookSecret =
        Deno.env.get("HESS_MEMBER_PORTAL_WEBHOOK_SECRET") ??
        Deno.env.get("MEDIUS_EVENTS_WEBHOOK_SECRET") ??
        "";
      const secretFingerprint = webhookSecret
        ? `len=${webhookSecret.length} prefix=${webhookSecret.slice(0, 12)} suffix=${webhookSecret.slice(-6)}`
        : "MISSING";
      console.log("Conference Hub request:", JSON.stringify({
        url: webhookUrl,
        headerNames: ["Content-Type", "X-Source", "X-Event", "X-Webhook-Secret"],
        secretFingerprint,
        code: row.code,
      }));
      const resp = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Source": "hess-member-portal",
          "X-Event": "registration_code_issued",
          "X-Webhook-Secret": webhookSecret,
        },
        body: JSON.stringify(payload),
      });
      const txt = await resp.text();
      console.log("Conference Hub response:", resp.status, txt);

      await admin
        .from("conference_registration_codes")
        .update({
          sent_status: resp.ok ? "sent" : "failed",
          sent_to_conference_at: resp.ok ? new Date().toISOString() : null,
          send_error: resp.ok ? null : `HTTP ${resp.status}: ${txt}`.slice(0, 500),
        })
        .eq("id", row.id);

      await admin.from("external_app_access_log").insert({
        app_id: app.id,
        action: resp.ok
          ? "registration_code_sent"
          : "registration_code_send_failed",
        scopes_requested: ["registration_codes:issue"],
        ip_address: "server",
        user_agent: "hess-registration-code-issuer",
      });

      return json({
        success: resp.ok,
        code: row.code,
        delivered: resp.ok,
        status_code: resp.status,
      });
    } catch (fetchErr: any) {
      await admin
        .from("conference_registration_codes")
        .update({
          sent_status: "failed",
          send_error: `Fetch error: ${fetchErr.message}`.slice(0, 500),
        })
        .eq("id", row.id);
      return json({
        success: false,
        code: row.code,
        delivered: false,
        error: fetchErr.message,
      });
    }
  } catch (err: any) {
    console.error("issue-conference-registration-code error", err);
    return json({ success: false, error: err.message }, 500);
  }
});
