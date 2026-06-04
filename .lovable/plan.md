# Plan: receive-registration-redemption Edge Function

Create an inbound webhook the Conference Hub calls when an attendee completes registration with a HESS conference code.

## Endpoint
`POST https://tyovnvuluyosjnabrzjc.supabase.co/functions/v1/receive-registration-redemption`

`verify_jwt = false` (external webhook). Auth via shared secret `MEDIUS_EVENTS_WEBHOOK_SECRET` already configured.

## Request contract
Headers:
- `x-webhook-secret: <MEDIUS_EVENTS_WEBHOOK_SECRET>` (required)
- `Content-Type: application/json`

Body (validated with Zod):
```json
{
  "registration_code": "HESS2026-XXXXXXXX",
  "attendee_email": "person@school.edu",
  "attendee_name": "Jane Doe",
  "attendee_title": "Director of IT",        // optional
  "redeemed_at": "2026-06-04T17:00:00Z",     // optional, defaults to now()
  "conference_registration_id": "abc-123"     // optional, external ref
}
```

## Behavior
1. Reject non-POST with 405.
2. Validate shared secret header → 401 if missing/wrong.
3. Parse + Zod-validate body → 400 with field errors on failure.
4. Look up code in `conference_registration_codes` (case-insensitive on `code`).
   - Not found → 404 `{ error: "code_not_found" }`.
5. If already redeemed (`redeemed_at IS NOT NULL`) and the incoming `attendee_email` differs → 409 `{ error: "code_already_redeemed", redeemed_attendee_email }` (enforces the 1-attendee-per-org rule).
   - If same email, treat as idempotent success (return current record).
6. Update row with `redeemed_at`, `redeemed_attendee_email`, `redeemed_attendee_name`, `redeemed_attendee_title`, `conference_registration_id`, `status = 'redeemed'`, `updated_at = now()`.
7. Write an `audit_log` entry (`action='conference_code_redeemed'`, `entity_type='conference_registration_codes'`, details with org_id + attendee email).
8. Return 200 `{ success: true, organization_id, organization_name, redeemed_at }`.
9. CORS headers on every response (incl. OPTIONS preflight).

## Files
- **Create** `supabase/functions/receive-registration-redemption/index.ts`
- **Edit** `supabase/config.toml` — add `[functions.receive-registration-redemption] verify_jwt = false`

No DB migration required — the `conference_registration_codes` table already has the columns (`redeemed_at`, `redeemed_attendee_email`, `redeemed_attendee_name`, `status`). I will confirm `redeemed_attendee_title` and `conference_registration_id` exist when implementing; if missing, I'll add a small migration with those nullable columns + grants.

## Post-deploy
Provide the URL + `x-webhook-secret` header instruction to the Conference Hub team. No frontend changes; the dashboard's existing `useConferenceRegistrationCode` hook will automatically display the "Redeemed by…" status once the row updates.
