import {
  defaultDiscoveryEvents,
  eventDiscoveryFamilies,
  eventTaxonomyProfiles,
  getDefaultProfile,
} from "./taxonomy";
import type { ServiceName } from "@/app/data/marketplace";
import type { EventRecognition, EventTaxonomyProfile } from "./types";
import { buildEventIdentity } from "./identity";
import { normalizeSearchText } from "./normalize";
import { hasNegatedPhrase, hasPositivePhrase } from "./intent-text";

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
  const matches = getDiscoveryFamily(query) ? [] : scoreProfiles(query);
  const best = matches[0];
  const confidentBest = best && best.score >= 0.48 ? best : undefined;
  const profile = confidentBest?.profile ?? getDefaultProfile();
  const preservedSubtype = inferSubtype(query, profile);
  const identity = buildEventIdentity(query, profile, preservedSubtype);
  const recommendedServices = getRecommendedServices(profile, query);
  const excludedServices = getExcludedServices(profile, query);
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
    confidence: confidentBest?.score ?? 0.35,
    identity,
    matchedAlias: confidentBest?.matchedAlias ?? profile.aliases[0],
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
    return defaultDiscoveryEvents.slice(0, limit).map((example) => {
      const recognition = recognizeEventIntent(example);

      return {
        label: example,
        recognition,
      };
    });
  }

  const family = getDiscoveryFamily(query);
  if (family) {
    return eventTaxonomyProfiles.filter((profile) => profile.eventFamily === family.family)
      .map((profile) => ({ label: profile.subtype ?? profile.primaryType, recognition: recognizeEventIntent(profile.subtype ?? profile.primaryType) }))
      .slice(0, limit);
  }

  const suggestions = scoreProfiles(query)
    .filter((match) => match.score >= 0.45)
    .flatMap((match) => {
      const matchingAliases = match.profile.aliases.filter(alias => {
        const words = normalizeSearchText(alias).split(" ");
        return normalizedQuery.split(" ").every(part => words.some(word => word.startsWith(part)));
      });
      const labels = [getCompleteSuggestionLabel(match.profile, normalizedQuery), ...matchingAliases.map(toTitleCase)];
      return Array.from(new Set(labels)).slice(0, 4).map(label => ({ label, recognition: recognizeEventIntent(label) }));
    });

  return uniqueSuggestions(suggestions).slice(0, limit);
}

export function getDiscoveryFamily(query: string) {
  const normalized = normalizeSearchText(query);
  return eventDiscoveryFamilies.find((family) => family.aliases.some((alias) => normalizeSearchText(alias) === normalized));
}

function scoreProfiles(query: string) {
  const normalizedQuery = normalizeSearchText(query);
  const forcedProfileId = detectForcedProfileId(query);

  return eventTaxonomyProfiles
    .map((profile) => {
      const aliases = [
        ...(profile.eventFamily === "holiday gathering" ? [] : [profile.primaryType]),
        profile.subtype ?? "",
        ...profile.aliases,
      ].map(normalizeSearchText);
      const bestAlias = aliases
        .map((alias) => ({
          alias,
          score: hasPositivePhrase(query, alias) || !hasNegatedPhrase(query, alias)
            ? scoreAlias(normalizedQuery, alias)
            : 0,
        }))
        .sort((a, b) => b.score - a.score)[0];
      const tagScore = profile.recommendedTags.some((tag) => hasPositivePhrase(query, tag))
        ? 0.44
        : 0;
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
            : Math.max(bestAlias?.score ?? 0, synonymScore, tagScore, normalizeSearchText(profile.subtype ?? profile.primaryType).startsWith(normalizedQuery) ? 0.95 : 0),
      };
    })
    .sort((a, b) => b.score - a.score || (a.profile.discoveryRank ?? 100) - (b.profile.discoveryRank ?? 100));
}

function detectForcedProfileId(query: string) {
  if (["funeral", "memorial", "wake", "repass", "celebration of life"].some(term => hasPositivePhrase(query, term))) return "funeral";
  if (/\b(employees|company|corporate|business)\b/i.test(query) && /\b(dinner|holiday)\b/i.test(query)) return "corporate";
  if (hasPositivePhrase(query, "getting married")) return "wedding";
  if (hasPositivePhrase(query, "graduating")) return "graduation";
  if (hasPositivePhrase(query, "birthday")) return "birthday";
  if (hasPositivePhrase(query, "wedding")) return "wedding";
  if (hasPositivePhrase(query, "graduation")) return "graduation";

  if (["funeral", "memorial", "wake", "repass", "celebration of life"].some((term) => hasPositivePhrase(query, term))) {
    return "funeral";
  }

  if (hasPositivePhrase(query, "pool party") || hasPositivePhrase(query, "pool event")) {
    return "pool-party";
  }

  if (hasPositivePhrase(query, "bachelor") || hasPositivePhrase(query, "bachelorette")) {
    return "bachelor-party";
  }

  if (hasPositivePhrase(query, "quince") || hasPositivePhrase(query, "sweet fifteen")) {
    return "quinceanera";
  }

  if (hasPositivePhrase(query, "mitzvah")) {
    return "mitzvah";
  }

  if (["trade show", "seminar", "conference"].some((term) => hasPositivePhrase(query, term))) {
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

  if (!alias) return 0;

  if ((` ${query} `).includes(` ${alias} `) || alias.startsWith(query)) {
    return 0.9;
  }

  const generic = new Set(["party", "event", "events", "gathering", "celebration", "day", "planning", "a", "the", "for"]);
  const queryWords = new Set(query.split(" ").filter((word) => !generic.has(word)));
  if (!alias.split(" ").some((word) => !generic.has(word) && queryWords.has(word))) return 0;
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
  query: string,
) {
  const normalizedQuery = normalizeSearchText(query);
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
    (service) => !getExcludedServices(profile, query).includes(service),
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
  query: string,
) {
  const excluded = new Set<ServiceName>(profile.excludedServices ?? []);

  const serviceTerms: Array<[ServiceName, string[]]> = [
    ["DJ", ["dj", "disc jockey"]],
    ["Live Music", ["live music", "live band", "band"]],
    ["Catering", ["catering", "caterer", "food service"]],
    ["Venue", ["venue", "event space", "hall"]],
    ["Photography", ["photography", "photographer"]],
    ["Photo Booth", ["photo booth", "photobooth"]],
    ["Transportation", ["transportation", "shuttle"]],
    ["Party Bus", ["party bus"]],
    ["Rentals", ["rentals", "rental"]],
    ["Florals", ["florals", "flowers"]],
  ];

  serviceTerms.forEach(([service, terms]) => {
    if (terms.some((term) => hasNegatedPhrase(query, term))) excluded.add(service);
  });

  if (
    profile.id === "funeral" ||
    ["funeral", "memorial", "wake", "repass"].some((term) =>
      hasPositivePhrase(query, term),
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
