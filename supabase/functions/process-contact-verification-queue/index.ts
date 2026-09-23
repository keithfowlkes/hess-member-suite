import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Max checks per run (runs every 5 minutes while the queue has work).
const MAX_PER_RUN = 3;
const MAX_ATTEMPTS = 3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const db = createClient(url, serviceKey);

  const { data: due, error } = await db
    .from("contact_verification_queue")
    .select("id, organization_id, attempts, queued_by")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for")
    .limit(MAX_PER_RUN);
  if (error) {
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }

  let processed = 0;
  for (const item of due || []) {
    const { data: org } = await db
      .from("organizations")
      .select("id, name, profiles:contact_person_id(first_name, last_name, primary_contact_title)")
      .eq("id", item.organization_id)
      .maybeSingle();
    const p: any = (org as any)?.profiles;
    if (!org || !p?.first_name || !p?.last_name) {
      await db.from("contact_verification_queue").delete().eq("id", item.id);
      continue;
    }

    const res = await fetch(`${url}/functions/v1/verify-contact-ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKey}`, apikey: anonKey },
      body: JSON.stringify({
        organizationName: org.name,
        firstName: p.first_name,
        lastName: p.last_name,
        title: p.primary_contact_title || null,
      }),
    });

    if (res.status === 429 || res.status === 402 || res.status === 403) {
      // AI limit reached: push all remaining work back by an hour and stop this run.
      const pushTo = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const { data: pending } = await db
        .from("contact_verification_queue")
        .select("id, scheduled_for")
        .eq("status", "pending");
      for (const row of pending || []) {
        if (new Date(row.scheduled_for) < new Date(pushTo)) {
          await db.from("contact_verification_queue")
            .update({ scheduled_for: pushTo, last_error: `AI limit (${res.status}), delayed`, updated_at: new Date().toISOString() })
            .eq("id", row.id);
        }
      }
      break;
    }

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      const attempts = item.attempts + 1;
      await db.from("contact_verification_queue").update({
        attempts,
        status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
        scheduled_for: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        last_error: data?.error || `HTTP ${res.status}`,
        updated_at: new Date().toISOString(),
      }).eq("id", item.id);
      continue;
    }

    const s = data.structured || {};
    let status = (s.verificationStatus || "UNKNOWN").toUpperCase();
    let contactTitle = p.primary_contact_title || null;
    let notes = s.notes || null;
    const ft = (s.foundTitle || "").trim();
    const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, "");
    if ((status === "VERIFIED" || status === "LIKELY") && ft && !/^not found$/i.test(ft) && norm(ft) !== norm(contactTitle || "")) {
      await db.from("organizations").update({ primary_contact_title: ft }).eq("id", org.id);
      if (org.contact_person_id) await db.from("profiles").update({ primary_contact_title: ft }).eq("id", org.contact_person_id);
      notes = `Title updated from "${contactTitle || "(none)"}" to "${ft}". ${notes || ""}`.trim();
      contactTitle = ft;
      status = "VERIFIED";
    }
    await db.from("contact_verifications").upsert({
      organization_id: org.id,
      contact_name: `${p.first_name} ${p.last_name}`.trim(),
      contact_title: contactTitle,
      status,
      confidence: s.confidence || null,
      found_title: s.foundTitle || null,
      summary: s.summary || null,
      linkedin_url: s.linkedinUrl || null,
      institutional_url: s.institutionalUrl || null,
      notes,
      verified_by: item.queued_by,
      verified_at: new Date().toISOString(),
    }, { onConflict: "organization_id" });
    await db.from("contact_verification_queue").delete().eq("id", item.id);
    processed++;
  }

  // Switch the background job off once nothing is left to do.
  const { count } = await db
    .from("contact_verification_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (!count) await db.rpc("stop_contact_verification_job");

  return Response.json({ processed, remaining: count || 0 }, { headers: corsHeaders });
});
