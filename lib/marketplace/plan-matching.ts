import { quoteItem, type MarketplaceItem, type ServiceName } from "@/app/data/marketplace";
import { normalizeSearchText } from "@/lib/event-intelligence/normalize";
import type { EventIntelligenceProfile } from "@/lib/event-intelligence/types";
import { relateServicesToStages } from "@/lib/event-intelligence/understanding";
import { evaluateEligibility } from "@/lib/vendor-demo/eligibility";
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
  const signals = getEventMatchSignals(item, profile);
  if (signals.concerns.length) return signals.concerns[0];
  if (matches.length) return `Matches your plan: ${matches.join(", ")}.`;
  return signals.reasons[0] ?? null;
}

export function scoreMarketplaceItemForPlan(item: MarketplaceItem, profile: EventIntelligenceProfile) {
  const services = new Set<ServiceName>([item.type, ...item.services]);
  const requestedServiceScore = profile.requestedServices.reduce(
    (total, service) => total + (services.has(service) ? 38 : 0),
    0,
  );
  return requestedServiceScore + getMatchedSpecificTerms(item, profile).length * 24 + getEventMatchSignals(item, profile).score;
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


// Rank from documented listing data. Demo schedules are not live availability.
export function getEventMatchSignals(item: MarketplaceItem, profile: EventIntelligenceProfile) {
  let score = 0;
  const reasons: string[] = [];
  const concerns: string[] = [];
  const services = new Set([item.type, ...item.services]);
  const relationships = relateServicesToStages(profile).filter(link => services.has(link.service) && link.source === "explicit-step-choice");
  const assigned = profile.stages.filter(stage => relationships.some(link => link.stageIds.includes(stage.id)));
  const guests = assigned.length ? Math.max(...assigned.map(stage => stage.guestCount ?? profile.planning?.guestCount ?? profile.guestSize ?? 0)) : profile.planning?.guestCount || profile.guestSize;
  if (guests) {
    if ((item.maxGuestCount !== undefined && guests > item.maxGuestCount) || (item.minGuestCount !== undefined && guests < item.minGuestCount)) { score -= 160; concerns.push("Guest count is outside this provider's stated capacity. Confirm fit."); }
    else if (item.maxGuestCount !== undefined) { score += 20; reasons.push("Within this provider's stated guest capacity."); }
  }
  const eventType = profile.recognition.profile.marketplaceEventType;
  if (eventType && item.events.includes(eventType)) score += 15;
  const eligibility = evaluateEligibility(item.marketplaceRules, undefined, { eventType, age: profile.audience.guestAgeMin });
  if (!eligibility.eligible) { score -= 200; concerns.push(...eligibility.reasons); }
  const budget = profile.planning?.budget;
  if (budget && profile.evidence.some(e => e.field === "planning.budget" && e.source !== "default")) {
    const estimate = quoteItem(item, { guests: guests || 0, startTime: profile.planning?.startTime, endTime: profile.planning?.endTime, durationHours: 0 });
    if (estimate > budget) { score -= 45; concerns.push("This provider's listed estimate exceeds your overall budget."); }
  }
  if (profile.planning?.date && item.databaseSource === true && item.blockedDates?.includes(profile.planning.date)) { score -= 200; concerns.push("The provider lists this date as blocked."); }
  return { score, reasons, concerns, availability: "Confirm with provider" };
}
