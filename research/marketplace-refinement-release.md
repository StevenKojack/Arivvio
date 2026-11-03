# Marketplace refinement release checkpoint

Starting canonical main: d33dfd046538a517d14057e344b6e1bc0e5fc44b.

Implemented: occasion arrow removal, separate Marketplace card surfaces, accessible stretched profile action, shared business identity badges, contained profile scrolling, cleaner profile sections, approved-only media selection, Admin media rights review, durable vendor upload attestation, cover/gallery ordering and customer preview. Existing real/Demo request routing remains unchanged.

Research: eight sourced Los Angeles candidates in the dated pipeline file. Export validates into the existing Admin JSON import format. No candidates were published and no outreach was sent. Three existing-business media research records remain rights-review candidates. No unlicensed business photography was copied or displayed.

Validation: 214 tests pass. TypeScript, ESLint and production build pass. Database fixtures cover private media candidates, Admin-only approval, explicit rights requirements, vendor upload attestation, cross-business ordering denial, and cover ordering. Scroll tests cover nested locks and exact position/style restoration. Public counts remain 18 businesses / 21 services plus 48 fictional Showcase providers.

Migration released November 3, 2026: the refreshed Supabase connection succeeded. The supported migration tool applied business_media as version 20261103160458. History contains it once. Production schema, constraints, approved-only public row visibility, retained team policies, enabled RLS and RPC grants were independently inspected. Existing inventory remains 18 businesses and zero photo records. No previous migration was rerun.

Live verification of the new UI, authenticated Admin/Vendor Hub interaction and mobile Safari scrolling remain incomplete. Unit/database checks do not substitute for those browser checks. No fake production user, claim, lead or vendor was created for testing.

Release validation: run the security/regression suite against the aligned migration filename, then merge PR #1 and verify production READY on the exact resulting main SHA. Authenticated browser media controls remain a separate acceptance gap until a supported session is available.
