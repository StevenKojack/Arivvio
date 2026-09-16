import type { MarketplaceItem, ServiceName } from "@/app/data/marketplace";
import { normalizeSearchText } from "@/lib/event-intelligence/normalize";
import type { EventIntelligenceProfile } from "@/lib/event-intelligence/types";
import { getMarketplaceCapabilityTerms } from "./demo-capabilities";

export function rankMarketplaceItemsForPlan(
  items: MarketplaceItem[],
  profile: EventIntelligenceProfile,
) {
  return [...items].sort((left, right) =>
    scoreMarketplaceItemForPlan(right, profile) - scoreMarketplaceItemForPlan(left, profile),
  );
}

export function getPlanMatchReason(
  item: MarketplaceItem,
  profile: EventIntelligenceProfile | null,
) {
  if (!profile) return null;
  const matches = getMatchedSpecificTerms(item, profile).slice(0, 3);
  if (!matches.length) return null;
  return `Matches your plan: ${matches.join(", ")}.`;
}

function scoreMarketplaceItemForPlan(item: MarketplaceItem, profile: EventIntelligenceProfile) {
  const services = new Set<ServiceName>([item.type, ...item.services]);
  const requestedServiceScore = profile.requestedServices.reduce(
    (total, service) => total + (services.has(service) ? 38 : 0),
    0,
  );
  return requestedServiceScore + getMatchedSpecificTerms(item, profile).length * 24;
}

function getMatchedSpecificTerms(item: MarketplaceItem, profile: EventIntelligenceProfile) {
  const capabilityTerms = getMarketplaceCapabilityTerms(item);
  const intentTerms = Array.from(new Set([
    ...profile.cultures,
    ...profile.cuisines,
    ...profile.entertainment,
    ...profile.foodStyles,
    ...profile.transportationNeeds,
    ...profile.venuePreferences,
    ...profile.planSelections.flatMap((selection) => [
      ...selection.explicitLabels,
      ...selection.details.map((detail) => detail.label),
    ]),
  ].map(normalizeSearchText).filter((term) => term.length >= 3)));

  return intentTerms.filter((intent) => capabilityTerms.some((capability) =>
    capability === intent || capability.includes(intent),
  ));
}
