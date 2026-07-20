import type { MarketplaceItem, ServiceName } from "@/app/data/marketplace";
import { normalizeSearchText } from "./search";

export type EventPlanningContext = {
  activityFocused: boolean;
  age?: number;
  budget?: number;
  cultures: string[];
  genderContext?: "boy" | "girl";
  homeEvent: boolean;
  lifeStage?: "kids" | "teen" | "adult";
  locationContext?: string;
  rawText: string;
  subtype?: string;
};

const cultureTerms = [
  "armenian",
  "mexican",
  "persian",
  "filipino",
  "korean",
  "japanese",
  "indian",
  "jewish",
  "latin",
];

const activityTerms = [
  "activity",
  "activities",
  "active",
  "games",
  "go kart",
  "go-kart",
  "kart",
  "racing",
  "arcade",
  "bowling",
  "trampoline",
  "escape room",
  "paintball",
  "laser tag",
  "play",
];

const homeTerms = [
  "home",
  "house",
  "backyard",
  "pool party",
  "my place",
  "private address",
  "not leaving",
  "at our place",
];

const formalVenueTags = [
  "banquet",
  "ballroom",
  "conference",
  "convention",
  "corporate",
  "expo",
  "formal",
  "gala",
  "historic",
  "luxury",
  "theatre",
  "wedding",
];

const activityVenueTags = [
  "activity",
  "arcade",
  "birthday",
  "bowling",
  "family-friendly",
  "go-kart",
  "indoor-play",
  "kids",
  "laser-tag",
  "play",
  "racing",
  "teen",
];

const kidsTags = ["kids", "child", "children", "family-friendly", "bounce-house", "indoor-play"];

export function derivePlanningContext(input: {
  budget?: number | string | null;
  eventLabel?: string | null;
  locationContext?: string | null;
  locationText?: string | null;
  notes?: string | null;
}) {
  const rawText = [input.eventLabel, input.notes, input.locationText, input.locationContext]
    .filter(Boolean)
    .join(" ");
  const normalizedText = normalizeSearchText(rawText);
  const age = getAge(normalizedText);
  const cultures = cultureTerms.filter((culture) => normalizedText.includes(culture));
  const budget = Number(input.budget);
  const lifeStage =
    age && age <= 12
      ? "kids"
      : age && age <= 17
        ? "teen"
        : /\b(kids|children|child|toddler)\b/.test(normalizedText)
          ? "kids"
          : /\b(teen|teenager|high school|sweet sixteen|sweet 16)\b/.test(normalizedText)
            ? "teen"
            : undefined;

  return {
    activityFocused: activityTerms.some((term) => normalizedText.includes(term)),
    age,
    budget: Number.isFinite(budget) && budget > 0 ? budget : undefined,
    cultures,
    genderContext: /\bboy\b/.test(normalizedText)
      ? "boy"
      : /\bgirl\b/.test(normalizedText)
        ? "girl"
        : undefined,
    homeEvent:
      homeTerms.some((term) => normalizedText.includes(term)) ||
      ["likely_home", "home", "private", "private_address"].includes(
        normalizeSearchText(input.locationContext ?? ""),
      ),
    lifeStage,
    locationContext: input.locationContext ?? undefined,
    rawText: normalizedText,
    subtype: getSubtype(normalizedText),
  } satisfies EventPlanningContext;
}

export function getContextDetails(context: EventPlanningContext) {
  return [
    context.subtype ? ["Subtype", context.subtype] : null,
    context.age ? ["Age", String(context.age)] : null,
    context.lifeStage ? ["Life stage", context.lifeStage] : null,
    context.genderContext ? ["Guest context", context.genderContext] : null,
    context.activityFocused ? ["Preference", "activity-focused"] : null,
    context.homeEvent ? ["Setting", "home/private"] : null,
    context.cultures.length ? ["Culture/style", context.cultures.join(", ")] : null,
  ].filter(Boolean) as Array<[string, string]>;
}

