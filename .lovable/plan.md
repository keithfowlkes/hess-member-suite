

# Security Review: What to Fix vs. What Would Break Your App

This is a finding-by-finding analysis of every security item, organized into three categories: **Safe to Fix**, **Fix With Caution**, and **Do Not Fix (would break functionality)**.

---

## Category 1: SAFE TO FIX (No Risk to Functionality)

These items can be addressed without any impact on your application's features.

### 1. Leaked Password Protection Disabled (Supabase Setting)
- **Scanner:** agent_security + supabase
- **Level:** Warning
- **What it is:** Users can currently set passwords that appear in known data breaches.
- **Fix:** Enable "Leaked Password Protection" in your Supabase Dashboard under Authentication > Providers.
- **Risk of fixing:** None. Existing users are unaffected. Only new password changes against known-breached passwords would be rejected, which protects your members.

### 2. Auth OTP Long Expiry (Supabase Setting)
- **Scanner:** supabase
- **Level:** Warning
- **What it is:** One-time password tokens (used in password reset links) stay valid longer than recommended.
- **Fix:** Reduce OTP expiry in Supabase Dashboard under Authentication settings to the recommended threshold (e.g., 1 hour).
- **Risk of fixing:** None, unless members routinely wait many hours before clicking password reset links. A 1-hour window is generous.

### 3. Vulnerable Postgres Version (Supabase Infrastructure)
- **Scanner:** supabase
- **Level:** Warning
- **What it is:** Security patches are available for your Postgres version.
- **Fix:** Upgrade Postgres via Supabase Dashboard (Settings > Infrastructure). Schedule during a low-traffic window.
- **Risk of fixing:** Minimal. Supabase handles the upgrade. Brief downtime possible during the upgrade window.

### 4. Function Search Path Mutable (Database Functions)
- **Scanner:** supabase
- **Level:** Warning
- **What it is:** Some database functions don't explicitly set their `search_path`, which could theoretically allow schema injection.
- **Fix:** Add `SET search_path = public` to affected database functions via a migration.
- **Risk of fixing:** None. This just makes the functions more explicit about which schema they reference.

### 5. Extension in Public Schema
- **Scanner:** supabase
- **Level:** Warning
- **What it is:** Database extensions are installed in the `public` schema rather than a dedicated `extensions` schema.
- **Fix:** Move extensions to a dedicated schema. However, this is a low-priority change.
- **Risk of fixing:** Low, but requires testing to ensure all queries still resolve correctly. Recommend doing this during a maintenance window.

---

## Category 2: FIX WITH CAUTION (Requires Careful Implementation)

These items have real security value but need careful implementation to avoid breaking features.

### 6. Password Encryption Key Accessible Client-Side (ERROR level)
- **Scanner:** agent_security
- **Level:** Error
- **What it is:** The encryption key for member passwords is stored in `system_settings` and fetched by client-side JavaScript code. Anyone with browser DevTools can see it.
- **Should you fix it?** Yes, but carefully.
- **What would break if done wrong:** The registration flow and the "Add External User" dialog both use client-side encryption. If you move encryption server-side without updating these flows, new registrations would fail.
- **Safe approach:**
  1. Create a new edge function (e.g., `encrypt-password`) that accepts a plaintext password and returns the encrypted version, using the key from server-side secrets only.
  2. Update `Auth.tsx` and `AddExternalUserDialog.tsx` to call this edge function instead of encrypting client-side.
  3. Only after confirming the new flow works, remove the key from `system_settings`.
  4. Update backup functions to exclude the `password_encryption_key` row.

### 7. Multiple Edge Functions Without Authentication
- **Scanner:** agent_security
- **Level:** Warning
- **What it is:** Several edge functions have `verify_jwt=false`. Here is the breakdown:

