# Invite Colleagues to Your Institution's Portal Account

Let primary contacts invite additional people from their own institution to create their own portal login, restricted to the institution's email domain. Nothing in the existing admin invitation flow, registration approval flow, or login flow changes behavior.

## What the user sees

**Member dashboard (Index page), Institution Information card**
- A new card action appears **only for the signed-in primary contact** of an organization: "Invite a Colleague".
- Clicking opens a modal titled **Invite Colleagues from {Institution Name}**:
  - Short explainer: invited colleagues get a read-only member login for your institution. Only the primary contact can update the institution record and see billing.
  - Fields: First name, Last name, Email address.
  - A visible note listing the allowed email domain(s), e.g. "Invitations must use an @graceland.edu address."
  - Inline error if the typed email is outside the allowed domain — the Send button stays disabled.
  - A list of that organization's invitations with status (Pending / Accepted / Expired) plus **Resend** and **Revoke** for pending ones.
- Non-primary contacts never see the button or the modal.

**Invited colleague**
- Receives an email (sent through the existing centralized email delivery system) with a "Create your account" link.
- The link opens the existing login page in a new invitation mode: it shows their name/email (locked) and the institution, and asks them to set a password.
- After setting the password they are signed in and land on the member dashboard scoped to their institution. No admin approval step is needed, since the primary contact already vouched for them and the domain was verified.

## Domain rule

Allowed domains are derived from, in order of availability:
1. the primary contact's own login email domain,
2. the organization's contact email domain,
3. the organization's website domain.

Free/consumer domains (gmail.com, outlook.com, yahoo.com, hotmail.com, icloud.com, aol.com) are never used as an allowed domain; if the primary contact's own address is one of those and the organization has no institutional domain on file, the modal explains that invitations aren't available and to contact HESS staff.

The domain check runs in the browser for immediate feedback **and again on the server**, which is the enforcement point.

## Technical plan

**Database (additive only)**
- Extend `public.organization_invitations` with nullable columns: `invited_first_name text`, `invited_last_name text`, `status text default 'pending'`, `revoked_at timestamptz`. Existing rows and the admin UI are unaffected.
- Add RLS policies alongside the existing admin-only policy (no policy is dropped or altered):
  - SELECT / INSERT / UPDATE for the primary contact of the invitation's organization, via a new `SECURITY DEFINER` helper `public.is_org_primary_contact(_user_id uuid, _org_id uuid)` that checks `organizations.contact_person_id -> profiles.user_id` (avoids recursive RLS).
- Grants: `SELECT, INSERT, UPDATE` to `authenticated`, `ALL` to `service_role`.

**Edge functions (new, nothing existing modified)**
- `invite-organization-user`: validates the caller's JWT, confirms they are `contact_person_id` of the target org, recomputes the allowed domains server-side and rejects mismatches, rejects addresses that already have an account, creates the token + 7-day expiry row, and sends the email via `centralized-email-delivery`.
- `accept-organization-invitation`: public; validates token, expiry, unused, not revoked; creates the auth user with `raw_user_meta_data.organization` set to the exact existing organization name and `email_confirm: true`; marks the invitation used. Association happens through the existing `get_user_organization_ids` path (`profiles.organization = organizations.name`), and `handle_new_user` only creates an organization when the name doesn't already exist, so no duplicate org is created and no trigger changes are needed.

**Frontend**
- New `src/components/InviteColleagueModal.tsx` and `src/hooks/useColleagueInvitations.tsx` (separate from the admin `useOrganizationInvitations` hook so the admin screen is untouched).
- New `src/utils/orgEmailDomains.ts` for the shared domain derivation/validation used by the modal.
- `src/pages/Index.tsx`: render the invite button only when the signed-in user's profile id equals `userOrganization.contact_person_id`.
- `src/pages/Auth.tsx`: add one additive branch for `?invitation=<token>` that renders the set-password form; all existing login, reset, and registration branches are left as-is.

## Safety notes

- Invited users receive the standard `member` role, are not set as `contact_person_id`, and therefore keep read-only access to institution data, matching current member permissions.
- No changes to `handle_new_user`, `pending_registrations`, the admin invitation dialog, or any existing RLS policy.
