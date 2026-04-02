

## Plan: Streamlined Primary Contact Transfer with Data Protection

### Summary
Implement the multi-step transfer workflow where both contacts are notified, the new contact must register and update the org record, and the admin can only approve once everything is ready. The organization record is never destroyed -- only `contact_person_id` and the new contact's `profiles.organization` field are updated.

### Data Safety Guarantee
The `approve-contact-transfer` edge function will ONLY update two fields:
1. `organizations.contact_person_id` → new profile ID
2. `profiles.organization` → org name (on new contact's profile)

No other organization columns are touched. All org data (systems, FTE, address, membership, etc.) is preserved. An audit log snapshot of the org record will be saved before the transfer for rollback safety.

### Changes

**1. Database Migration**
- Add `org_updated_at` (nullable timestamp) column to `organization_transfer_requests` to track when the new contact updated the org

**2. Update `initiate-contact-transfer` edge function**
- Send a confirmation email to the **current contact** confirming they initiated the transfer
- Update the new contact email to include clear instructions: register at the portal, log in, and update the organization record
- Add `contact_transfer_confirmation` email type handling

**3. Update `centralized-email-delivery` edge function**
- Add `contact_transfer_confirmation` email type for the current contact notification
- Update `contact_transfer` template text to include registration and org update instructions

**4. Update `approve-contact-transfer` edge function**
- Only allow approval when status is `ready_for_approval` (in addition to current `pending`/`accepted`)
- Snapshot the full organization record in the audit log before making the transfer (data loss protection)
- Verify org data hasn't been corrupted before completing

**5. Member Portal: Pending Transfer Banner (`Profile.tsx`)**
- On login, check if the user's email matches any pending/accepted transfer request
- Show a banner: "You have a pending contact transfer for [Org]. Please review and update the organization's information."
- When the new contact submits an org profile edit request, auto-update the transfer request to `ready_for_approval` and set `org_updated_at`

**6. Update `useUnifiedProfile` or org edit handler**
- After a successful org profile edit submission, check for a pending transfer matching the user's email
- If found, update the transfer status to `ready_for_approval` and notify admin

**7. Update Master Dashboard UI (`MasterDashboard.tsx`)**
- Add three status badges: `pending` (email sent), `accepted` (link clicked), `ready_for_approval` (org updated)
- Only enable "Approve" when status is `ready_for_approval` AND new contact has an account
- Add "Resend Notification" button
- Show transfer progress timeline in the review dialog

**8. Update `useTransferRequests` hook**
- Include `ready_for_approval` in status filter
- Add display labels for all statuses

### Files to Create/Modify

| File | Action |
|------|--------|
| New migration SQL | Add `org_updated_at` column |
| `supabase/functions/initiate-contact-transfer/index.ts` | Send confirmation to current contact |
| `supabase/functions/centralized-email-delivery/index.ts` | Add `contact_transfer_confirmation` type |
| `supabase/functions/approve-contact-transfer/index.ts` | Require `ready_for_approval`, snapshot org data |
| `src/pages/Profile.tsx` | Add pending transfer detection banner |
| `src/hooks/useTransferRequests.tsx` | Update status filters and labels |
| `src/pages/MasterDashboard.tsx` | Status badges, resend, conditional approve, timeline |
| `src/hooks/useUnifiedProfile.tsx` or org edit handler | Auto-mark transfer ready after org update |

### Data Loss Prevention Measures
- Audit log captures full `organization.*` snapshot before `contact_person_id` update
- Only `contact_person_id` and new contact's `profiles.organization` are modified
- The approve function will re-fetch and verify the org exists and has data before proceeding
- If any update fails, the transfer status remains unchanged (no partial state)

