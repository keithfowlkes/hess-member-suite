# Board Member Revenue Block

## Goal
Add a revenue card beside **Questions & Feedback** on the Member Dashboard. Show it only to signed-in users who have the `board_member` role.

## What will change
- Add a **Total Billed Revenue** card with the same billed total used in Admin → Membership Fees & Invoices.
- Make the card open a **Total Revenue Breakdown** modal matching the admin view, including annual total billed, paid revenue, outstanding revenue, and institution-level annual fees.
- Keep the existing Questions & Feedback card unchanged for everyone else; non-board members will not receive or see consortium-wide revenue data.
- Refresh the figures when organization or invoice records change.

## Technical details
- Add a security-definer database function restricted to `board_member` and `admin` roles so the browser cannot bypass invoice privacy rules.
- Return only the fields needed for this summary: institution ID/name/status/location, annual fee, and aggregate paid revenue status.
- Reuse the existing `FeeStatsDrilldownModal` for consistent presentation, with a small dashboard hook for role detection and secured revenue loading.
- Validate TypeScript and the board/non-board visibility paths available in the preview.
