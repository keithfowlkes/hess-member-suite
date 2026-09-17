# Business Partners Area

A new section of the portal that showcases HESS vendor partners. Each partner gets a styled microsite page with logo, banner, description, categories, contacts, downloadable files, and a member-only offers section.

## Who sees what

| | Public visitor | Logged-in member | Admin |
|---|---|---|---|
| Partner directory (logo, name, blurb, categories, search) | Yes | Yes | Yes |
| Full microsite page (banner, rich description, website link) | Yes | Yes | Yes |
| Partner contacts (name, title, email, phone) | No | Yes | Yes |
| Downloadable files (PDFs, one-pagers) | No | Yes | Yes |
| HESS member-only offers / discounts | No | Yes | Yes |
| Create, edit, publish, delete partners | No | No | Yes |

Public visitors see a "Sign in to view contacts, files and member offers" prompt in place of the gated blocks.

## Pages

- `/partners` — public directory: search box, category filter chips, card grid of published partners (logo, name, blurb, categories).
- `/partners/:slug` — public microsite: banner, logo, rich-text description, website button, categories, then gated sections (contacts, files, member offers).
- `/members/partners` and `/members/partners/:slug` — same components inside the authenticated portal shell, with the gated sections unlocked. Added to the member sidebar as "Business Partners".
- `/admin/partners` — admin management: list with draft/published status, create/edit partner, manage contacts, upload files, edit member offers, reorder featured partners, delete.

## Admin editor

A tabbed dialog matching the portal's existing folder-tab styling:

1. **Profile** — name, slug, short blurb, logo upload, banner upload, website, categories/tags, featured toggle, published toggle.
2. **Microsite** — rich-text description using the portal's existing editor.
3. **Contacts** — repeatable rows: name, title, email, phone.
4. **Files** — upload PDFs and docs with a display title and description; reorder and delete.
5. **Member Offers** — rich text shown only to signed-in users.

## Technical notes

**Database (new tables, all with RLS and Data API grants):**

- `business_partners` — name, slug (unique), short_description, description_html, member_offer_html, logo_url, banner_url, website_url, categories (text[]), is_featured, display_order, is_published, created_by.
- `business_partner_contacts` — partner_id, name, title, email, phone, display_order.
- `business_partner_files` — partner_id, title, description, file_path, file_name, mime_type, size_bytes, display_order.

**Access rules:**

- `business_partners`: `anon` and `authenticated` may read rows where `is_published = true`; admins/superadmins have full write via `has_role(auth.uid(),'admin')`. Public read must exclude gated columns, so the anon path reads through a security-definer view `public_business_partner_directory` that omits `member_offer_html`; `authenticated` reads the base table directly.
- `business_partner_contacts` / `business_partner_files`: readable only by `authenticated` (partner published), writable only by admins. No `anon` grant.

**Storage:** new public bucket `partner-assets` for logos and banners; new private bucket `partner-files` for documents, with downloads served through short-lived signed URLs requested only for authenticated users.

**Frontend:**

- `src/hooks/useBusinessPartners.tsx` — list, single-by-slug, and admin mutation hooks via react-query, following the existing hook patterns.
- `src/components/partners/` — `PartnerCard`, `PartnerDirectory`, `PartnerMicrosite`, `PartnerGatedSection`, `PartnerFileList`, `PartnerAdminDialog`.
- `src/pages/BusinessPartners.tsx`, `BusinessPartnerDetail.tsx`, `AdminBusinessPartners.tsx`; routes registered in `App.tsx` (public routes outside `ProtectedRoute`, member/admin routes inside it).
- Rich-text output sanitised with DOMPurify, as `PublicPageManager` already does.
- Navigation entries added to `AppSidebar` (member + admin sections).

## Out of scope for this pass

- Partner self-service logins (admins maintain all pages).
- Lead-capture forms or click analytics per partner.
