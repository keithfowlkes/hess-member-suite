## Goal

Let members and admins view, download (PDF), print, and forward an ACH/Check version of an invoice that removes the Stripe processing fee (default $9.27, admin-configurable) — without altering the stored invoice record.

## New setting

- Add a `system_settings` row: `stripe_processing_fee` (default `9.27`, numeric string).
- Expose it in **Settings → Membership Fees** as an editable field: "Stripe processing fee (subtracted for ACH/Check version)".

## UI: the "ACH / no card fee" toggle

Added in two places, using the same control:

**Admin panel → Membership Fees → Invoices → Invoice detail modal** (`InvoiceDialog.tsx`)
**Member portal → My Invoices → Invoice detail modal** (`MemberInvoiceViewModal.tsx`)

At the top of the invoice preview area, a segmented control:

```text
Payment method:  [ Credit Card (default) ]  [ ACH / Check — no processing fee ]
```

Selecting **ACH / Check** immediately re-renders the on-screen invoice with:
- Amount reduced by the configured Stripe fee (e.g. $309.27 → $300.00), including the line-item amount, the "Total Due" line, and the "Payment Information → Due" summary.
- The gray sub-line "includes Stripe Processing Fee" replaced with "**ACH / Check payment — no processing fee**".
- The "Pay this invoice online" button and its blurb hidden (card-only path).
- A small badge under the invoice number: "ACH / Check version".

The three action buttons in the modal footer act on whichever version is currently displayed:
- **Download PDF** → `Invoice_<num>_<org>_ACH.pdf` when ACH mode is on.
- **Print** (new button, uses `window.print()` of the invoice container) — same ACH/CC state.
- **Forward…** → sends the ACH-styled HTML through the existing forward flow; the persisted `forward_comment` is unchanged. Subject/body indicate "(ACH / Check version)" when applicable.

The toggle state is remembered per session in `localStorage` (`invoice-view-mode`) so an admin forwarding many ACH invoices doesn't have to re-toggle each time. It is **not** saved to the invoice.

## Code changes

1. **`system_settings`** — one-row insert for `stripe_processing_fee` = `9.27` (via insert tool, not migration; key already fits existing schema).

2. **`src/hooks/useSystemSettings.tsx`** — no change; consumers use `useSystemSetting('stripe_processing_fee')`.

3. **`src/components/ProfessionalInvoice.tsx`**
   - New prop `paymentMode?: 'card' | 'ach'` (default `'card'`).
   - When `ach`: subtract fee from `invoice.amount` / `invoice.prorated_amount` for display, swap the description sub-line, hide the "Pay online" link if present, add "ACH / Check version" badge.

4. **`src/utils/generateInvoicePdf.ts`** — accept `paymentMode` and pass it through to the rendered invoice; adjust filename suffix.

5. **`src/utils/invoiceEmailRenderer.ts`** and **`supabase/functions/_shared/invoice-html.ts`** — accept `payment_mode` / `paymentMode`; apply the same subtraction, description swap, and hide the "Pay this invoice online" button when `ach`.

6. **`src/hooks/useResendInvoice.tsx`** — thread a new `paymentMode` param into `invoiceEmailData` and the edge-function payload; subject gets " (ACH / Check version)" suffix when set.

7. **`src/components/InvoiceDialog.tsx`** and **`src/components/MemberInvoiceViewModal.tsx`**
   - Add the segmented toggle, "Print" button (`window.print()` on the invoice ref), and pass `paymentMode` into `ProfessionalInvoice`, `generateInvoicePdf`, and `resendInvoice.mutate`.
   - Member portal restricts the toggle to primary contacts of their own org (matching the existing forward permission).

8. **`src/pages/MembershipFees.tsx`** (Settings section) — new numeric input bound to `stripe_processing_fee`.

## Out of scope

- No changes to the stored `invoices.amount`, no new column, no new invoice status.
- Stripe checkout / `PayInvoiceButton` unchanged — the ACH view simply hides that button.
- Bulk invoice creation / scheduling / meter untouched.
- The `_shared/invoice-html.ts` "PAID" stamp, conference registration code block, and W-9 link behavior are unchanged.

## How the user will use it

1. Open an invoice (admin or member).
2. Click the **ACH / Check — no processing fee** toggle above the invoice preview.
3. The preview updates to $300.00 with the fee line removed.
4. Use **Download PDF**, **Print**, or **Forward…** — all reflect the ACH version.
5. Admins can adjust the subtracted fee amount in Settings → Membership Fees if Stripe pricing ever changes.
