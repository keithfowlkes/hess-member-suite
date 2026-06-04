# Conference Registration Code on Membership Payment

## Goal

When an organization pays its membership fee, mint a unique conference registration code for that org and push it to the Conference Hub (`/hess2026` instance) via the existing API connection. The code entitles **one** attendee from that organization to register for the 2026 conference.

## Member-portal side (this codebase)

### 1. Database

New migration adds `public.conference_registration_codes`:

- `organization_id` (FK organizations)
- `conference_slug` text (default `'hess2026'`)
- `code` text unique (e.g. `HESS26-XXXXXX`, 8-char base32, collision-checked)
- `invoice_id` (FK invoices, nullable)
- `issued_at`, `sent_to_conference_at`, `sent_status` (`pending|sent|failed`), `send_error`
- `redeemed_at`, `redeemed_attendee_email`, `redeemed_attendee_name` (filled in by Conference Hub callback)
- Unique `(organization_id, conference_slug)` so paying twice doesn't issue a second code for the same conference
- RLS: admins full access; members `SELECT` only their own org's code; service_role full
- GRANTs for `authenticated` + `service_role` per project rules

### 2. Code generation + delivery

New edge function `issue-conference-registration-code`:

- Input: `{ invoice_id, organization_id, conference_slug? }`
- Idempotent: if a code already exists for that org+conference, reuse it
- Generates a readable code, inserts the row, then POSTs to Conference Hub at  
  `{app_url}/functions/v1/receive-registration-code` with payload:
  ```json
  {
    "source": "hess-member-portal",
    "event": "registration_code_issued",
    "data": {
      "conference_slug": "hess2026",
      "organization_id": "...",
      "organization_name": "...",
      "registration_code": "HESS26-AB12CD34",
      "issued_at": "...",
      "max_attendees": 1
    }
  }
  ```
- Updates `sent_status`/`sent_to_conference_at`; logs to `external_app_access_log` like the existing notifier

### 3. Trigger on payment

`supabase/functions/stripe-webhook/index.ts` already calls `notify-payment-status` when an invoice flips to paid. Add a sibling `admin.functions.invoke("issue-conference-registration-code", ...)` in the same block, gated by:

- Invoice is a membership fee (existing invoice metadata)
- A `system_settings` flag `conference_hub_registration_codes_enabled = 'true'` (default off until the Conference Hub endpoint is live)

Also wire it into the two manual paid-mark paths already invoking `notify-payment-status` (`src/pages/MembershipFees.tsx` and `src/hooks/useInvoices.tsx`) so admin-marked-paid invoices behave the same.

### 4. Member-facing surface (minimal)

On the Membership Fees page, after payment, show the org's conference code with copy button and a short note: "Share this code with the one attendee from your institution registering for HESS 2026."

### 5. Optional inbound callback

Add `receive-registration-redemption` edge function so Conference Hub can call back when the code is used, updating `redeemed_at` / attendee info. Signed with `MEDIUS_EVENTS_WEBHOOK_SECRET` style HMAC.

---

## Prompt to paste into the Conference Hub project (the /hess2026 side)

> We have an existing payment-status webhook from the HESS Member Portal. Add a second inbound endpoint and use it to gate conference registration so **each member organization gets exactly one attendee seat for the 2026 conference**.
>
> **1. New inbound edge function `receive-registration-code`**
>
> - Path: `/functions/v1/receive-registration-code`
> - Auth: verify `X-Source: hess-member-portal` header and shared-secret HMAC (env var `HESS_PORTAL_WEBHOOK_SECRET`)
> - Payload:
>   ```json
>   {
>     "source": "hess-member-portal",
>     "event": "registration_code_issued",
>     "data": {
>       "conference_slug": "hess2026",
>       "organization_id": "uuid",
>       "organization_name": "string",
>       "registration_code": "HESS26-XXXXXXXX",
>       "issued_at": "iso8601",
>       "max_attendees": 1
>     }
>   }
>   ```
> - Upsert into a new table `conference_registration_codes` keyed by `(conference_slug, registration_code)` with columns: `organization_id`, `organization_name`, `max_attendees` (default 1), `attendees_registered` (default 0), `status` (`active|exhausted|revoked`), `issued_at`, plus standard timestamps. RLS: only service role writes; anon may `SELECT` a single row by code via a SECURITY DEFINER RPC `lookup_registration_code(code text)` that returns `{ valid, organization_name, seats_remaining }`.
>
> **2. Registration form changes for `/hess2026`**
>
> - Add a required first step: "Enter your HESS member organization's registration code." Field validates against `lookup_registration_code` on blur and on submit.
> - When valid, lock the registration to that organization: prefill and disable the Organization field with `organization_name`, and show "Seats remaining: N" beneath it.
> - Block submission when `seats_remaining <= 0` with message "Your institution has already registered its attendee. Please contact HESS to request additional seats."
> - On successful submission, in the same transaction: increment `attendees_registered`, stamp `status = 'exhausted'` if it reaches `max_attendees`, and store `registration_code`, `organization_id`, `organization_name` on the attendee record. Reject with a friendly error if the increment would exceed `max_attendees` (race-safe via `UPDATE ... WHERE attendees_registered < max_attendees RETURNING ...`).
>
> **3. Outbound callback to HESS**
>
> - After a successful registration, POST to the HESS portal's `receive-registration-redemption` endpoint with `{ registration_code, attendee_name, attendee_email, registered_at }` so the member portal can show redemption status to the institution.
>
> **4. Admin tooling**
>
> - List view of all codes with org, seats remaining, attendee (if redeemed), and a "Revoke" / "Add extra seat" action that updates `max_attendees`.
>
> **5. Config**
>
> - Add `HESS_PORTAL_WEBHOOK_SECRET` (shared with HESS Portal) and `HESS_PORTAL_CALLBACK_URL` to project secrets.

---

## Technical notes

- Code format `HESS26-` + 8 chars from Crockford base32, retry on unique-constraint collision.
- Both webhook directions reuse the existing `external_applications.conference-hub` row for the base URL.
- Feature flag `conference_hub_registration_codes_enabled` defaults `false`; flip it on once the Conference Hub side ships `receive-registration-code`.
- No changes to Stripe checkout, invoice schema, or the `notify-payment-status` contract — the new function runs alongside it.
