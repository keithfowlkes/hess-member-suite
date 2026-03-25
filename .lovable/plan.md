

## Arctic Security Scan Dashboard

### Overview
Create a new `ArcticSecurityDashboard` component that visualizes the security scan data with a modern, information-dense layout. The data shows per-organization security events across two categories: "public exposure" and "suspected compromise."

### Component: `src/components/ArcticSecurityDashboard.tsx`

**Layout sections (top to bottom):**

1. **Summary Cards Row** — Three metric cards:
   - Total organizations scanned (count of unique orgs)
   - Total suspected compromise events (sum)
   - Total public exposure events (sum)
   - Last scan date badge ("February 2026")

2. **Risk Distribution Bar Chart** — Horizontal bar chart (using Recharts, already in the project) showing top 10 organizations by total events, with stacked bars for "suspected compromise" (red/orange) and "public exposure" (amber/yellow). Sorted descending by total events.

3. **Searchable/Sortable Organization Table** — Full data table with:
   - Organization name
   - Public Exposure events (with color-coded badge)
   - Suspected Compromise events (with color-coded badge)  
   - Total events
   - Risk level indicator (severity badge: Low/Medium/High/Critical based on thresholds)
   - Sortable columns, search filter input at top
   - Color coding: green (0), yellow (1-10), orange (11-100), red (100+)

4. **Risk Level Breakdown** — Small donut/pie chart showing count of orgs per risk tier

### Data Handling
- Hardcode the sample JSON data as a static array in the component
- Parse and aggregate: merge rows per organization (some orgs have both categories)
- Derive risk levels from total event count thresholds

### Integration
- Import and render `<ArcticSecurityDashboard />` inside the existing `TabsContent value="security"` in `src/pages/Dashboards.tsx`, replacing the "Coming soon" placeholder

### Files Changed
1. **Create** `src/components/ArcticSecurityDashboard.tsx` — Full dashboard component
2. **Edit** `src/pages/Dashboards.tsx` — Import and render the new component in the security tab

