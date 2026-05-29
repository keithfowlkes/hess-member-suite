# Stripe Membership Fee Payments (self-contained)

Add a fully self-contained "Pay with Stripe" path for membership invoices. No external SDKs — the edge functions call Stripe's REST API directly and verify webhook signatures with the built-in Web Crypto API. All Stripe configuration is read from the existing Settings → Online Payments panel; no admin UI changes.

Organizations flagged Unpaid (the HESS Consortium Administrator account) are excluded from seeing the pay button because they have no real current-period invoice row.

## Scope

In scope
- Stripe Checkout session creation for an existing unpaid membership invoice
- Stripe webhook that marks the matched invoice paid (idempotent)
- "Pay with card" button on the Member Dashboard Membership Fee card and on the member-facing invoice modal
- Self-contained implementation: no `stripe` npm package, no Stripe SDK — only `fetch` to `api.stripe.com` and HMAC-SHA256 signature verification

Out of scope (deferred)
- Any new admin settings UI (the existing `StripeSettings.tsx` is the source of truth)
- Subscriptions / recurring billing
- ACH, Apple Pay, Google Pay (cards only for v1)
- Refunds, disputes, partial payments
- Replacing the Medius/conference-hub inbound payment flow

## User flow

1. Member sees Membership Fee card with the existing amber "MEMBERSHIP FEE DUE …" badge.
2. If Stripe is enabled in settings AND the org has a current-period unpaid invoice → a "Pay with card" button appears.
3. Click → `create-stripe-checkout` edge function → redirect to Stripe Checkout.
4. Stripe redirects back to the configured success URL with `?payment=success&invoice=…`.
5. Stripe POSTs `checkout.session.completed` to `stripe-webhook`, which verifies the signature and flips the invoice to `paid` (`payment_source='stripe'`, `external_reference=<payment_intent>`).
6. Badge turns green PAID on next refetch.

## Reuse of existing functionality

- **Settings UI:** `src/components/StripeSettings.tsx` already persists `stripe_enabled`, `stripe_mode`, `stripe_default_currency`, `stripe_statement_descriptor`, `stripe_success_url`, `stripe_cancel_url`, `stripe_auto_mark_invoice_paid`, `stripe_webhook_endpoint_url`, etc. No edits needed.
- **Invoice table:** `invoices` already has `status`, `paid_date`, `payment_source`, `external_reference`. No migration.
- **Badge / status:** `MembershipDuesBadge` + `getMembershipDuesStatus` continue to drive the visual state. Pay button derives from the same `currentPeriodUnpaidInvoice` value used in `Index.tsx`.
- **Admin Unpaid flag:** existing `userOrganization?.name?.toLowerCase().includes('administrator')` check stays as-is. That account has no invoice row, so the pay button naturally hides.

## Technical details

### New edge functions

1. **`supabase/functions/create-stripe-checkout/index.ts`** (`verify_jwt = true`)
   - Auth required; resolves caller's profile then org via `contact_person_id`.
   - Input: `{ invoiceId: string }`.
   - Loads invoice with service-role client; rejects if not owned by caller's org or already paid.
   - Reads `stripe_*` rows from `system_settings`; picks `STRIPE_SECRET_KEY_TEST` or `STRIPE_SECRET_KEY_LIVE` by `stripe_mode`.
   - POSTs `application/x-www-form-urlencoded` to `https://api.stripe.com/v1/checkout/sessions` with:
     - `mode=payment`, `payment_method_types[0]=card`
     - one `price_data` line: currency from settings, `unit_amount = round((prorated_amount ?? amount) * 100)`, product name = "HESS Consortium Membership — Invoice …"
     - `success_url`, `cancel_url` from settings with `?payment=success&invoice=<id>&session_id={CHECKOUT_SESSION_ID}` appended
     - `client_reference_id = invoice.id`, `metadata[invoice_id]`, `metadata[organization_id]`
     - `customer_email = organization.email`
     - optional `payment_intent_data[statement_descriptor]` from settings (truncated to 22 chars)
   - Returns `{ url, id }`.

2. **`supabase/functions/stripe-webhook/index.ts`** (`verify_jwt = false`, raw body)
   - Reads raw body and `stripe-signature` header.
   - Verifies signature using Web Crypto HMAC-SHA256 against `t=…,v1=…` scheme with a 5-minute tolerance. Tries `STRIPE_WEBHOOK_SECRET_<mode>` first, falls back to the other (so test webhooks still work while live key is being rotated).
   - Handles `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Skips when `payment_status !== 'paid'`.
   - Idempotent: skips invoices already `paid`; otherwise sets `status='paid'`, `paid_date=now()`, `payment_source='stripe'`, `external_reference = payment_intent ?? session.id`.
   - Best-effort `notify-payment-status` invocation (mirrors `useInvoices.markAsPaid`).
   - Honors `stripe_auto_mark_invoice_paid` setting.

3. **`supabase/config.toml`** — add `[functions.create-stripe-checkout] verify_jwt = true` and `[functions.stripe-webhook] verify_jwt = false`.

### Frontend additions

- `src/hooks/useStripeEnabled.tsx` — derives `{ enabled, mode }` from `useSystemSettings()`.
- `src/hooks/useStripeCheckout.tsx` — `useMutation` that invokes `create-stripe-checkout` and does `window.location.assign(url)`.
- `src/components/PayInvoiceButton.tsx` — small button that hides itself when `!enabled`, shows a card icon and a loading state.
- `src/pages/Index.tsx` — inside the Membership Fee card, when `currentPeriodUnpaidInvoice` exists and not the administrator fallback, render `<PayInvoiceButton invoiceId={currentPeriodUnpaidInvoice.id} />` next to the badge. Also: read `?payment=success&invoice=…` on mount and invalidate the invoices query so the badge flips quickly.
- `src/components/MemberInvoiceViewModal.tsx` — render `PayInvoiceButton` in the dialog header when the invoice is not paid.

### Secrets

Will request via `add_secret`:
- `STRIPE_SECRET_KEY_TEST` (required to start; from Stripe Dashboard → Developers → API keys, test mode)
- `STRIPE_WEBHOOK_SECRET_TEST` (after creating the webhook endpoint in Stripe pointing at `https://tyovnvuluyosjnabrzjc.supabase.co/functions/v1/stripe-webhook`)
- `STRIPE_SECRET_KEY_LIVE` and `STRIPE_WEBHOOK_SECRET_LIVE` (when switching `stripe_mode` to live)

### Guard rails

- Button hidden when `stripe_enabled !== 'true'`, when there is no current-period unpaid invoice (covers the admin Unpaid-fallback case), or when the invoice is already paid.
- Server re-validates org ownership and unpaid status before creating the session.
- Webhook handler is idempotent and ignores unknown event types.

## Verification

1. Stripe disabled → no Pay button anywhere; existing badges unchanged.
2. Enable Stripe (test mode) + add `STRIPE_SECRET_KEY_TEST` + `STRIPE_WEBHOOK_SECRET_TEST` + create the Stripe webhook → Pay button appears for a member with an unpaid invoice.
3. Administrator account → still shows the UNPAID fallback badge, no Pay button.
4. Complete a Stripe test Checkout (`4242 4242 4242 4242`) → webhook receives `checkout.session.completed` → invoice flips to PAID, badge turns green after refetch.
5. Replay the same webhook → no duplicate state change.
6. Tamper with the signature → webhook returns 401, no DB change.
