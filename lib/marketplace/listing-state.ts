import type { MarketplaceItem } from "@/app/data/marketplace";
// Account identity, ownership verification and lead delivery remain separate from a public listing.
export function listingPresentation(item:Pick<MarketplaceItem,"listingState"|"databaseSource">) {
  if(item.listingState === "unclaimed") return {label:"Unclaimed public listing",description:"This business has not claimed this listing. An ARIVVIO partnership, availability and response are not confirmed.",canRequest:false};
  if(item.listingState === "demo" || item.databaseSource === false) return {label:"Demo listing",description:"Pricing, capabilities and scheduling are illustrative, not a verified business offer.",canRequest:true};
  if(item.listingState === "claimed") return {label:"Business-managed listing",description:"Confirm pricing and availability with the provider before booking.",canRequest:true};
  return {label:"Provider listing",description:"Contact the provider to confirm pricing and availability.",canRequest:true};
}
