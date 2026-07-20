import { normalizeSearchText } from "./normalize";
import type { EventIdentity, EventTaxonomyProfile } from "./types";

const concepts = [
  { id: "celebration-of-life", label: "Celebration of Life", terms: ["celebration of life"] },
  { id: "corporate-dinner", label: "Corporate Dinner", terms: ["corporate dinner", "company dinner"] },
  { id: "funeral-reception", label: "Funeral Reception", terms: ["funeral reception", "repass"] },
  { id: "bachelorette-party", label: "Bachelorette Party", terms: ["bachelorette"] },
  { id: "bachelor-party", label: "Bachelor Party", terms: ["bachelor"] },
  { id: "baby-shower", label: "Baby Shower", terms: ["baby shower"] },
  { id: "gender-reveal", label: "Gender Reveal", terms: ["gender reveal"] },
  { id: "pool-party", label: "Pool Party", terms: ["pool party", "pool event"] },
  { id: "sweet-16", label: "Sweet 16", terms: ["sweet 16", "sweet sixteen"] },
  { id: "quinceanera", label: "Quincea\u00f1era", terms: ["quinceanera", "quince", "sweet fifteen"] },
  { id: "bar-mitzvah", label: "Bar Mitzvah", terms: ["bar mitzvah"] },
  { id: "bat-mitzvah", label: "Bat Mitzvah", terms: ["bat mitzvah"] },
  { id: "christening", label: "Christening", terms: ["christening"] },
  { id: "baptism", label: "Baptism", terms: ["baptism", "baptismal"] },
  { id: "celebration-of-life", label: "Celebration of Life", terms: ["memorial celebration"] },
  { id: "memorial", label: "Memorial", terms: ["memorial"] },
  { id: "funeral", label: "Funeral", terms: ["funeral"] },
  { id: "anniversary", label: "Anniversary", terms: ["anniversary"] },
  { id: "engagement", label: "Engagement Party", terms: ["engagement party", "engagement"] },
  { id: "wedding", label: "Wedding", terms: ["wedding"] },
  { id: "graduation", label: "Graduation", terms: ["graduation", "grad party"] },
  { id: "birthday", label: "Birthday", terms: ["birthday"] },
  { id: "conference", label: "Conference", terms: ["conference", "summit"] },
  { id: "seminar", label: "Seminar", terms: ["seminar"] },
  { id: "trade-show", label: "Trade Show", terms: ["trade show", "tradeshow", "expo"] },
  { id: "corporate-event", label: "Corporate Event", terms: ["corporate", "company event"] },
  { id: "fundraiser", label: "Fundraiser", terms: ["fundraiser", "charity gala", "benefit"] },
  { id: "private-party", label: "Private Party", terms: ["private party"] },
] as const;

export function buildEventIdentity(
  query: string,
  profile: EventTaxonomyProfile,
  preservedSubtype?: string,
): EventIdentity {
  const normalizedQuery = normalizeSearchText(query);
  const concept = concepts.find(({ terms }) =>
    terms.some((term) => normalizedQuery.includes(normalizeSearchText(term))),
  );
  const selectedDisplayEvent = concept?.label ?? cleanProfileLabel(profile);

  return {
    aliases: profile.aliases,
    canonicalEventType: concept?.id ?? profile.id,
    inferredContext: getInferredContext(normalizedQuery),
    internalEventFamily: profile.eventFamily ?? profile.primaryType,
    selectedDisplayEvent,
    subtype:
      preservedSubtype && normalizeSearchText(preservedSubtype) !== normalizedQuery
        ? preservedSubtype
        : undefined,
  };
}

function cleanProfileLabel(profile: EventTaxonomyProfile) {
  if (profile.id === "quinceanera") {
    return "Quincea\u00f1era";
  }

  return profile.primaryType;
}

function getInferredContext(query: string) {
  const context: string[] = [];

  if (/\b(home|house|backyard|private address)\b/.test(query)) context.push("home-event");
  if (/\b(outdoor|outside|park|garden|beach)\b/.test(query)) context.push("outdoor");
  if (/\b(teen|teenager|1[3-7][ -]?year[ -]?old)\b/.test(query)) context.push("teen");
  if (/\b(kid|kids|child|children|toddler)\b/.test(query)) context.push("kids");
  if (/\b(ceremony|reception|service|graveside|burial|afterparty|brunch)\b/.test(query)) {
    context.push("connected-stages");
  }

  return context;
}
