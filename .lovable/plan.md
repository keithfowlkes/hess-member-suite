

## Plan: Simplelists API Integration ✅ IMPLEMENTED

### Summary
Integrated the Simplelists V2 API to automatically sync primary and secondary contacts with the HESS mailing list. Added a new "Simplelists" tab to the External Applications admin page with configuration controls, and hooked into member approval, deletion, and contact transfer workflows.

### What Was Built

**1. Edge Function: `simplelists-sync`**
- Handles: `test_connection`, `get_settings`, `update_settings`, `add_contacts`, `remove_contact`, `transfer_contact`, `sync_all_members`
- Uses Bearer token auth with `SIMPLELISTS_API_KEY` secret
- All operations logged to `simplelists_sync_log` table

**2. Database: `simplelists_sync_log` table**
- Tracks all sync operations with action, email, org name, status, error messages
- Admin-only RLS access

**3. Admin UI: Simplelists Tab in External Applications**
- Connection test button with status indicator
- List name configuration
- Enable/disable auto-sync toggle
- Sync secondary contacts toggle
- "Sync All Current Members" bulk action
- Activity log table showing recent sync operations
- "How It Works" guide

**4. Workflow Hooks (auto-sync when enabled)**
- `approve-pending-registration`: Adds primary + secondary contacts on member approval
- `delete-organization`: Removes primary + secondary contacts before org deletion
- `approve-contact-transfer`: Removes old contact, adds new contact on transfer approval

### Settings (stored in `system_settings`)
- `simplelists_enabled` — master toggle
- `simplelists_list_name` — target list name
- `simplelists_sync_secondary` — whether to include secondary contacts
