# Fix Critical Security Findings

Goal: resolve every finding marked 🔴 Critical in the prior assessment, while preserving anonymous public-page access, authenticated member portal functionality, and admin/management workflows. Work proceeds in three batches ordered by breakage risk. After each batch we verify the three user tiers before moving on.

## Batch A — Edge function auth hardening (low breakage risk)

All of these endpoints are only invoked from the admin UI through `supabase.functions.invoke()`, which automatically forwards the caller's JWT. Adding a JWT + admin check is additive — no frontend code needs to change.

Functions to update (add `Authorization` validation via `supabase.auth.getClaims()` + `has_role(uid, 'admin')` check, return 401/403 on failure):

1. `cleanup-orphaned-records` — admin only
2. `delete-user` — admin only
3. `import-members` — admin only
4. `change-user-password` — admin OR self (caller `sub` === target `userId`)
5. `delete-organization` — admin only; ignore body `adminUserId`, derive from JWT
6. `approve-pending-registration` — admin only; ignore body `adminUserId`
7. `unapprove-organization` — admin only; ignore body `adminUserId`
8. `bulk-registration-operations` — remove `if (adminUserId)` guard; always require admin JWT
9. `approve-reassignment-request` — same fix as above
10. `send-invoice` — admin only; also validate `organizationId` exists and `invoiceAmount` is a positive number

### Verification after Batch A
- **Anonymous users:** still able to load `/auth`, public directory, public map, registration form (none of these call the above functions).
- **Authenticated members:** still able to view profile, request profile edits, view invoices (no member-facing call sites).
- **Admins:** test from preview as logged-in admin — approve a pending registration, send a test invoice, change a user's password, delete a test user, run bulk operations. All should succeed.
- Tool: `supabase--curl_edge_functions` against each function with and without auth to confirm 401 unauth and 200 as admin.

## Batch B — Centralized email delivery (medium breakage risk)

The pre-login flows (password reset, registration welcome, approval notification) legitimately call email endpoints without a session, so we cannot simply require a JWT on `-public`.

1. `centralized-email-delivery` (authenticated variant): require JWT, any authenticated user OK (used by admin tools and member self-service like update requests). No allowlist needed.
2. `centralized-email-delivery-public`:
   - Restrict the `type` field to a hard allowlist: `password_reset`, `registration_welcome`, `registration_received`, `approval_notification` (audit current call sites and finalize the list before edit).
   - Reject the `custom` template type and reject any `attachments` field.
   - Resolve recipient + template server-side from `system_settings` instead of trusting the body where possible.
   - Add per-IP rate limit (simple in-memory token bucket, with a warning comment that production should move to Redis/DB).

### Verification after Batch B
- **Anonymous users:** trigger password reset from `/auth`, complete a new registration, confirm welcome + admin-notification emails still arrive.
- **Authenticated members:** trigger a profile update request → admin notification email still sent.
- **Admins:** approve a registration → applicant receives approval email; send invoice → recipient gets invoice email.
- Check `email_logs` table and Resend dashboard to confirm deliveries.

## Batch C — Database & Realtime exposure (mixed risk)

C1. **Remove `database_backups` from Realtime publication** (zero breakage — nothing subscribes to it).
```sql
ALTER PUBLICATION supabase_realtime DROP TABLE public.database_backups;
```

C2. **`pending_registrations` — drop from Realtime publication** so password_hash + PII no longer broadcast. Admin UI fetches this table via normal queries; no live subscription is needed.

C3. **`organizations` anon column restriction** — current anon SELECT policy returns all columns including secondary contact PII. Replace with a column-scoped policy: anon can read only `name, city, state, website, organization_type, membership_status`. The existing `public_organization_directory` view (SECURITY DEFINER) continues to serve the public directory page, so anonymous users see no visible change. Authenticated members keep full access via the existing member policy.

C4. **`profiles` PII tightening** — this is the highest-risk change because the consortium portal is *designed* to let members see each other's contact info (per memory `intentional-access-design-choices`). Plan:
   - Keep current "authenticated members can view all profiles" policy in place (it is intentional per project knowledge).
   - Mark the scanner finding as `ignore` via `manage_security_finding` with explanation referencing the consortium directory purpose.
   - Update `mem://security/intentional-access-design-choices` and security memory to document this decision.
   - **No code change** — this preserves the member portal's core value.

C5. **`pending_registrations.password_hash` column** — keep for now. Removing it requires rebuilding the approval flow (per memory `planned-password-encryption-hardening`), which is explicitly out-of-scope for a "critical-only, no-breakage" pass. Mark this finding as acknowledged-deferred in security memory, not ignored.

C6. **Realtime channel authorization (`realtime.messages` RLS)** — the app uses Realtime for member analytics and registration update notifications. A blanket RLS policy could silently break those. We'll address by:
   - Removing the most sensitive tables from the publication: `database_backups` (C1), `pending_registrations` (C2), `audit_log`, `email_logs`, `inbound_payment_notifications`. None of these have live subscriptions in the frontend (verify via codebase search before drop).
   - Leaving `realtime.messages` RLS for a follow-up pass once we map exact channel usage. Document as deferred.

### Verification after Batch C
- **Anonymous users:** load public directory + public map → still see org names, locations, websites. Confirm no contact email/phone leaks via direct REST call to `/rest/v1/organizations`.
- **Authenticated members:** member directory still shows other members' contact info; analytics charts still update.
- **Admins:** registration approval queue, member analytics live updates, payment notifications still work.

## Out of scope (deferred, documented in security memory)

- `profiles` PII gating (intentional consortium feature)
- `pending_registrations.password_hash` removal (requires invitation-flow redesign)
- Full `realtime.messages` RLS (requires channel-by-channel mapping)
- All 🟡 Medium/Low warnings (XSS sanitization, TinyMCE key, Postgres upgrade, etc.) — separate pass

## Technical notes

- Standard auth pattern for each edge function:
  ```typescript
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({error:'Unauthorized'}), {status:401, headers: corsHeaders});
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: claims } = await supabase.auth.getClaims(authHeader.replace('Bearer ',''));
  if (!claims?.claims?.sub) return new Response(JSON.stringify({error:'Unauthorized'}), {status:401, headers: corsHeaders});
  const { data: isAdmin } = await supabaseAdmin.rpc('has_role', { _user_id: claims.claims.sub, _role: 'admin' });
  if (!isAdmin) return new Response(JSON.stringify({error:'Forbidden'}), {status:403, headers: corsHeaders});
  ```
- Service-role client (`supabaseAdmin`) is still used internally for the actual DB writes after authorization passes.
- Migration for Batch C uses `ALTER PUBLICATION` and `DROP POLICY` / `CREATE POLICY` only — no table schema changes, no data loss.
- After each batch, run `supabase--curl_edge_functions` smoke tests and check edge function logs.
