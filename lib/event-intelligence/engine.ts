import type { ServiceName } from "@/app/data/marketplace";
import { planningPreferenceCatalog } from "@/lib/planning-taxonomy";
import { toSelectedPreference } from "@/lib/planning-taxonomy/search";
import type {
  PlanningPreference,
  SelectedPlanningPreference,
} from "@/lib/planning-taxonomy/types";
import { derivePlanningContext } from "./context";
import { normalizeSearchText } from "./normalize";
import { recognizeEventIntent } from "./search";
import { getContextualPlanningSuggestions } from "./suggestions";
import { getInitialStages } from "./stages";
import type {
  AudienceProfile,
  EventIntelligenceProfile,
  EventStage,
} from "./types";

export type EventIntelligenceInput = {
  audience?: AudienceProfile;
  guestSize?: number;
  inferPreferencesFromQuery?: boolean;
  locationContext?: string;
  preferences?: SelectedPlanningPreference[];
  query: string;
  selectedServices?: ServiceName[];
  stages?: EventStage[];
};

export function buildEventIntelligenceProfile(
  input: EventIntelligenceInput,
): EventIntelligenceProfile {
  const recognition = recognizeEventIntent(input.query || "Private party");
  const context = derivePlanningContext({
    eventLabel: input.query,
    locationContext: input.locationContext,
  });
  const inferredPreferences = input.inferPreferencesFromQuery === false
    ? []
    : inferPlanningPreferences(input.query);
  const preferences = mergePreferences(input.preferences ?? [], inferredPreferences);
  const inferredIds = new Set(preferences.filter((item) => item.selectionSource === "explicit-text").map((item) => item.id));
  const stages = input.stages ?? getInitialStages(recognition);
  const audience = mergeAudience(inferAudienceFromQuery(input.query, recognition.identity.canonicalEventType), input.audience);
  const rawRequestedServices = unique([
    ...(input.selectedServices ?? []),
    ...preferences.flatMap((item) => item.linkedService ? [item.linkedService] : []),
  ]);
  const venuePreferences = preferences.filter((item) => item.type === "location").map((item) => item.label);
  const homeEvent = context.homeEvent || preferences.some((item) => ["At home", "Backyard"].includes(item.label));
  const requestedServices = rawRequestedServices.filter((service) => !(homeEvent && service === "Venue"));
  const normalizedQuery = normalizeSearchText(input.query);
  const knownVenueInText = /\b(at|in) (a |the )?(church|banquet hall|reception hall|restaurant|hotel|ballroom)\b/.test(normalizedQuery);
  const knownVenueContext = ["business", "church", "has_venue", "likely_venue"].includes(input.locationContext ?? "");
  const contextualSuggestions = getContextualPlanningSuggestions(recognition, audience);
  const recommendationScores: Partial<Record<ServiceName, number>> = {};

  contextualSuggestions.forEach((item, index) => {
    if (item.linkedService) recommendationScores[item.linkedService] = Math.max(62, 96 - index * 5);
  });
  recognition.profile.recommendedVendors.forEach((service) => {
    recommendationScores[service] = Math.max(recommendationScores[service] ?? 0, 72);
  });
  if (homeEvent) {
    recommendationScores.Rentals = 99;
    recommendationScores.Catering = 98;
    recommendationScores.Cleaning = 97;
  }
  if (stages.length > 1) recommendationScores.Transportation = 96;

  const evidence: EventIntelligenceProfile["evidence"] = [
    {
      confidence: recognition.confidence,
      field: "eventType",
      source: input.query.trim() ? "explicit-selection" : "default",
      userConfirmed: Boolean(input.query.trim()),
      value: recognition.identity.selectedDisplayEvent,
    },
    ...preferences.map((item) => ({
      confidence: inferredIds.has(item.id) ? 0.94 : 1,
      field: `preference.${item.type}`,
      source: inferredIds.has(item.id) ? "explicit-text" as const : "explicit-step-choice" as const,
      userConfirmed: !inferredIds.has(item.id),
      value: item.label,
    })),
    ...stages.map((item) => ({
      confidence: input.stages === undefined ? 0.9 : 1,
      field: "stage",
      source: input.stages === undefined ? "deterministic-inference" as const : "explicit-step-choice" as const,
      userConfirmed: input.stages !== undefined,
      value: item.label,
    })),
  ];
  if (audience.honoreeAge !== undefined) {
    const ageWasInText = derivePlanningContext({ eventLabel: input.query }).age !== undefined;
    evidence.push({ confidence: 0.98, field: "audience.honoreeAge", source: ageWasInText ? "explicit-text" : "explicit-step-choice", userConfirmed: true, value: audience.honoreeAge });
  }
  if (audience.genderContext) {
    const genderWasInText = /\b(boy|girl|male|female)\b/.test(normalizedQuery);
    evidence.push({ confidence: 0.96, field: "audience.genderContext", source: genderWasInText ? "explicit-text" : "deterministic-inference", userConfirmed: genderWasInText, value: audience.genderContext });
  }
  if (homeEvent) evidence.push({ confidence: 0.96, field: "venue.homeEvent", source: "deterministic-inference", userConfirmed: false, value: true });

  return {
    activityStyle: preferences.filter((item) => item.type === "activity").map((item) => item.label),
    audience,
    commercialVenue: !homeEvent && (knownVenueContext || venuePreferences.length > 0),
    cultures: preferences.filter((item) => item.type === "culture").map((item) => item.label),
    evidence,
    entertainment: preferences
      .filter((item) => item.type === "activity" || item.category.toLowerCase().includes("music") || item.category.toLowerCase().includes("entertainment"))
      .map((item) => item.label),
    eventType: {
      confidence: recognition.confidence,
      source: input.query.trim() ? "explicit-selection" : "default",
      userConfirmed: Boolean(input.query.trim()),
      value: recognition.identity.selectedDisplayEvent,
    },
    excludedServices: recognition.excludedServices,
    foodStyles: preferences.filter((item) => item.type === "food").map((item) => item.label),
    guestSize: input.guestSize,
    homeEvent,
    indoorOutdoor: getIndoorOutdoor(preferences, recognition.profile.indoorOutdoor),
    inferredPreferenceIds: preferences.filter((item) => inferredIds.has(item.id)).map((item) => item.id),
    preferences,
    recognition,
    recommendationScores,
    religiousContext: unique([
      ...(recognition.profile.religion ? [recognition.profile.religion] : []),
      ...preferences
        .filter((item) => item.type === "tradition" && /relig|blessing|church/i.test(item.label))
        .map((item) => item.label),
    ]),
    requestedServices,
    stages,
    subtype: context.subtype ? {
      confidence: 0.86,
      source: "deterministic-inference",
      userConfirmed: false,
      value: context.subtype,
    } : undefined,
    transportationNeeds: unique([
      ...preferences.filter((item) => item.type === "transportation").map((item) => item.label),
      ...(stages.length > 1 ? ["Multi-location coordination"] : []),
    ]),
    travelRequired: stages.length > 1 || preferences.some((item) => item.type === "transportation"),
    venuePreferences,
    venueRequired: !homeEvent && !knownVenueInText && !knownVenueContext,
  };
}

