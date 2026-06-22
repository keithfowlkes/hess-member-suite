## Goal
When the admin generates invoices in bulk (Membership Fees → Generate Invoices), the resulting emails must not all blast out in a few minutes. They should be spread evenly across a configurable window (default **12 hours**) so Resend/Stripe-bearing messages don't get flagged as spam.

## Why the current code can't do this
`bulk-email-delivery` runs the send loop in `EdgeRuntime.waitUntil` with a 550 ms in-process delay. An Edge Function can't stay alive for 12 hours, so any long delay has to live outside the function call.

## Approach
Introduce a durable **scheduled email queue** that pg_cron drains on a fixed cadence. The bulk flow enqueues all invoice emails with staggered `scheduled_send_at` timestamps; a cron-triggered worker picks up rows whose time has come and sends them one by one through `centralized-email-delivery-public`.

```text
[Bulk Generate Invoices]
        │ enqueue N rows, scheduled_send_at spread across 12h
        ▼
 scheduled_email_queue ──── pg_cron (every minute)
        │                         │ POST
        ▼                         ▼
   status updates       process-scheduled-email-queue
                                  │ for each due row:
                                  ▼
                   centralized-email-delivery-public
```

## Changes

### 1. New table `public.scheduled_email_queue` (migration)
Columns: `id uuid pk`, `email_type text`, `recipient text`, `subject text`, `template_html text`, `invoice_id uuid null`, `organization_id uuid null`, `organization_name text`, `scheduled_send_at timestamptz`, `status text default 'pending'` (`pending|sending|sent|failed`), `attempts int default 0`, `last_error text`, `batch_id uuid`, `created_at`, `sent_at`. Indexes on `(status, scheduled_send_at)` and `batch_id`. RLS: admin read; service_role full. Standard GRANTs.

### 2. New setting `bulk_email_window_hours` (default `12`) in `system_settings`
Admin-editable; falls back to 12 if unset. (Keeps existing `email_rate_limit_delay_ms` for legacy non-bulk flows.)

### 3. Update `bulk-email-delivery`
Add optional `scheduleWindowHours` to the request (and read setting as default). When set:
- compute evenly spaced `scheduled_send_at` (`now() + i * windowHours*3600 / N` seconds, with a small jitter ±30 s to avoid identical-second batching)
- insert all rows into `scheduled_email_queue` in one batch
- return `{ scheduled: true, batchId, count, windowHours, firstSendAt, lastSendAt }`
- do NOT send anything in-process

Existing immediate-send behavior is preserved when `scheduleWindowHours` is omitted/0.

### 4. New edge function `process-scheduled-email-queue`
- Called by pg_cron every minute (no JWT, validates a shared secret header from settings/Vault).
- `SELECT ... FOR UPDATE SKIP LOCKED LIMIT 25 WHERE status='pending' AND scheduled_send_at <= now()`.
- For each row: mark `sending`, invoke `centralized-email-delivery-public`, on success mark `sent` + flip invoice `status='sent'`/`sent_date`, on failure increment `attempts`, set `last_error`; after 3 attempts → `failed`.
- Hard wall-time cap (~120 s); leftovers picked up next minute. Throughput cap = 25/min ≈ 1500/hr, easily enough for 524 invoices over 12 h.

### 5. pg_cron job (via supabase--insert, not migration, since it embeds project URL + anon key)
Schedule `process-scheduled-email-queue` every minute with `net.http_post`.

### 6. Wire it into `MembershipFees.tsx` bulk invoice generator
The existing `bulk-email-delivery` invoke call (around line 825) gets `scheduleWindowHours: 12` added. Update the success toast to say something like *"312 invoices scheduled — sending evenly over the next 12 hours."* Add a small admin-facing field above the Generate button: "Send window (hours)" defaulting to 12.

### 7. New admin view (small): "Scheduled invoice deliveries"
Add a collapsible card under the bulk-generate panel listing the most recent batch: counts of pending/sent/failed, first/last scheduled time, and a "Send remaining now" button (sets all pending rows in the batch to `scheduled_send_at = now()`). Keeps admin in control without manual SQL.

## Out of scope
- Per-recipient timezone targeting (sends are evenly spread in wall-clock time).
- Reworking single-invoice send/resend flows — they remain immediate.
- Changing the email design (just done).

## Verification
- Generate a small test batch (e.g. 6 invoices, window = 1 h) → confirm rows land in `scheduled_email_queue` with 10-min gaps, cron picks them up, invoice statuses flip to `sent`, audit log entries are written.
- Re-run with the full 524-org list at window = 12 h → spot-check `first_send_at` ≈ now, `last_send_at` ≈ now + 12 h, average gap ≈ 82 s.

## Question before I build
Should the "Send window (hours)" be admin-editable per bulk run (default 12), or do you want it locked at 12 h with no UI control?