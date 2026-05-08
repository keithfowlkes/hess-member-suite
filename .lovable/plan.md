# Resolve 401 on receive-membership-payment

Two coordinated changes so the next test fire either succeeds outright or gives us a clean length comparison to diagnose the mismatch.

## 1. Rotate `MEDIUS_EVENTS_WEBHOOK_SECRET`

- Prompt you (via the secrets tool) to paste a fresh strong value into `MEDIUS_EVENTS_WEBHOOK_SECRET`.
- You then paste the **exact same value** into the conference system's `hess_portal_webhook_secret` config.
- Guidance I'll give when requesting it:
  - Generate with `openssl rand -hex 32` (or any 40+ char random string).
  - No surrounding quotes.
  - No leading/trailing whitespace or newline.
  - Copy/paste the same string into both systems — don't retype.

## 2. Add a one-shot, safe debug log to the edge function

Edit `supabase/functions/receive-membership-payment/index.ts` so that **only when the secret check fails**, it logs:

- `provided.length`, `expected.length`
- `provided.first2`, `provided.last2` (only first/last 2 chars — never the full value)
- `expected.first2`, `expected.last2`
- whether `expected` is empty (config issue) vs mismatch
- the header name actually received (in case a proxy lowercased/renamed it)

It will **never** log the full secret. The 401 response body stays unchanged.

This lets us read the function logs after the next test fire and confirm in seconds whether it's a length mismatch (whitespace/newline), a wrong-value mismatch, or a header-routing problem.

## 3. Verification flow

1. You fire the test from the conference system.
2. If it returns 200 → done. I'll suggest removing the debug log in a follow-up.
3. If it still 401s → I read the edge function logs, compare the lengths and end-chars, and tell you exactly which side has the discrepancy.

## Technical details

- Only `index.ts` of `receive-membership-payment` changes; no schema changes, no other functions touched.
- `timingSafeEqual` stays in place — debug log runs only on the failure branch, so timing of the success path is unaffected.
- Debug output uses `console.warn` so it stands out in the log stream.
- After the issue is resolved, the debug block should be removed (one-line revert) to keep logs clean.
