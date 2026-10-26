# Los Angeles acquisition batch, reviewed October 26, 2026

The JSON contains manually researched public business facts and original ARIVVIO summaries. Sources were opened and reviewed on the recorded date. No business photos, reviews, testimonials or marketing paragraphs were copied. No outreach was sent.

15 business locations were imported through acquisition_operation as research drafts, advanced through review and ready, then deliberately published. Production now has 18 unclaimed businesses and 21 service records across 14 categories. VOX and Rent For Event have multiple services under one business UUID. Porto's Burbank and Glendale are separate sourced branches, not a duplicate identity.

All new records have owner_id NULL and verification_status unverified. All prices, schedules and coordinates remain unknown. The existing numeric radius default is not presented for unclaimed businesses. Traveling providers use operating/service city, not invented storefront pins. New map-coordinate confirmation UI is deferred. No map coordinates were written.

## Admin workflow

Admin > Public Listings > Business acquisition provides JSON preview and draft import, workflow transitions, source freshness, service/city coverage, search, source links, listing-specific claim links, editable outreach and suppression checks. Import accepts 1–50 records and submits each separately with accurate outcomes. Retry identity includes business name, city, street, branch and official domain. It does not overwrite previous research. Publication rechecks existing identities under a transaction lock and requires a reason for potential duplicates. A shared franchise domain alone does not force a merge.

Publication always uses the existing trusted listing operation. The new table has Admin-only read access and RPC-only writes. Source review is separate from ownership verification. Rechecking source facts does not establish licensing, insurance, quality or authority.

Import uses the existing taxonomy. The Lou Effect's sourced video capability is described in its summary, while Photography is its discovery category because the current taxonomy has no separate Videography category.

## Validation and release evidence

Starting canonical main: 3147cef137f92d7cb485e227b24e5701452b8284.
Production migration: 20261026214746_business_acquisition.sql. The local filename matches the timestamp assigned by the migration tool. Existing migrations were not rerun.

Production database access initially failed with SQLSTATE 28P01. It recovered through the existing connector without credential changes. Schema, migration order, inventory and provenance were inspected before the additive migration. Starting inventory: three published unclaimed/unverified venues, four provenance records, zero claims and zero concierge leads. Account profiles stayed at one through import/publication. Final provenance count: 24. No customer/vendor history was deleted.

Local suite: 195 tests, including Admin authorization, retry handling, branch separation, publication, multi-service identity, source validation, freshness, suppression and retention of 48 Showcase fixtures alongside 25 real test providers. TypeScript, ESLint and production build checked.

Production public UI was inspected before release and showed 3 real listings and 48 fictional examples after loading. Authenticated Admin browser testing is unavailable. Local browser testing was attempted but Chromium installation failed in this environment. Desktop/mobile interaction checks of the changed Admin surface remain unverified.

Security advisor: existing informational notices for two private RPC-only tables and existing leaked-password-protection warning. No credential/authentication settings were changed.

Next focused work: verify authenticated Admin workflow on desktop/mobile, confirm licensed fixed-location map coordinates, then manually invite the sourced businesses and measure claims. Do not start automated outreach.
