# Marketplace visual sources

Reviewed October 27, 2026. `lib/marketplace/vendorImages.ts` is the enumerated runtime inventory of external fallback URLs and their service use. Existing Unsplash images are used as category/event illustrations under the Unsplash license: https://unsplash.com/license. They do not identify or depict a listed business. Attribution is not a substitute for rights. No stock image is used as a business logo or testimonial. Direct image requests reach Unsplash hosting as disclosed in Privacy and Cookies & Storage.

Venue and rental scenes rotate between existing event-space photographs. Music illustrations alternate between performance/event-lighting imagery. Other recognized service categories use the existing relevant food, florals, camera, transport or event imagery. Categories where the former fallback implied an unrelated person/place now use the ARIVVIO placeholder. The runtime selector is deterministic by provider ID and category, never business name.

`public/marketplace-placeholder.svg` is an original code-drawn ARIVVIO monogram and geometric background created for this project. No third-party logo, font file or photograph is embedded. It is also the failed-image fallback.

Actual business imagery is held in `vendor_photos` with explicit media kind, rights basis, source URL, creator, attribution, review state/date and ordering. Vendor attestation stores the actor and time. Pending/rejected media is excluded publicly. The separate `pipeline/2026-10-27-media-candidates.json` contains unapproved research only and is not imported into the public media selector.

No new business-site photographs were copied or published in this pass. Future targeted work: obtain permission for specific cover/gallery assets, confirm any required credits, then approve via Admin. Retain original source records if assets are later migrated to ARIVVIO-controlled hosting.