export function inferAudienceFromQuery(query: string, canonicalEventType?: string): AudienceProfile {
  const context = derivePlanningContext({ eventLabel: query });
  const normalized = normalizeSearchText(query);
  const genderContext = canonicalEventType === "bar-mitzvah"
    ? "male"
    : canonicalEventType === "bat-mitzvah"
      ? "female"
      : /\bboy\b/.test(normalized)
        ? "boy"
        : /\bgirl\b/.test(normalized)
          ? "girl"
          : undefined;

  return {
    audienceType: context.lifeStage === "teen" ? "teens" : context.lifeStage === "kids" ? "kids" : undefined,
    genderContext,
    honoreeAge: context.age,
  };
}

export function inferPlanningPreferences(query: string) {
  const normalized = normalizeSearchText(query);
  const inferred = planningPreferenceCatalog.filter((item) =>
    [item.label, ...item.aliases]
      .map(normalizeSearchText)
      .filter((term) => term.length >= 3)
      .some((term) => containsPhrase(normalized, term)),
  );

  if (containsPhrase(normalized, "arcade")) addByLabel(inferred, ["Arcade", "Arcade games"]);
  if (containsPhrase(normalized, "backyard")) addByLabel(inferred, ["Backyard", "At home"]);
  if (/\bdj\b/.test(normalized)) addByLabel(inferred, ["DJ"]);
  if (containsPhrase(normalized, "church")) addByLabel(inferred, ["Church", "Religious ceremony"]);

  return uniquePreferences(inferred).map((item) => toSelectedPreference(item, "explicit-text"));
}

function addByLabel(target: PlanningPreference[], labels: string[]) {
  const labelSet = new Set(labels.map((label) => label.toLowerCase()));
  planningPreferenceCatalog.forEach((item) => {
    if (labelSet.has(item.label.toLowerCase())) target.push(item);
  });
}

function containsPhrase(text: string, phrase: string) {
  return ` ${text} `.includes(` ${phrase} `);
}

function getIndoorOutdoor(
  preferences: SelectedPlanningPreference[],
  fallback: EventIntelligenceProfile["indoorOutdoor"],
) {
  if (preferences.some((item) => item.label === "Indoor and outdoor")) return "indoor-outdoor";
  if (preferences.some((item) => item.label === "Outdoor")) return "outdoor";
  if (preferences.some((item) => item.label === "Indoor")) return "indoor";
  return fallback;
}

function mergeAudience(inferred: AudienceProfile, explicit?: AudienceProfile) {
  return { ...inferred, ...explicit };
}

function mergePreferences(
  explicit: SelectedPlanningPreference[],
  inferred: SelectedPlanningPreference[],
) {
  const explicitIds = new Set(explicit.map((item) => item.id));
  return [...explicit, ...inferred.filter((item) => !explicitIds.has(item.id))];
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function uniquePreferences(items: PlanningPreference[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
