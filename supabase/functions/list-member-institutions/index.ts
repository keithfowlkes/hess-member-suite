import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Optional body — accepted for forward-compat, ignored today.
const BodySchema = z.object({}).passthrough().optional();

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function extractDomain(org: { email?: string | null; website?: string | null; name: string }): string {
  const email = (org.email ?? "").trim();
  if (email.includes("@")) {
    const d = email.split("@").pop()!.toLowerCase().trim();
    if (d) return d;
  }
  const site = (org.website ?? "").trim();
  if (site) {
    try {
      const u = new URL(site.startsWith("http") ? site : `https://${site}`);
      return u.hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      // fall through
    }
  }
  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const expected = Deno.env.get("HESS_MEMBER_PORTAL_WEBHOOK_SECRET") ?? "";
  const provided = req.headers.get("x-internal-secret") ?? "";
  if (!expected || !provided || !timingSafeEqual(expected, provided)) {
    return json({ error: "Unauthorized" }, 401);
  }

  // Best-effort body parse (not required)
  try {
    if (req.headers.get("content-length") && req.headers.get("content-length") !== "0") {
      const raw = await req.json().catch(() => ({}));
      const parsed = BodySchema.safeParse(raw);
      if (!parsed.success) {
        return json({ error: parsed.error.flatten().fieldErrors }, 400);
      }
    }
  } catch {
    // ignore
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await admin
    .from("organizations")
    .select("id, name, email, website")
    .eq("membership_status", "active")
    .eq("organization_type", "member")
    .order("name", { ascending: true });

  if (error) {
    console.error("list-member-institutions query error", error);
    return json({ error: error.message }, 500);
  }

  const institutions = (data ?? []).map((o) => ({
    id: o.id,
    name: o.name,
    email_domain: extractDomain(o),
  }));

  return json({ institutions });
});
