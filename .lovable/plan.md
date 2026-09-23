# Revenue Breakdown Payment Status and Filters

## Goal
Make the Total Revenue Breakdown easier to review in both admin and board-member views.

## Changes
- Add a **Dues Status** column showing **Paid** or **Not Paid** for each institution.
- Add organization-name search.
- Add an **All / Paid / Not Paid** filter.
- Show the filtered result count and a clear empty state when nothing matches.
- Keep other fee drill-down windows unchanged.

## Technical details
- Extend the shared revenue modal with optional payment-status and filtering controls.
- Pass paid-status data from the existing invoice calculations in the admin view and from the secured board-member revenue summary.
- Validate TypeScript and linting after implementation.
