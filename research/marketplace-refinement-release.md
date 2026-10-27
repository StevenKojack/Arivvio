# Marketplace refinement release checkpoint

Starting canonical main: d33dfd046538a517d14057e344b6e1bc0e5fc44b.

Implemented: occasion arrow removal, separate Marketplace card surfaces, accessible stretched profile action, shared business identity badges, contained profile scrolling, cleaner profile sections, approved-only media selection, Admin media rights review, durable vendor upload attestation, cover/gallery ordering and customer preview. Existing real/Demo request routing remains unchanged.

Research: eight sourced Los Angeles candidates in the dated pipeline file. Export validates into the existing Admin JSON import format. No candidates were published and no outreach was sent. Three existing-business media research records remain rights-review candidates. No unlicensed business photography was copied or displayed.

Validation: 214 tests pass. TypeScript, ESLint and production build pass. Database fixtures cover private media candidates, Admin-only approval, explicit rights requirements, vendor upload attestation, cross-business ordering denial, and cover ordering. Scroll tests cover nested locks and exact position/style restoration. Public counts remain 18 businesses / 21 services plus 48 fictional Showcase providers.

Release blocker: the connected Supabase apply_migration tool returned `Invalid or expired requestState` twice. The migration history and schema were checked after the first failure and showed no changes. Do not deploy dependent code until `20261027160000_business_media.sql` is applied through the supported migration tool and verified. No old migration was rerun. Canonical main and production are intentionally held at the starting commit.

Live verification of the new UI, authenticated Admin/Vendor Hub interaction and mobile Safari scrolling remain incomplete. Unit/database checks do not substitute for those browser checks. No fake production user, claim, lead or vendor was created for testing.

Resume: restore the Supabase migration connection, recheck migration history, apply only the missing media migration, align the tracked filename with the tool-assigned version, run the focused database tests, merge to canonical main, confirm Vercel READY and exact SHA, then inspect public desktop/mobile cards and profiles plus authenticated media controls where access is available.
