## Goal

Invoice emails should be sent with **only the invoice HTML** in the body — no cream banner, no big "The HESS Consortium" logo header, no "Please find your membership invoice attached…" intro, no "© 2026 HESS Consortium" footer wrapper. The Preview-style invoice already contains its own HESS logo, company info, and footer ("Questions about your invoice? …"), so the recipient sees exactly what admins see in **Fee Management → Preview Invoice**.

Scope is **invoice emails only**. Welcome, password reset, notifications, etc. keep their current branded wrapper.

## Changes

1. **`supabase/functions/centralized-email-delivery-public/index.ts`** — change the `type === 'invoice'` branch so `finalHtml` is set to `templateData.invoice_content` directly (after running it through `replaceLogoInTemplate` / `replaceTemplateVariables` so any `{{...}}` tokens still resolve). Remove the wrapper `<div>` that currently includes `template?.html` and the bordered container. If `invoice_content` is missing for some reason, fall back to the existing template so we never send an empty body.

2. **`supabase/functions/centralized-email-delivery/index.ts`** — apply the same change (this is the authenticated mirror of the public function) so admin-initiated sends behave identically.

3. **Verification** — deploy both functions, then resend the existing test invoice (`b68486cb-1b37-4071-824c-3df302177cef`) to Keith and confirm the resulting email body is just the styled invoice with no banner/intro/footer wrapper.

## Out of scope

- The `system_messages` row for `email_type='invoice'` ("Please find your membership invoice attached…") is left in place so nothing else that consumes it breaks; it just stops being injected into invoice sends.
- No changes to other email types, the bulk scheduling/meter, or the invoice HTML template itself.
