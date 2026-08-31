import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_GUIDE = `
HESS CONSORTIUM MEMBER PORTAL — ADMIN & MEMBER FUNCTIONALITY GUIDE

PURPOSE
A member information portal for a consortium of private colleges and universities. Members share
institutional profile data (systems in use, contacts, enrollment) with each other. All institutional
information is confidential to member institutions; a Confidentiality Agreement modal appears at every login
(Agree continues; Decline signs the user out).

ROLES
- superadmin / admin: full access to the admin panel (Master Dashboard, Members, Membership Fees, Settings, etc.).
- cohort_leader: member with extra visibility (e.g. CSV export of institutions inside analytics modals).
- member (primary contact): owns their organization record, invoices, and colleague invitations.
- guest/colleague: an invited user from the same email domain as the primary contact. Shown with a "Guest" badge
  in Master Dashboard -> Users. Permissions such as "can edit organization" are granted by the primary contact.

ADMIN NAVIGATION (left sidebar)
1. Master Dashboard (/dashboard)
   - Overview: key metrics, System Status block (service health accordions with diagnostics and a "Retry all" button),
     Projected Annual Revenue Breakdown modal (includes revenue collected to date), Latest Logins modal.
   - Organizations: pending approvals, member info update requests, sub-tabs Approvals and Organization Invitations
     (colleague invitations with the inviting organization listed).
   - Recent Submissions: newest member-submitted profile updates awaiting review.
   - Users: all portal users; invited colleagues carry a "Guest" badge; admin password management is here.
   - Backup/Restore: database backup and restore utilities.
2. Member Organizations (/members)
   - Full searchable list of member institutions (official active member count is 524: organization_type='member'
     AND membership_status='active'). Open an organization for the comprehensive detail dialog: profile fields,
     systems (SIS, LMS, ERP/finance, HCM/HR, payroll, CRM), contacts, CRM communications tab with follow-ups,
     transfer of primary contact, import/export, and AI contact verification (Tavily + AI, prioritizes .edu and
     LinkedIn sources; treats aggregator "former" tags as UNCONFIRMED).
3. User Messages (/user-messages): messages/questions submitted by members.
4. Cohort Information: professional cohorts, cohort leaders, Simplelists listserv mappings.
5. Member Analytics (/dashboards): system usage analytics, enrollment trends, correlations. Institution modals
   list institutions per system and allow admins/cohort leaders to export the list (with contacts) to CSV.
6. Member Security (/admin-security): Arctic Security Assessment (live feed from the Arctic API synced by the
   sync-arctic-scan edge function on a pg_cron schedule) plus DeepSeas Dark Web Services (admin-only; hidden from
   members). Includes urgency distribution charts, sortable organization tables, and a "Preview member view"
   selector to see exactly what a chosen organization sees. Arctic pricing requests submitted by members are
   tracked in the admin pricing requests panel and emailed to admins.
7. Surveys (/admin/surveys): create/edit surveys, view real-time charts and responses.
8. Membership Fees (/membership-fees) tabs:
   - Overview: revenue and fee statistics with drill-down modals.
   - Invoices: generate, send, resend, view, and download invoices. The invoice detail modal has a Forward button
     (send the invoice PDF to any email with a persistent custom comment) and a "Payment method" segmented control:
     Credit card shows the $309.27 total plus the Pay Online button; ACH/Check removes the $9.27 processing fee
     ($300.00) and hides the Pay Online button. There is also a "Refresh invoices" button.
   - Fee Management / Prorated Fees: default fee amount ($309.27), tiers, add-fee and no-fee options.
   - Spreadsheet: table plus Excel export including primary contact name and Financial, Financial Aid, HCM/HR and
     Payroll system columns.
   - Testing: email/invoice test utilities.
   Current membership term: July 30, 2026 – July 30, 2027 (centralized in src/utils/invoicePeriod.ts).
   Invoices include HESS ACH payment information (account 837993307, routing 083000137) and a W-9 download link.
9. Organization Profile (/profile), Settings (/settings): public pages (directory, map, logo, auth page fields),
   email delivery (Resend config, templates, designs, scheduled batches), system messages, invoice template editor,
   member agreement editor, integrations (Simplelists, Conference Hub, Medius Events inbound payments),
   Data API Keys, orphaned profile management, data integrity checks, normalization utilities, Stripe settings.
10. External Applications (/admin/external-apps) and Inbound Payments (/admin/inbound-payments).

DATA API KEYS (Settings -> Integrations -> Data API Keys)
Admins create named keys for external apps. Click a key name to open a detail modal showing description, API type,
the plaintext secret key, the ready-to-use URL, status, and request count. The Basic Organization Information feed
(org-directory-api edge function) returns live CSV: organization_id,organization,city,state,zip for active members.
Keys can be revoked. There is also a public list-member-institutions endpoint on the Supabase functions domain.

MEMBER PORTAL
- Dashboard: "Keep Your Profile Current" block (edit organization profile, invite colleagues, "View Organization
  Access" modal listing invited users, their status, delete, and the can-edit-organization permission toggle),
  membership fee/dues block, system messages, questions & feedback.
- HESS Member Information / Member Analytics / Member Map / Surveys / Your Cohort Information.
- Member Security: Arctic Security Assessment scoped by RLS to the user's own organization only, with urgency KPI
  tiles, distribution table, category/urgency donut charts, last scan date/time, and a "Get Full Arctic Security
  Pricing" button opening a pre-populated request form.
- My Invoices: invoice detail modal with PDF download, print, payment-method toggle, Pay Online (credit card mode),
  and Forward (primary contacts only) to send the invoice with a custom comment.

AUTH
Login errors distinguish "Account Not Found" (with guidance that the user may not be the primary contact and should
use the "Current Member Updates" tab on the auth page) from "Password Incorrect". Login lockout is 15 minutes after
repeated failures with a countdown. Password resets use Supabase auth user_id and handle orphaned profiles.

ANSWERING RULES
- Answer only about this portal. If asked something unrelated or something you don't find in this guide, say so and
  suggest where in the admin UI the user might look, or to contact the portal developer.
- Give short, numbered click-paths (e.g. "Admin Panel -> Membership Fees -> Invoices tab -> open the invoice ->
  Forward").
- Never invent features, URLs, secrets, keys, or member data. You have no access to live database records.
- Be concise: usually under 200 words unless the user asks for detail.
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);

    const isAdmin = (roles ?? []).some((r: { role: string }) =>
      r.role === "admin" || r.role === "superadmin"
    );
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
    const messages = rawMessages
      .filter((m: any) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
      .slice(-16)
      .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentPage = typeof body?.currentPage === "string" ? body.currentPage.slice(0, 200) : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        stream: true,
        messages: [
          {
            role: "system",
            content:
              `You are the HESS Consortium Portal Help Assistant for portal administrators. Use ONLY the guide below.\n${APP_GUIDE}\n` +
              (currentPage ? `\nThe admin is currently on the route: ${currentPage}.` : ""),
          },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error", response.status, errText);
      const status = response.status === 429 || response.status === 402 ? response.status : 500;
      const error = response.status === 429
        ? "Rate limit reached. Please try again shortly."
        : response.status === 402
        ? "AI credits exhausted. Please add credits to continue."
        : "AI request failed.";
      return new Response(JSON.stringify({ error }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("admin-help-assistant error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
