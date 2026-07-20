import {
  eventExamples,
  eventTaxonomyProfiles,
  getDefaultProfile,
} from "./taxonomy";
import type { ServiceName } from "@/app/data/marketplace";
import type { EventRecognition, EventTaxonomyProfile } from "./types";
import { buildEventIdentity } from "./identity";
import { normalizeSearchText } from "./normalize";

export { normalizeSearchText } from "./normalize";

const synonymFamilies = [
  ["bbq", "barbecue", "barbeque", "cookout"],
  ["conference", "seminar", "summit"],
  ["convention", "expo", "trade show", "tradeshow"],
  ["memorial", "funeral", "celebration of life", "wake", "repass"],
  ["sweet 16", "sweet sixteen"],
  ["quinceanera", "quince", "sweet fifteen"],
  ["bar mitzvah", "bat mitzvah", "mitzvah"],
  ["corporate", "company", "business"],
];

export function recognizeEventIntent(query: string): EventRecognition {
  const normalizedQuery = normalizeSearchText(query);
  const matches = scoreProfiles(normalizedQuery);
  const best = matches[0];
  const profile = best?.profile ?? getDefaultProfile();
  const preservedSubtype = inferSubtype(query, profile);
  const identity = buildEventIdentity(query, profile, preservedSubtype);
  const recommendedServices = getRecommendedServices(profile, normalizedQuery);
  const excludedServices = getExcludedServices(profile, normalizedQuery);
  const tags = Array.from(
    new Set([
      profile.id,
      identity.canonicalEventType,
      profile.eventFamily ?? "",
      normalizeSearchText(profile.primaryType),
      normalizeSearchText(profile.subtype ?? ""),
      normalizeSearchText(profile.culture ?? ""),
      normalizeSearchText(profile.religion ?? ""),
      normalizeSearchText(profile.ageContext ?? ""),
      ...profile.recommendedTags,
      ...expandSynonyms(normalizedQuery),
      ...(preservedSubtype ? [normalizeSearchText(preservedSubtype)] : []),
    ]),
  ).filter(Boolean);

  return {
    confidence: best?.score ?? 0.35,
    identity,
    matchedAlias: best?.matchedAlias ?? profile.aliases[0],
    normalizedQuery,
    recommendedServices,
    excludedServices,
    preservedSubtype,
    profile,
    suggestedClarifyingQuestions: getClarifyingQuestions(profile, normalizedQuery),
    tags,
  };
}

export function searchEventIntents(query: string, limit = 7) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery || normalizedQuery.length < 2) {
    return eventExamples.slice(0, limit).map((example) => {
      const recognition = recognizeEventIntent(example);

      return {
        label: example,
        recognition,
      };
    });
  }

  const suggestions = scoreProfiles(normalizedQuery)
    .filter((match) => match.score >= 0.45)
    .map((match) => {
      const label = getCompleteSuggestionLabel(match.profile, normalizedQuery);

      return {
        label,
        recognition: recognizeEventIntent(label),
      };
    });

  return uniqueSuggestions(suggestions).slice(0, limit);
}

function scoreProfiles(normalizedQuery: string) {
  const forcedProfileId = detectForcedProfileId(normalizedQuery);

  return eventTaxonomyProfiles
    .map((profile) => {
      const aliases = [
        profile.primaryType,
        profile.subtype ?? "",
        ...profile.aliases,
        ...profile.recommendedTags,
      ].map(normalizeSearchText);
      const bestAlias = aliases
        .map((alias) => ({
          alias,
          score: scoreAlias(normalizedQuery, alias),
        }))
        .sort((a, b) => b.score - a.score)[0];
      const synonymScore = expandSynonyms(normalizedQuery).some((term) =>
        aliases.some((alias) => alias.includes(term) || term.includes(alias)),
      )
        ? 0.82
        : 0;

      return {
        matchedAlias: bestAlias?.alias ?? profile.aliases[0],
        profile,
        score:
          forcedProfileId === profile.id
            ? 1.1
            : Math.max(bestAlias?.score ?? 0, synonymScore),
      };
    })
    .sort((a, b) => b.score - a.score);
}

function detectForcedProfileId(query: string) {
  if (["funeral", "memorial", "wake", "repass", "celebration of life"].some((term) => query.includes(term))) {
    return "funeral";
  }

  if (query.includes("pool party") || query.includes("pool event")) {
    return "pool-party";
  }

  if (query.includes("bachelor") || query.includes("bachelorette")) {
    return "bachelor-party";
  }

  if (query.includes("quince") || query.includes("sweet fifteen")) {
    return "quinceanera";
  }

  if (query.includes("mitzvah")) {
    return "mitzvah";
  }

  if (query.includes("trade show") || query.includes("seminar") || query.includes("conference")) {
    return "conference";
  }

  return undefined;
}