export function getContextServices(context: EventPlanningContext) {
  const services = new Set<ServiceName>();

  if (context.activityFocused || context.lifeStage === "teen") {
    services.add("Venue");
    services.add("Catering");
    services.add("Cake & Desserts");
    services.add("Photo Booth");
  }

  if (context.homeEvent) {
    services.delete("Venue");
    services.add("Catering");
    services.add("Cake & Desserts");
    services.add("Rentals");
    services.add("Cleaning");
  }

  if (context.lifeStage === "kids") {
    services.add("Bounce Houses");
    services.add("Character Performers");
  }

  if (context.rawText.includes("bachelor")) {
    services.add("Party Bus");
    services.add("Transportation");
    services.add("Bartending");
  }

  return Array.from(services);
}

export function isMarketplaceItemCompatible(
  item: MarketplaceItem,
  context: EventPlanningContext,
) {
  const tags = getItemTerms(item);
  const explicitlyAskedForVenue =
    /\b(venue|hall|banquet|ballroom|auditorium)\b/.test(context.rawText);

  if (context.homeEvent && item.type === "Venue" && !explicitlyAskedForVenue) {
    return false;
  }

  if (
    context.activityFocused &&
    context.lifeStage === "teen" &&
    item.type === "Venue" &&
    !hasAny(tags, activityVenueTags) &&
    !explicitlyAskedForVenue
  ) {
    return false;
  }

  if (
    context.lifeStage === "teen" &&
    item.type === "Venue" &&
    hasAny(tags, formalVenueTags) &&
    !hasAny(tags, activityVenueTags) &&
    !explicitlyAskedForVenue
  ) {
    return false;
  }

  if (context.rawText.includes("bachelor") && hasAny(tags, kidsTags)) {
    return false;
  }

  return true;
}

export function scoreMarketplaceContext(
  item: MarketplaceItem,
  context: EventPlanningContext,
) {
  const tags = getItemTerms(item);
  let score = 0;

  if (context.lifeStage && tags.has(context.lifeStage)) {
    score += 22;
  }

  if (context.lifeStage === "teen" && hasAny(tags, ["teen", "activity", "racing", "arcade"])) {
    score += 28;
  }

  if (context.activityFocused && hasAny(tags, activityVenueTags)) {
    score += 28;
  }

  if (context.homeEvent && item.type !== "Venue") {
    score += 18;
  }

  if (context.cultures.some((culture) => tags.has(culture))) {
    score += 16;
  }

  if (context.budget && item.budgetTier === "economy") {
    score += context.budget < 4000 ? 12 : 4;
  }

  if (context.budget && item.budgetTier === "luxury" && context.budget < 8000) {
    score -= 18;
  }

  if (context.lifeStage === "teen" && hasAny(tags, formalVenueTags)) {
    score -= 18;
  }

  return score;
}

function getAge(text: string) {
  const ageMatch =
    text.match(/\b([1-9]|1[0-9]|20)\s*(year old|years old|yr old|yo|y o)\b/) ??
    text.match(/\bturning\s+([1-9]|1[0-9]|20)\b/) ??
    text.match(/\b([1-9]|1[0-9]|20)\s*(st|nd|rd|th)?\s+birthday\b/);
  const value = Number(ageMatch?.[1]);

  return Number.isFinite(value) ? value : undefined;
}

function getSubtype(text: string) {
  if (text.includes("pool party")) {
    return "pool party";
  }

  if (text.includes("bachelor")) {
    return "bachelor party";
  }

  if (text.includes("sweet 16") || text.includes("sweet sixteen")) {
    return "sweet sixteen";
  }

  if (text.includes("backyard")) {
    return "backyard event";
  }

  return undefined;
}

function getItemTerms(item: MarketplaceItem) {
  return new Set(
    [
      item.type,
      item.name,
      item.location,
      item.address,
      ...item.events,
      ...item.services,
      ...(item.tags ?? []),
      ...(item.cultures ?? []),
      ...(item.serviceOptions?.flatMap((option) => [
        option.service,
        option.title,
        option.description,
      ]) ?? []),
    ].map((value) => normalizeSearchText(value)),
  );
}

function hasAny(values: Set<string>, terms: string[]) {
  return terms.some((term) => values.has(term) || values.has(normalizeSearchText(term)));
}
