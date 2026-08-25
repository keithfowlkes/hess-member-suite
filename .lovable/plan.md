# Arctic Security Scan: live API feed instead of the CSV file

Replace the hard-coded July 2026 CSV snapshot (`src/data/arcticScanData.ts`) with data pulled from the Arctic Security aggregates API, cached in the database and refreshed automatically every 2 hours. Both the admin dashboard and the member view read from the same cache.

## How it will work

```text
Arctic API  ->  edge function (every 2h)  ->  arctic_scan_rows table  ->  admin + member dashboards
```

1. A scheduled backend job calls the Arctic aggregates endpoint, parses the CSV response, and replaces the stored rows for the returned observation period.
2. The dashboards read the stored rows instead of the bundled file. Nothing about the charts, categories, urgency levels, risk cards, or member-only scoping changes — only where the rows come from.
3. If a refresh fails, the previously stored rows stay in place; the dashboards keep showing the last good data with a "Last updated" timestamp and a quiet note if the feed is stale.
4. Admins get a "Refresh now" button on the Arctic Security Scan tab for an on-demand pull.

## Access rules

- Admins and cohort leaders: full consortium data, exactly as today.
- Members: only their own institution's rows, enforced at the database level (row-level security) rather than only in the UI.

## Technical details

**Database**
- New table `public.arctic_scan_rows`: `id`, `observation_time` (text, e.g. `2026-07`), `organization`, `category`, `urgency`, `events`, `unique_event_group_ids`, `unique_ips`, `fetched_at`. Unique index on (`observation_time`, `organization`, `category`, `urgency`).
- New table `public.arctic_scan_syncs`: `id`, `started_at`, `finished_at`, `status`, `row_count`, `error`, for the "last updated" stamp and failure diagnostics.
- Grants: `SELECT` to `authenticated`, `ALL` to `service_role`, no `anon` grant. RLS on: admins/cohort leaders select all; other authenticated users select only rows whose `organization` matches their own organization name (reusing the existing role helpers and profile→organization link used elsewhere in the app).

**Secrets**
- The API key currently embedded in the URL is stored as edge function secrets `ARCTIC_API_BASE_URL`, `ARCTIC_AGGREGATE_ID`, and `ARCTIC_API_KEY` — never in client code or the database.

**Edge function `sync-arctic-scan`**
- Builds the request with a rolling window (current month by default, `granularity=month`, `keys=organization,category,urgency`), fetches `accept=application/csv`, and parses the CSV.
- Upserts rows for the returned period inside one transaction; deletes stale rows for that period that were not in the response.
- Writes a `arctic_scan_syncs` record on success and failure. On failure it exits without touching existing rows.
- Callable by admins on demand (JWT + admin role check) and by the scheduler.

**Scheduling**
- pg_cron + pg_net job invoking the function every 2 hours.

**Frontend**
- New hook `useArcticScanData()` (React Query, 2-hour stale time) reading `arctic_scan_rows` plus the latest sync record.
- `src/components/ArcticSecurityDashboard.tsx` and `src/components/MemberArcticSecurityView.tsx` swap `ARCTIC_RAW_DATA` for the hook's rows, mapped into the existing `ArcticScanRow` shape so all downstream aggregation code is untouched. Add loading skeletons and a "Data as of …" line.
- `src/data/arcticScanData.ts` is kept temporarily as a seed source for the initial backfill, then removed once the first live sync succeeds.

**Rollout**
1. Create tables + RLS, seed with the existing CSV rows so nothing goes blank.
2. Deploy and manually run the sync function; verify the row count matches the feed.
3. Switch the two components to the hook.
4. Enable the 2-hour cron and delete the bundled CSV module.
