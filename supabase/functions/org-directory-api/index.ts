import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const csv = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: { ...corsHeaders, "Content-Type": "text/csv; charset=utf-8" },
  });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Escape a value for CSV output (RFC 4180). */
function csvCell(value: string): string {
  const v = value ?? "";
  if (/[",\n\r]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const url = new URL(req.url);
  let key = req.headers.get("x-api-key") ?? url.searchParams.get("key") ?? "";
  if (!key && req.method === "POST") {
    try {
      const body = await req.json();
      key = typeof body?.key === "string" ? body.key : "";
    } catch {
      // ignore
    }
  }
  key = key.trim();

  if (!key) {
    return json({ error: "Missing API key" }, 401);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const keyHash = await sha256Hex(key);
  const { data: keyRow, error: keyError } = await admin
    .from("external_api_keys")
    .select("id, is_active, api_type, request_count")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (keyError) {
    console.error("api key lookup error", keyError);
    return json({ error: "Key validation failed" }, 500);
  }
  if (!keyRow || !keyRow.is_active) {
    return json({ error: "Invalid or inactive API key" }, 401);
  }

  const { data, error } = await admin
    .from("organizations")
    .select("id, name, city, state, zip_code")
    .eq("membership_status", "active")
    .eq("organization_type", "member")
    .order("name", { ascending: true });

  if (error) {
    console.error("org-directory-api query error", error);
    return json({ error: error.message }, 500);
  }

  await admin
    .from("external_api_keys")
    .update({
      last_used_at: new Date().toISOString(),
      request_count: (keyRow.request_count ?? 0) + 1,
    })
    .eq("id", keyRow.id);

  const rows = (data ?? []).map((o) => [
    csvCell(o.id ?? ""),
    csvCell(o.name ?? ""),
    csvCell(o.city ?? ""),
    csvCell(o.state ?? ""),
    csvCell(o.zip_code ?? ""),
  ].join(","));

  const csvBody = ["organization_id,organization,city,state,zip", ...rows].join("\n");

  return csv(csvBody);
});
