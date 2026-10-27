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
      label: "Unclaimed Business",
      description:
        "This business has not claimed its ARIVVIO profile yet. Pricing, availability and responses have not been confirmed.",
      canRequest: false,
    };
  if (item.listingState === "demo" || item.databaseSource === false)
    return {
      label: "Fictional Demo Business",
      description:
        "Fictional example business. Prices and schedules are illustrative. Requests and responses are simulated. No real provider is contacted.",
      canRequest: true,
    };
  if (item.listingState === "claimed" && item.verificationStatus === "verified")
    return {
      label: "Claimed Business",
      description:
        "ARIVVIO reviewed business authority. Verification does not guarantee quality, licensing, insurance, availability or fulfillment. Confirm pricing and availability with the provider.",
      canRequest: true,
    };
  if (item.listingState === "claimed")
    return {
      label: "Claimed Business · Verification pending",
      description:
        "Business verification review required. Direct requests are unavailable until review is complete.",
      canRequest: false,
    };
  return {
    label: "Claimed Business · Verification pending",
    description: "Authority verification is pending. Direct requests are unavailable.",
    canRequest: false,
  };
}
