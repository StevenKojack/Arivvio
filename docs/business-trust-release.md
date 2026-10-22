# Business trust release

Status: prepared for review, not deployed. Automatic approval review blocked the production migration pending explicit authorization. Do not merge the application before the database migration is applied.

## Release contents

- Search-first business intake with contextual duplicate review and private, ownerless candidates.
- Separate business identity, claimant authority, publication and membership states.
- Admin-reviewed evidence, exact confirmed domain email association, manual callback and registry review. Domain association alone never grants authority.
- Scoped owner, admin, manager and staff membership with email-bound invitations, expiry and revocation.
- Disputes and suspensions withdraw publication and management access while preserving history.
- Verified providers with active owner membership are required for new direct requests. Unclaimed listings retain concierge routing.
- Legacy owners retain reviewable membership and receive pending authority-review claims without a verified badge.

## Database and rollout

Target: ARIVVIO Supabase project `hfkgqgdtotslloeuskii`.

1. `20261021180518_trusted_business_intake.sql`: adds trust tables and fields, backfills legacy membership and pending review claims, replaces authorization policies and functions, restricts direct writes, and adds auditable review operations.
2. `20261021232809_local_business_pilot.sql`: adds three publicly sourced, unclaimed venue listings with provenance. No fabricated prices, ratings, availability or owners. Duplicate detection aborts conflicting imports.
3. Release the reviewed application commit only after database success. Verify intake, admin review, membership, revocation and request routing against production accounts before announcing availability.

The last production read found zero businesses, claims, concierge leads, quote requests and bookings. Recheck before execution. Schema and access-control changes affect live authorization. Use a database backup and a forward corrective migration for recovery, not destructive table drops. Keep the prior application deployment available, but assess compatibility before rolling it back.

## Validation and remaining work

145 automated tests pass, including migrations, legacy backfill, approval evidence, takeover prevention, role boundaries, invitation binding, revocation, disputes, anonymous isolation, concierge handoff and pilot provenance. Type checking, lint and production compilation are release gates. No new live browser flow has been verified because this release is not deployed.

DNS verification and external registry automation are deferred. Manual independent-source review is supported. Existing leaked-password protection is an Auth configuration follow-up. No outreach has been sent.
