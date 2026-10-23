# Privacy, accessibility and launch-readiness release

This is product and engineering work, not a legal compliance certification. Policies and controls were aligned to current product behavior; attorney review is still required before commercial launch.

| CTO review area | Implementation and evidence |
| --- | --- |
| Starting production head | `bc7784674e4c08f31b03cf5b9459faa0ae865e76` before Phase A. |
| Trusted business branch status | Released to main as `4196895469c25601a926c574d1de05dcf761dca0`. |
| Trust migration | Applied `20261022201835_trusted_business_intake` and `20261022201843_local_business_pilot`. |
| Real business pilot | Scooter’s Jungle El Segundo, The Ebell and NOOR. Public-source facts rechecked. Ownerless, unverified listings with no fabricated prices, availability or reviews. |
| Trust release verification | Production database RLS and request guard checked. Public claim search and NOOR page checked in browser. Authenticated boundaries covered by local database tests. |
| Data inventory | `lib/privacy/services.ts` inventories services, storage, data and triggers. Public policy covers accounts, events, guests, conversations, business evidence and concierge leads. |
| Privacy policy | Rewritten around actual pre-beta practices and request-based data rights. No invented statutory applicability, zero-retention or automatic-deletion promises. |
| Terms | Current account, business authority, estimates, booking, content-rights and AI limitations. No payment collection. |
| Cookies / local storage | `/cookies` plus device storage summary and scoped clearing in `/account/privacy`. Authentication and Mapbox storage remain separate. |
| Cookie consent decision | No analytics/ad SDK found in package/source inventory. No generic banner added. Optional Mapbox performance metrics disabled. Operational mapping and externally hosted images remain disclosed. Full third-party network/HttpOnly-cookie audit and jurisdictional consent review remain launch follow-ups. |
| Form consent | Unchecked legal and 18+ signup controls. Unchecked authority declarations for claims. Contact-purpose notice without marketing enrollment. Explicit photo-rights confirmation before upload. |
| Legal acceptance versioning | Version `2026-10-22`. Signup trigger records declared versions and timestamp before email confirmation. Authenticated profile completion binds the immutable declaration. Existing users are not silently represented as having accepted this version. |
| Data minimization | Individual honoree age, due date and gender controls removed from planning modal. No signup birth date. Broad event audience context remains. |
| Privacy & Data Center | Device clearing, signed-in access/correction/deletion requests, visible status and responses. Local clearing preserves authentication and unrelated storage. |
| Deletion requests | Authenticated owner-bound request queue. Submission does not delete data. Pending requests can be cancelled. No destructive deletion script. |
| Admin privacy requests | Separate private notes and user-visible response. Completion requires confirmation that actual processing has happened. |
| Third-party services | Supabase, Vercel, Mapbox, OpenAI API, Upstash and Unsplash image hosting. |
| AI / map privacy | Existing OpenAI `store: false` retained without claiming zero retention. Location queries and browser permission disclosed. Map performance metrics disabled. |
| Dark pattern review | No prechecked consents, automatic email fallback or implied deletion. Clear/keep choice and status messages. Payments and marketing remain disabled. |
| Pricing / fees | Known setup and travel fees included in estimates. Separate fee disclosure and confirmation of tax/optional charges. Unit tests cover flat, hourly minimum and per-guest arithmetic. |
| Refund status | No customer payments or deposits collected. Future payment gate requires cancellation/refund and merchant details. |
| Reviews / unsupported claims | Removed rating display from marketplace cards/map popups. Real providers retain zero synthetic review data. Demo and unclaimed business labels remain. |
| Age policy | 18+ account, vendor and claim attestations. No child-account or parental-consent infrastructure. |
| Guest data | Guest contact details optional, authorization notice added, unnecessary child identifiers discouraged. |
| Business details | Configuration supports real operator/contact/address. Missing details are not invented. Commercial launch requires owner-supplied legal business details. |
| Contact email cleanup | Personal Gmail fallback removed from customer contact flow. Existing admin authorization identity unchanged. |
| Email / unsubscribe release gate | Marketing remains off. Requirements include postal address, sender, unsubscribe, suppression and separation from transactional messages. Admin do-not-contact state blocks concierge outreach updates and handoffs. No outreach sent. |
| Content rights | Narrow operational license in Terms. Explicit upload-rights confirmation and file type/size checks. |
| Font / image licensing | System font stack replaces framework-internal font files. `docs/asset-provenance.json` inventories existing Unsplash image IDs and source locations. Individual photographer/source-page attribution and model/property clearance are not claimed complete and require review before commercial repackaging. |
| Accessibility | Skip navigation, main targets, visible focus, reduced motion, improved gold contrast, explicit card controls, form labels and statuses. This is a targeted pass, not WCAG certification. |
| Keyboard / focus | Removed nested article-button semantics. Provider dialog restores prior focus. Native controls retain keyboard behavior. Live keyboard checks verified skip-to-main focus, provider modal Enter/Escape and restored focus. |
| Contrast | Dark/light gold tokens adjusted and placeholders use explicit muted color. Full route/state contrast matrix remains outside this targeted pass. |
| Alt text | Illustrative imagery identified separately from business photography. Uploaded photo gallery has business-specific accessible descriptions. |
| Security headers | Nosniff, strict-origin referrer policy, SAMEORIGIN framing and limited camera/microphone/geolocation permissions. No untested CSP added. |
| RLS / privacy security | Own-profile reads, admin queue, private internal notes, no direct writes, anonymous denial, daily request cap and duplicate-open guard. No self-attestation grants business ownership. |
| Tests | 169 automated tests pass, including local PostgreSQL privacy isolation, immutable acceptance, authority declarations and suppression enforcement. |
| Typecheck / lint / build | Passed during preparation. Final release check results recorded in the release response. |
| Commit SHA / deployment | Database migration `20261023022245_privacy_launch_controls` applied. Initial Phase B release `f71942b564921117a0b682a6695e3c7dc1af1af2` deployed READY as `dpl_55t8NJ1hPSRu9okqR9MubKkBAxCm`. The follow-up commit reuses the browser auth client and synchronizes the storage summary. Its final SHA/deployment is recorded in the release response. |
| Live verification / runtime errors | Phase A verified as above. Twelve public routes returned HTTP 200 and security headers were verified. Privacy center, storage notice, unchecked signup consent, marketplace and keyboard dialog/skip behavior verified live. Fresh browser reported zero readable cookies and no sign-in/Mapbox storage. Map showed a preview with zero pins, so third-party Mapbox activity was not verified. No Vercel error/fatal logs found for the initial Phase B deployment in the checked window. Browser duplicate-auth-client warning prompted the follow-up fix. No live signed-in user flow is claimed. |
| Counsel review required | Privacy/terms, retention and deletion handling, consent applicability, age policy, business identity, licensing, fee disclosures and future marketing/payment requirements. |
| Deferred | Automated deletion, payments, reviews, marketing, parental consent, bulk listing ingestion, automated external verification and complete accessibility certification. |
| Next recommended pass | Operator-supplied legal identity/contact details, authenticated user acceptance testing, image provenance completion and counsel-led commercial launch review. |

## Deployment order and rollback

Apply the reviewed `privacy_launch_controls` migration only after the application build passes. It adds new tables and wrappers and requires current signup declarations. Deploy the paired application immediately afterward to minimize the interval in which old signup forms cannot create accounts. Existing accounts remain usable. Do not roll back to an old signup form without a coordinated forward database change. No user, booking, request or audit history is removed.

## Security advisory follow-up

The existing [leaked-password protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) remains an Auth configuration follow-up. The two [RLS-without-policy informational notices](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) concern private internal notes and contact suppression. They intentionally deny direct API access and are accessed only through authorization-checked functions. No permissive policy was added merely to hide these notices.
