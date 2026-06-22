## Audit findings

**Stripe configuration (system_settings)**
- `stripe_enabled` = `false` — online payments are currently OFF
- `stripe_mode` = `live` — but no test/live secret or publishable keys verified
- `stripe_success_url` / `stripe_cancel_url` are empty (functions fall back to request origin)
- Embedded checkout already redirects on completion to `/payment/success`, which works on `members.hessconsortium.app`

**Membership fee consistency**
- `full_member_fee` = **$309.27** (calculated to absorb Stripe ~2.9% + $0.30)
- `affiliate_member_fee` = `0`, `additional_fee_tiers` = `[]`
- Existing invoices in DB: 15 at **$300.00** and 5 at **$309.27** — inconsistent
- 524 active member organizations, 3 system orgs (excluded)

**Invoice email (`send-invoice` edge function + `invoiceEmailRenderer`)**
- No "Pay Online" button or link back to `members.hessconsortium.app`
- No mention that the fee includes Stripe processing
- On-screen `ProfessionalInvoice.tsx` already shows "includes Stripe Processing Fee", but the **emailed** version does not

**Stripe checkout page (`create-stripe-embedded-session`)**
- Line item description is generic ("Membership period X to Y") — does not call out that the amount already includes the processing fee
- No public `stripe_success_url` configured, so confirmation links may resolve to whatever origin called the function instead of the custom domain

## Plan

### 1. Standardize the membership fee at $309.27 across all member orgs
- Confirm with you that **$309.27** (single tier, includes Stripe fee) is the official 2026 dues amount before any data changes
- Update the 15 existing **unpaid** invoices currently at `$300.00` to `$309.27` (skip any already `paid`); log each change to `audit_log`
- Leave `full_member_fee` setting at `309.27` and add a short inline note in Admin → Membership Fees explaining the fee includes Stripe processing
- Remove/zero out the unused `affiliate_member_fee` tier from the picker so admins cannot accidentally pick a different amount when generating invoices

### 2. Add a "Pay Online" link in the emailed invoice
- In `supabase/functions/send-invoice/index.ts` and `src/utils/invoiceEmailRenderer.ts`, add a prominent button in the Payment Information block:
  - Label: **"Pay this invoice online"**
  - URL: `https://members.hessconsortium.app/invoices?invoice=<invoiceId>` (deep-links into the member portal Invoices page, which already auto-opens the View modal containing the Pay-with-card button)
  - Fallback plain-text link below the button for email clients that strip styling
- Add a one-line note: *"The amount shown includes the Stripe credit-card processing fee. Pay-by-check remits the same amount."*

### 3. Call out the processing fee on the Stripe checkout page
- In `create-stripe-embedded-session` (and `create-stripe-checkout` for parity), change the line-item description from
  `"Membership period X to Y"`
  to
  `"HESS Consortium 2026 Annual Membership Dues (includes Stripe credit-card processing fee). Period: X – Y."`
- This is the text Stripe shows to the cardholder in the embedded UI and on the receipt

### 4. Set the canonical return URLs on the custom domain
- Set `stripe_success_url` = `https://members.hessconsortium.app/payment/success`
- Set `stripe_cancel_url` = `https://members.hessconsortium.app/invoices`
- These are read by `create-stripe-checkout`; the embedded flow already returns to `/payment/success`

### 5. Enable Stripe live payments (manual / confirm-only step)
- `stripe_enabled` is currently `false`. After steps 1–4 are verified in test mode, you flip the toggle in **Admin Panel → Online Payments**. I will not toggle it automatically.
- Pre-flight checklist I will surface in chat: live secret key + live publishable key set, statement descriptor set ("HESS CONSORTIUM"), success/cancel URLs set, at least one test invoice paid end-to-end in test mode.

### Out of scope (will not change unless you ask)
- Switching to Lovable's seamless Stripe — you're on the BYOK Stripe integration intentionally
- Re-architecting fees to charge the processing fee as a separate Stripe line item rather than baking it in (current "absorb the fee in the dues amount" is simpler and what the math at $309.27 already does)
- Any change to paid invoices

### Technical notes
- Files I will edit: `supabase/functions/send-invoice/index.ts`, `supabase/functions/create-stripe-embedded-session/index.ts`, `supabase/functions/create-stripe-checkout/index.ts`, `src/utils/invoiceEmailRenderer.ts`, `src/pages/MembershipFees.tsx` (small copy update), `src/hooks/useFeeTiers.tsx` (drop the $0 affiliate tier from the UI list, or hide when amount = 0).
- Data updates done via `supabase--insert` (UPDATE on `invoices` and `system_settings`), not migrations.

### Confirm before I build
1. Is **$309.27** the correct, final per-organization amount for every member for this billing cycle? (If not, give me the right number and I'll use that.)
2. OK to bring the 15 existing unpaid `$300.00` invoices up to the standardized amount?
3. OK to drop the affiliate / additional tiers from the fee picker, or do you want them kept for future use?
