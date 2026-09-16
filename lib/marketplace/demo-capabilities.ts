import type { MarketplaceItem } from "@/app/data/marketplace";
import { normalizeSearchText } from "@/lib/event-intelligence/normalize";

const demoCapabilities: Record<number, string[]> = {
  37: ["arcade", "activity venue", "teen birthday", "modern"],
  38: ["kids activity center", "indoor and outdoor", "family birthday"],
  39: ["armenian catering", "armenian cuisine", "mediterranean", "family style"],
  40: ["latin dj", "spanish", "quinceanera", "dance music"],
  41: ["armenian live music", "traditional music", "ceremony music"],
  43: ["party bus", "sprinter van", "multi stop route", "late night return"],
  44: ["backyard rentals", "tables", "chairs", "tents", "portable restrooms"],
  49: ["armenian dj", "top 40", "modern armenian", "english", "armenian", "live mixing"],
  50: ["mexican catering", "mexican cuisine", "taco cart", "buffet", "family style"],
  51: ["raceway", "go karts", "racing", "activity venue", "teen birthday"],
};

export function getMarketplaceCapabilityTerms(item: MarketplaceItem) {
  return Array.from(new Set([
    item.name,
    item.type,
    item.description,
    ...item.services,
    ...(item.tags ?? []),
    ...(item.cultures ?? []),
    ...(item.languages ?? []),
    ...(item.serviceOptions?.flatMap((option) => [option.title, option.description, option.service]) ?? []),
    ...(item.databaseSource === false ? demoCapabilities[item.id] ?? [] : []),
  ].map(normalizeSearchText).filter(Boolean)));
}
