import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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

  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await admin
    .from("organizations")
    .select("id, name, email, website, city, state, zip_code")
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
    city: o.city ?? "",
    state: o.state ?? "",
    zip_code: o.zip_code ?? "",
  }));

  return json({ institutions });
});