| Function | Why it's public | Should you fix? |
|---|---|---|
| `send-password-reset` | Must be public (user isn't logged in yet) | **No** - Working as intended. Could add rate limiting. |
| `track-invoice-open` | Email tracking pixel (no auth possible in emails) | **No** - Working as intended. Risk is limited (see item 8). |
| `centralized-email-delivery-public` | Used for unauthenticated email flows (registration confirmations) | **No** - Required for registration flow. Could add a shared secret check. |
| `cleanup-pending-registration` | Called during registration flow | **No** - Needed for self-service registration cleanup. |
| `complete-contact-transfer` | Token-based transfer link clicked from email | **No** - Uses transfer token validation. Working as designed. |
| `scheduled-backup` | Intended for cron trigger | **Fix with caution** - Add a shared secret header check so only your cron job can trigger it. |
| `repair-email-mismatches` | Admin utility | **Yes, fix** - Add authentication. This is an admin-only tool. |
| `fix-user-metadata` | Admin utility | **Yes, fix** - Add authentication. Admin-only tool. |
| `populate-organization-websites` | Data utility | **Fix** - Add auth or a shared secret. |
| `populate-websites-from-email` | Data utility | **Fix** - Add auth or a shared secret. |
| `normalize-*` functions (5 total) | Data normalization utilities | **Fix** - Add auth or a shared secret. These are admin operations. |

- **What would break if done wrong:** Adding `verify_jwt=true` to `send-password-reset`, `cleanup-pending-registration`, `complete-contact-transfer`, or `centralized-email-delivery-public` would immediately break password resets, registration, contact transfers, and public email delivery.

### 8. Invoice Tracking Allows ID Enumeration
- **Scanner:** agent_security
- **Level:** Warning
- **What it is:** The `track-invoice-open` function can confirm whether an invoice ID exists.
- **Should you fix it?** Low priority. Invoice IDs are UUIDs (not sequential), making enumeration impractical. RLS prevents actual data access.
- **Safe approach if desired:** Generate a unique tracking token per invoice email and use that instead of the invoice ID in the tracking URL.
- **Risk of fixing:** If implemented incorrectly, invoice open tracking would stop working and you'd lose visibility into whether members have opened their invoices.

### 9. RLS Policy Always True
- **Scanner:** supabase
- **Level:** Warning
- **What it is:** Some RLS policies use `USING (true)` or `WITH CHECK (true)` for INSERT/UPDATE/DELETE. The specific cases found are:
  - `email_logs`: `WITH CHECK (true)` on INSERT - allows any authenticated user to insert logs. This is intentional for edge functions logging email activity.
  - `pending_registrations`: `WITH CHECK (true)` on INSERT for anonymous users - **intentional**, allows public registration.
  - `member_registration_updates`: `WITH CHECK (true)` on INSERT - **intentional**, allows members to submit update requests.
  - `organization_reassignment_requests`: `WITH CHECK (true)` on INSERT - **intentional**, allows members to request reassignment.
- **Should you fix it?** These are all intentional for your app's workflows. No changes recommended.
- **What would break:** Restricting anonymous INSERT on `pending_registrations` would prevent new member registration. Restricting `member_registration_updates` INSERT would prevent members from submitting profile update requests.

---

## Category 3: DO NOT FIX (Would Break Core Functionality)

These findings are flagged by automated scanners but are **intentional design decisions** for your information-sharing portal.

### 10. Profiles Table Publicly Readable by Authenticated Users (ERROR level)
- **Scanner:** supabase_lov
- **Level:** Error
- **What it is:** The policy `Authenticated members can view all profiles` uses `USING (true)`, meaning any logged-in member can see all other members' names, emails, phones, and organization.
- **Why this exists:** Your application is a **member information portal for a consortium**. The entire purpose is contact and information sharing. Members need to see other members' contact details to collaborate.
- **What would break if "fixed":** 
  - The Member Directory would stop showing other members
  - Cohort leader views would not show member contacts
  - Organization detail modals showing contact persons would break
  - The "Your Cohort Information" member lists would be empty
- **Recommendation:** **Do not change this policy.** This is core to your app's purpose. You could optionally limit the visible columns (e.g., hide `phone` from the policy and show it only via a dedicated endpoint), but the SELECT access itself is intentional.

### 11. Organizations Table Publicly Readable (ERROR level)
- **Scanner:** supabase_lov
- **Level:** Error
- **What it is:** The policy `Public can view active member organizations` allows anonymous (unauthenticated) users to query the full `organizations` table for active members.
- **Why this exists:** You have a **Public Directory** and **Public Map** feature that shows consortium member institutions to the public. This is an intentional feature of your portal.
- **What would break if "fixed":**
  - The Public Directory page (`/public-directory`) would show nothing
  - The Public Map page (`/public-map`) would show nothing
  - Any public-facing consortium information would disappear
- **However, there is a nuance:** The anonymous policy exposes the *full* `organizations` row (including email, phone, address, contact_person_id) even though you already have a `public_organization_directory` view that limits columns. The public pages likely use this view, but the raw table is still accessible.
- **Recommendation:** Keep the anonymous SELECT policy but **restrict it to only the columns in your public view** by modifying the anonymous policy to use a column-level security approach, or ensure your public pages only query through the `public_organization_directory` view and add a note that the broader access is a known trade-off.

### 12. Public Organization Directory View (Security Definer)
- **Scanner:** supabase
- **Level:** Error (ignored)
- **What it is:** The `public_organization_directory` view uses SECURITY DEFINER.
- **Why this exists:** This view is intentionally designed to expose only non-sensitive fields (name, city, state, software systems) while hiding PII. It runs with the view creator's permissions to bypass per-user RLS, which is the correct pattern for a public directory.
- **Already properly ignored:** This finding was already reviewed and marked as intentional.

---

## Summary Action Plan

| Priority | Item | Action | Risk |
|---|---|---|---|
| 1 | Leaked Password Protection | Enable in Supabase Dashboard | None |
| 2 | OTP Expiry | Reduce in Supabase Dashboard | None |
| 3 | Postgres Upgrade | Upgrade via Dashboard | Brief downtime |
| 4 | Encryption Key Client-Side | Move to server-side edge function | Medium - test registration flow |
| 5 | Admin utility functions (repair-email, fix-metadata, normalize-*) | Add authentication | None if done correctly |
| 6 | scheduled-backup | Add shared secret check | None |
| 7 | Function Search Path | Add SET search_path to functions | None |
| -- | Profiles public read | DO NOT CHANGE | Would break member portal |
| -- | Organizations anonymous read | DO NOT CHANGE (or restrict columns) | Would break public directory |
| -- | RLS always-true INSERTs | DO NOT CHANGE | Would break registration and member workflows |

Items 1-3 are simple Supabase Dashboard changes you can do today. Items 4-7 require code changes that I can implement for you.

