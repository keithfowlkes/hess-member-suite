import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("MEDIUS_EVENTS_WEBHOOK_SECRET") ?? "";
const FN_URL = `${SUPABASE_URL}/functions/v1/receive-registration-redemption`;

if (!SERVICE_KEY || !WEBHOOK_SECRET) {
  console.warn(
    "[skip] Set SUPABASE_SERVICE_ROLE_KEY and MEDIUS_EVENTS_WEBHOOK_SECRET in .env to run integration tests."
  );
  Deno.exit(0);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY);


async function getOrgId(): Promise<string> {
  const { data, error } = await admin
    .from("organizations")
    .select("id")
    .eq("organization_type", "member")
    .limit(1)
    .single();
  if (error) throw error;
  return data.id;
}

async function seedCode(): Promise<{ id: string; code: string }> {
  const code = `HESS2026-TEST${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const organization_id = await getOrgId();
  const { data, error } = await admin
    .from("conference_registration_codes")
    .insert({
      code,
      organization_id,
      conference_slug: "hess2026",
      sent_status: "issued",
    })
    .select("id, code")
    .single();
  if (error) throw error;
  return data;
}

async function cleanup(id: string) {
  await admin.from("conference_registration_codes").delete().eq("id", id);
}

Deno.test("rejects without webhook secret", async () => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  await res.text();
  assertEquals(res.status, 401);
});

Deno.test("rejects invalid body", async () => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webhook-secret": WEBHOOK_SECRET,
    },
    body: JSON.stringify({ registration_code: "x" }),
  });
  await res.text();
  assertEquals(res.status, 400);
});

Deno.test("returns 404 for unknown code", async () => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webhook-secret": WEBHOOK_SECRET,
    },
    body: JSON.stringify({
      registration_code: "HESS2026-NOPENOPE",
      attendee_email: "nobody@example.edu",
      attendee_name: "Nobody",
    }),
  });
  await res.text();
  assertEquals(res.status, 404);
});

Deno.test("redeems a valid code and is idempotent; rejects second attendee", async () => {
  const seeded = await seedCode();
  try {
    // First redemption
    const res1 = await fetch(FN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        registration_code: seeded.code,
        attendee_email: "jane.doe@school.edu",
        attendee_name: "Jane Doe",
        attendee_title: "CIO",
      }),
    });
    const body1 = await res1.json();
    assertEquals(res1.status, 200);
    assertEquals(body1.success, true);

    // Verify DB row updated
    const { data: row } = await admin
      .from("conference_registration_codes")
      .select("redeemed_at, redeemed_attendee_email, redeemed_attendee_name, sent_status")
      .eq("id", seeded.id)
      .single();
    assertEquals(row?.redeemed_attendee_email, "jane.doe@school.edu");
    assertEquals(row?.redeemed_attendee_name, "Jane Doe");
    assertEquals(row?.sent_status, "redeemed");
    if (!row?.redeemed_at) throw new Error("redeemed_at not set");

    // Idempotent retry with same email
    const res2 = await fetch(FN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        registration_code: seeded.code,
        attendee_email: "jane.doe@school.edu",
        attendee_name: "Jane Doe",
      }),
    });
    const body2 = await res2.json();
    assertEquals(res2.status, 200);
    assertEquals(body2.idempotent, true);

    // Conflict with a different attendee
    const res3 = await fetch(FN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        registration_code: seeded.code,
        attendee_email: "other.person@school.edu",
        attendee_name: "Other Person",
      }),
    });
    await res3.text();
    assertEquals(res3.status, 409);
  } finally {
    await cleanup(seeded.id);
  }
});
