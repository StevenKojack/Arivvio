import type { MarketplaceItem } from "@/app/data/marketplace";
// Account identity, ownership verification and lead delivery remain separate from a public listing.
export function listingPresentation(
  item: Pick<
    MarketplaceItem,
    "listingState" | "databaseSource" | "verificationStatus"
  >,
) {
  if (item.listingState === "unclaimed")
    return {
      label: "Public business listing",
      description:
        "This business has not claimed its ARIVVIO profile yet. Pricing, availability and responses have not been confirmed.",
      canRequest: false,
    };
  if (item.listingState === "demo" || item.databaseSource === false)
    return {
      label: "Demo listing",
      description:
        "Pricing, capabilities and scheduling are illustrative, not a verified business offer.",
      canRequest: true,
    };
  if (item.listingState === "claimed" && item.verificationStatus === "verified")
    return {
      label: "Verified business",
      description:
        "ARIVVIO reviewed business authority. Verification does not endorse service quality. Confirm pricing and availability with the provider.",
      canRequest: true,
    };
  if (item.listingState === "claimed")
    return {
      label: "Business-managed listing",
      description:
        "Business verification review required. Direct requests are unavailable until review is complete.",
      canRequest: false,
    };
  return {
    label: "Provider listing",
    description: "Contact the provider to confirm pricing and availability.",
    canRequest: true,
  };
}
