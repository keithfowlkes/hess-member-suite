# Arctic Security Scan: live API feed

This work is already in place from the previous session. Confirmed in the codebase:

- `supabase/functions/sync-arctic-scan` fetches the Arctic aggregates CSV feed, parses it, and upserts rows into `arctic_scan_rows`, logging each run in `arctic_scan_syncs`.
- A scheduled job runs the sync every 2 hours; if a fetch fails, the last successfully stored data stays in place.
- `src/hooks/useArcticScanData.tsx` reads the stored rows for the most recent scan period.
- `src/components/ArcticSecurityDashboard.tsx` (admin) and `src/components/MemberArcticSecurityView.tsx` (member) both read from that hook instead of the bundled CSV, and the admin view has a manual "Refresh data" button plus the real scan period label.
- Current stored data: July 2026 (814 rows) and August 2026 (809 rows).

## Remaining cleanup (what this plan would do)

1. Remove the now-unused static dataset `src/data/arcticScanData.ts`, keeping only the `ArcticScanRow` type the hook needs (move that type into the hook file).
2. Add a small empty-state to both views for the case where the feed has never returned data, instead of rendering zeroed charts.
3. Surface the last successful sync time (from `arctic_scan_syncs`) next to the scan-period badge in the admin dashboard, so an admin can tell when the feed last ran versus which month is displayed.

## Technical notes

- The Arctic API rejects percent-encoded commas in the `keys` parameter, so the query string is assembled manually in the edge function; keep that when touching the fetch code.
- Months with no observations return a CSV without the key columns; the function treats that as "no rows" and leaves existing data untouched rather than wiping the period.

If you would rather leave the cleanup alone, no action is needed: the live feed is already the source of data for both admin and member views.