function scoreAlias(query: string, alias: string) {
  if (!query) {
    return 0.5;
  }

  if (query === alias) {
    return 1;
  }

  if (query.includes(alias) || alias.includes(query)) {
    return 0.9;
  }

  const queryWords = new Set(query.split(" "));
  const aliasWords = alias.split(" ");
  const overlap = aliasWords.filter((word) => queryWords.has(word)).length;
  const overlapScore = overlap / Math.max(aliasWords.length, 1);
  const fuzzy = 1 - levenshteinDistance(query, alias) / Math.max(query.length, alias.length, 1);

  return Math.max(overlapScore * 0.75, fuzzy * 0.7);
}

function expandSynonyms(query: string) {
  const expanded = new Set<string>();

  for (const family of synonymFamilies) {
    if (family.some((term) => query.includes(term))) {
      family.forEach((term) => expanded.add(term));
    }
  }

  return Array.from(expanded);
}

function inferSubtype(query: string, profile: EventTaxonomyProfile) {
  const trimmed = query.trim();

  if (!trimmed) {
    return profile.subtype;
  }

  const normalized = normalizeSearchText(trimmed);

  if (profile.id === "quinceanera" && (normalized.includes("quince") || normalized.includes("sweet fifteen"))) {
    return "Quinceañera";
  }

  if (normalized === normalizeSearchText(profile.primaryType)) {
    return profile.subtype;
  }

  return trimmed;
}

function getRecommendedServices(
  profile: EventTaxonomyProfile,
  normalizedQuery: string,
) {
  const services = new Set<ServiceName>([
    ...profile.requiredVendors,
    ...profile.recommendedVendors,
    ...profile.optionalVendors,
  ]);

  if (normalizedQuery.includes("kids birthday")) {
    ["Character Performers", "Magic", "Cake & Desserts", "Rentals", "Photography"].forEach(
      (service) => services.add(service as ServiceName),
    );
  }

  return Array.from(services).filter(
    (service) => !getExcludedServices(profile, normalizedQuery).includes(service),
  );
}

function getCompleteSuggestionLabel(
  profile: EventTaxonomyProfile,
  normalizedQuery: string,
) {
  if (profile.id === "quinceanera") {
    return "Quinceañera";
  }

  const bestAlias =
    profile.aliases.find((alias) => normalizeSearchText(alias).includes(normalizedQuery)) ??
    profile.aliases[0];

  return toTitleCase(bestAlias);
}

function uniqueSuggestions<TSuggestion extends { label: string }>(
  suggestions: TSuggestion[],
) {
  const seen = new Set<string>();

  return suggestions.filter((suggestion) => {
    const key = normalizeSearchText(suggestion.label);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function toTitleCase(value: string) {
  return value
    .split(" ")
    .map((word) =>
      word.length ? `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}` : word,
    )
    .join(" ");
}

function getExcludedServices(
  profile: EventTaxonomyProfile,
  normalizedQuery: string,
) {
  const excluded = new Set<ServiceName>(profile.excludedServices ?? []);

  if (
    profile.id === "funeral" ||
    ["funeral", "memorial", "wake", "repass"].some((term) =>
      normalizedQuery.includes(term),
    )
  ) {
    ["DJ", "Magic", "Character Performers", "Photo Booth"].forEach((service) =>
      excluded.add(service as ServiceName),
    );
  }

  return Array.from(excluded);
}

function getClarifyingQuestions(
  profile: EventTaxonomyProfile,
  normalizedQuery: string,
) {
  const questions: string[] = [];

  if (profile.id === "pool-party" && !normalizedQuery.includes("birthday")) {
    questions.push("Is this also for a birthday or just a pool party?");
  }

  if (profile.indoorOutdoor === "indoor-outdoor") {
    questions.push("Will this be indoors, outdoors, or both?");
  }

  if (!normalizedQuery.includes("home") && !normalizedQuery.includes("venue")) {
    questions.push("Do you already have a location?");
  }

  if (profile.culture || profile.religion) {
    questions.push("Are there cultural or religious requirements vendors should know?");
  }

  return questions.slice(0, 3);
}

function levenshteinDistance(left: string, right: string) {
  const rows = Array.from({ length: left.length + 1 }, (_, index) => [index]);

  for (let column = 1; column <= right.length; column += 1) {
    rows[0][column] = column;
  }

  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;

      rows[row][column] = Math.min(
        rows[row - 1][column] + 1,
        rows[row][column - 1] + 1,
        rows[row - 1][column - 1] + cost,
      );
    }
  }

  return rows[left.length][right.length];
}
