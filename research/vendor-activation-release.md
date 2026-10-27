# Vendor activation release

Extends the existing acquisition workspace. Does not import inventory or send outreach.

## Controls
- Admin confirms a sourced fixed address against an explicitly selected Mapbox permanent-geocoding address result. No city or fixture fallbacks. Results require a second confirmation before coordinates are saved. Permanent-geocoding access must be available on the configured Mapbox account. Existing list discovery remains usable without coordinates.
- Private contact history records actual date, channel, outcome, note, optional related concierge lead, follow-up, actor and retry key. Copying text creates no contact record. No edit/delete history feature is introduced.
- Plans and contact outcomes are separate from publication, claim and verification records. Existing claims and verification drive progress. Suppression blocks preparation, contact recording and actionable follow-ups, including after a screen becomes stale.
- General outreach implies no customer interest. Customer-interest text requires an active lead for this business and includes only event type and city. No customer name, guest data, title or private notes enter the generated message. All text remains editable. Nothing sends automatically.
- Vendor checklist uses existing editors. Readiness means verified authority, an approved listing, a summary, operating city, active service and vacation mode off. Prices, photos and scheduled availability are optional improvements. Readiness guidance does not replace existing verification/membership enforcement or guarantee availability.
- Business/service intent survives sign-in and saving a browser plan. The saved event links back to the original business inquiry. Existing concierge handoff remains idempotent.

## Verification
205 tests passed including full database fixtures for claim evidence, unchanged business identity, owner access, concierge handoff, history privacy, suppression, explicit coordinate confirmation and retry safety. TypeScript, ESLint and production build passed.

Authenticated production Admin and Vendor Hub browser checks and mobile viewport checks were not available. Database fixtures cover authorization and lifecycle behavior, but do not substitute for visual mobile acceptance. No fake verified business, outreach record or customer lead was created in production. No production pin was assigned without an authenticated Admin review.

Next: Steven-approved small manual outreach pilot after an authenticated desktop/mobile walkthrough and one factual venue address confirmation. Do not automate outreach.

Production migration: `20261027031606_vendor_activation.sql`, applied before dependent code. Post-migration Admin RPC returned 18 businesses, zero contact attempts, zero plans and zero confirmed pins. Anonymous execution and direct authenticated table insertion remain denied. Security advisories are unchanged from before this release.
