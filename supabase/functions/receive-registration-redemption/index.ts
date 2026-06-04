import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const BodySchema = z.object({
  registration_code: z.string().trim().min(4).max(64),
  attendee_email: z.string().trim().email().max(255),
  attendee_name: z.string().trim().min(1).max(255),
  attendee_title: z.string().trim().max(255).optional(),
  redeemed_at: z.string().datetime().optional(),
  conference_registration_id: z.string().trim().max(255).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const secret = Deno.env.get("MEDIUS_EVENTS_WEBHOOK_SECRET");
  const provided = req.headers.get("x-webhook-secret");
  if (!secret || !provided || provided !== secret) {
    return json(401, { error: "unauthorized" });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return json(400, { error: "validation_failed", details: parsed.error.flatten().fieldErrors });
  }
  const {
    registration_code,
    attendee_email,
    attendee_name,
    attendee_title,
    redeemed_at,
    conference_registration_id,
  } = parsed.data;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const codeUpper = registration_code.toUpperCase();
  const { data: record, error: lookupError } = await supabase
    .from("conference_registration_codes")
    .select(
      "id, organization_id, code, redeemed_at, redeemed_attendee_email, redeemed_attendee_name, organizations(name)"
    )
    .ilike("code", codeUpper)
    .maybeSingle();

  if (lookupError) {
    console.error("lookup error", lookupError);
    return json(500, { error: "lookup_failed" });
  }
  if (!record) return json(404, { error: "code_not_found" });

  const emailLower = attendee_email.toLowerCase();

  if (record.redeemed_at) {
    if ((record.redeemed_attendee_email ?? "").toLowerCase() === emailLower) {
      return json(200, {
        success: true,
        idempotent: true,
        organization_id: record.organization_id,
        organization_name: (record as any).organizations?.name ?? null,
        redeemed_at: record.redeemed_at,
      });
    }
    return json(409, {
      error: "code_already_redeemed",
      redeemed_attendee_email: record.redeemed_attendee_email,
      redeemed_at: record.redeemed_at,
    });
  }

  const redeemedAtIso = redeemed_at ?? new Date().toISOString();

  const { error: updateError } = await supabase
    .from("conference_registration_codes")
    .update({
      redeemed_at: redeemedAtIso,
      redeemed_attendee_email: attendee_email,
      redeemed_attendee_name: attendee_name,
      sent_status: "redeemed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", record.id);

  if (updateError) {
    console.error("update error", updateError);
    return json(500, { error: "update_failed" });
  }

  await supabase.from("audit_log").insert({
    action: "conference_code_redeemed",
    entity_type: "conference_registration_codes",
    entity_id: record.id,
    details: {
      organization_id: record.organization_id,
      code: record.code,
      attendee_email,
      attendee_name,
      attendee_title: attendee_title ?? null,
      conference_registration_id: conference_registration_id ?? null,
      redeemed_at: redeemedAtIso,
    },
  });

  return json(200, {
    success: true,
    organization_id: record.organization_id,
    organization_name: (record as any).organizations?.name ?? null,
    redeemed_at: redeemedAtIso,
  });
});
