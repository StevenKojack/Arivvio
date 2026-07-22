import type { ServiceName } from "@/app/data/marketplace";
import type { PlanningPreference, PlanningPreferenceType, SelectedPlanningPreference } from "./types";

export type PlanSelectionSource =
  | "browse-all"
  | "initial-suggestion"
  | "natural-language-inference"
  | "previous-saved-selection"
  | "user-search";

export type PlanDetailSource = "explicit" | "inferred";

export type PlanDetailTag = {
  group: string;
  id: string;
  label: string;
  matchingServices?: ServiceName[];
  preferenceId?: string;
  source: PlanDetailSource;
  type?: PlanningPreferenceType;
};

export type ServiceDetailGroup = {
  id: string;
  label: string;
  options: Array<{
    label: string;
    matchingServices?: ServiceName[];
  }>;
  singleSelect?: boolean;
};

export type PlanSelection = {
  aliases: string[];
  category: string;
  description: string;
  details: PlanDetailTag[];
  id: string;
  label: string;
  linkedService?: ServiceName;
  matchingServices: ServiceName[];
  preferenceId?: string;
  preferenceIds: string[];
  source: PlanSelectionSource;
  subtype: PlanningPreferenceType | "marketplace-service";
};

export const primaryServiceNames: ServiceName[] = [
  "Venue",
  "Catering",
  "Cake & Desserts",
  "DJ",
  "Live Music",
  "Photography",
  "Rentals",
  "Magic",
  "Character Performers",
  "Bounce Houses",
  "Balloons",
  "Florals",
  "Transportation",
  "Security",
  "Staffing",
  "AV Production",
  "Registration",
  "Invitations",
  "Printed Materials",
  "Cleaning",
];

export const serviceDetailCatalog: Partial<Record<ServiceName, ServiceDetailGroup[]>> = {
  Venue: [
    detailGroup("venue-style", "Venue type", ["Banquet Hall", "Restaurant", "Private Dining Room", "Backyard", "Park", "Hotel Ballroom", "Rooftop", "Garden", "Activity Venue"], true),
    detailGroup("venue-features", "Important features", ["Indoor", "Outdoor", "Indoor and Outdoor", "Parking", "Kitchen", "Stage", "Accessible Entrance"]),
  ],
  Catering: [
    detailGroup("cuisine", "Cuisine", ["Armenian", "Mexican", "Persian", "Mediterranean", "Italian", "Korean", "Filipino", "Indian", "Japanese", "American"], true),
    detailGroup("meal-style", "Meal style", ["Buffet", "Taco Cart", "Food Truck", "Family Style", "Plated Dinner", "Coffee Cart", "Dessert Table"]),
    detailGroup("dietary", "Dietary options", ["Halal", "Kosher", "Vegan", "Vegetarian", "Gluten-Free", "Dairy-Free", "Nut-Aware"]),
    detailGroup("beverage", "Beverage service", [{ label: "Bartending", matchingServices: ["Bartending"] }, "Mocktail Bar", "Coffee Service"]),
  ],
  DJ: [
    detailGroup("music", "Music types", ["Top 40", "Hip Hop", "EDM", "Rock", "Jazz", "Country", "Disco", "80s", "90s"]),
    detailGroup("language", "Languages", ["English", "Spanish", "Armenian", "Persian", "French"]),
    detailGroup("culture", "Cultures", ["Armenian", "Latin", "Persian", "Jewish", "Indian", "Multicultural"]),
    detailGroup("specialty", "Specialties", ["Wedding DJ", "Club DJ", "Live Mixing", "MC Services", "Quincea\u00f1era Experience"]),
    detailGroup("equipment", "Equipment", [{ label: "Photo Booth", matchingServices: ["Photo Booth"] }, "Lighting", "Cold Sparks", "Fog", "Wireless Microphones"]),
  ],
  Photography: [
    detailGroup("coverage", "Coverage", [{ label: "Photo Booth", matchingServices: ["Photo Booth"] }, { label: "Live Streaming", matchingServices: ["Live Streaming"] }, "Drone", "Portrait", "Film", "Same-Day Edit", "Event Recap"]),
    detailGroup("experience", "Experience", ["Wedding", "Corporate", "Family Events", "Low-Light Events", "Cultural Events"]),
  ],
  Rentals: [
    detailGroup("inventory", "Rental needs", ["Tables", "Chairs", "Linens", "Lounge Furniture", "Tents", "Canopies", "Heaters", "Fans", "Lighting", "Dance Floor", "Stage", { label: "Portable Restrooms", matchingServices: ["Portable Restrooms"] }, { label: "Booth Rentals", matchingServices: ["Booth Rentals"] }]),
    detailGroup("effects", "Party effects", ["Fog", "Cold Sparks", "Foam Cannon", "Bubble Machine"]),
  ],
  Transportation: [
    detailGroup("vehicle", "Transportation type", [{ label: "Party Bus", matchingServices: ["Party Bus"] }, "Limousine", "Shuttle", "Luxury SUV", "Classic Car", { label: "Valet", matchingServices: ["Valet"] }, "Sprinter Van"], true),
    detailGroup("route", "Trip needs", ["Airport Pickup", "Hotel Shuttle", "Multi-Stop Route", "Late-Night Return", "Guest Transportation"]),
  ],
  "Live Music": [
    detailGroup("music", "Music style", ["Live Band", "Singer", "Mariachi", "Jazz", "String Quartet", "Ceremony Music", "Armenian Ensemble"]),
    detailGroup("culture", "Cultural experience", ["Armenian", "Latin", "Persian", "Jewish", "Indian", "Multicultural"]),
  ],
  "Cake & Desserts": [
    detailGroup("dessert", "Dessert type", ["Celebration Cake", "Wedding Cake", "Cupcakes", "Dessert Table", "Chocolate Fountain", "Candy Table", "Ice Cream Cart"]),
    detailGroup("dietary", "Dietary options", ["Vegan", "Gluten-Free", "Dairy-Free", "Nut-Aware"]),
  ],
  "AV Production": [
    detailGroup("production", "Production needs", ["Audio", "Video", "Projection", "Stage Lighting", "Microphones", "Technical Director", { label: "Live Streaming", matchingServices: ["Live Streaming"] }]),
  ],
};

export function createServiceSelection(service: ServiceName, source: PlanSelectionSource): PlanSelection {
  const primaryService = getPrimaryService(service);
  const detail = service === primaryService ? [] : [createDetailTag(getDetailGroupForLabel(service), service, "explicit", undefined, [service])];

  return {
    aliases: [],
    category: getServiceCategory(primaryService),
    description: getServiceDescription(primaryService),
    details: detail,
    id: serviceId(primaryService),
    label: primaryService,
    linkedService: primaryService,
    matchingServices: unique([primaryService, service]),
    preferenceIds: [],
    source,
    subtype: "marketplace-service",
  };
}

export function createPreferenceSelection(
  preference: PlanningPreference | SelectedPlanningPreference,
  source: PlanSelectionSource,
): PlanSelection {
  const primaryService = preference.linkedService ? getPrimaryService(preference.linkedService) : undefined;
  const preferenceIds = [preference.id];

  if (!primaryService) {
    return {
      aliases: "aliases" in preference ? preference.aliases : [],
      category: preference.category,
      description: "description" in preference ? preference.description : `Find ${preference.label.toLowerCase()} options for this event.`,
      details: [],
      id: `preference:${preference.id}`,
      label: preference.label,
      matchingServices: preference.linkedService ? [preference.linkedService] : [],
      preferenceId: preference.id,
      preferenceIds,
      source,
      subtype: preference.type,
    };
  }

  const details = getPreferenceDetails(preference, source === "natural-language-inference" ? "inferred" : "explicit");
  return {
    aliases: "aliases" in preference ? preference.aliases : [],
    category: getServiceCategory(primaryService),
    description: getServiceDescription(primaryService),
    details,
    id: serviceId(primaryService),
    label: primaryService,
    linkedService: primaryService,
    matchingServices: unique([
      primaryService,
      ...(preference.linkedService ? [preference.linkedService] : []),
      ...details.flatMap((detail) => detail.matchingServices ?? []),
    ]),
    preferenceId: preference.id,
    preferenceIds,
    source,
    subtype: "marketplace-service",
  };
}

export function mergePlanSelection(items: PlanSelection[], incoming: PlanSelection) {
  const existing = items.find((item) => item.id === incoming.id);
  if (!existing) return [...items, incoming];

  return items.map((item) => item.id !== incoming.id ? item : {
    ...item,
    aliases: unique([...item.aliases, ...incoming.aliases]),
    details: mergeDetails(item.details, incoming.details),
    matchingServices: unique([...item.matchingServices, ...incoming.matchingServices]),
    preferenceId: item.preferenceId ?? incoming.preferenceId,
    preferenceIds: unique([...item.preferenceIds, ...incoming.preferenceIds]),
    source: incoming.source === "user-search" || incoming.source === "browse-all" ? incoming.source : item.source,
  });
}

export function updateSelectionDetails(selection: PlanSelection, details: PlanDetailTag[]) {
  return {
    ...selection,
    details,
    matchingServices: unique([
      ...(selection.linkedService ? [selection.linkedService] : []),
      ...details.flatMap((detail) => detail.matchingServices ?? []),
    ]),
  };
}

export function createPlanDetailTag(
  group: string,
  label: string,
  matchingServices?: ServiceName[],
): PlanDetailTag {
  return createDetailTag(group, label, "explicit", undefined, matchingServices);
}

export function toSelectedPreferencesFromPlan(item: PlanSelection): SelectedPlanningPreference[] {
  return item.details.flatMap((detail) => detail.preferenceId && detail.type ? [{
    category: detail.group,
    id: detail.preferenceId,
    label: detail.label,
    linkedService: item.linkedService,
    selectionSource: detail.source === "inferred" ? "explicit-text" as const : "explicit-step-choice" as const,
    type: detail.type,
  }] : []);
}

export function isAdvancedPreference(preference: Pick<PlanningPreference, "type">) {
  return preference.type === "culture" || preference.type === "cuisine" || preference.type === "tradition";
}

export function getServiceDetailGroups(service?: ServiceName) {
  return service ? serviceDetailCatalog[service] ?? [] : [];
}

function getPreferenceDetails(
  preference: PlanningPreference | SelectedPlanningPreference,
  source: PlanDetailSource,
): PlanDetailTag[] {
  const label = preference.label;
  const linkedService = preference.linkedService;
  if (!linkedService || normalize(label) === normalize(getPrimaryService(linkedService))) return [];

  const details: PlanDetailTag[] = [];
  const group = getDetailGroupForLabel(label, preference.category);
  let detailLabel = label.replace(/\s+(dj|catering)$/i, "").trim();
  if (!detailLabel) detailLabel = label;
  details.push(createDetailTag(group, detailLabel, source, preference.id, [linkedService], preference.type));

  if (/taco cart/i.test(label)) {
    details.push(createDetailTag("Cuisine", "Mexican", "inferred", undefined, undefined, "cuisine"));
  }
  return details;
}

function getPrimaryService(service: ServiceName): ServiceName {
  if (["Party Bus", "Valet"].includes(service)) return "Transportation";
  if (["Photo Booth", "Live Streaming"].includes(service)) return "Photography";
  if (["Booth Rentals", "Portable Restrooms"].includes(service)) return "Rentals";
  if (service === "Bartending") return "Catering";
  return service;
}

function getDetailGroupForLabel(label: string, category = "") {
  const value = `${label} ${category}`.toLowerCase();
  if (/armenian|latin|persian|jewish|indian|multicultural/.test(value) && /dj|music|culture/.test(value)) return "Cultures";
  if (/catering|cuisine|armenian|mexican|persian|italian|mediterranean|korean|filipino/.test(value)) return "Cuisine";
  if (/party bus|limousine|shuttle|suv|classic car|valet|sprinter/.test(value)) return "Transportation type";
  if (/photo booth|drone|portrait|same-day|film|stream/.test(value)) return "Coverage";
  if (/table|chair|linen|tent|canop|restroom|booth rental/.test(value)) return "Rental needs";
  if (/buffet|taco|food truck|family style|plated|coffee cart|dessert table/.test(value)) return "Meal style";
  if (/halal|kosher|vegan|vegetarian|gluten|dairy|nut/.test(value)) return "Dietary options";
  return "Specialties";
}

function createDetailTag(
  group: string,
  label: string,
  source: PlanDetailSource,
  preferenceId?: string,
  matchingServices?: ServiceName[],
  type?: PlanningPreferenceType,
): PlanDetailTag {
  return {
    group,
    id: `${normalize(group)}:${normalize(label)}`,
    label,
    matchingServices,
    preferenceId,
    source,
    type,
  };
}

function detailGroup(
  id: string,
  label: string,
  options: Array<string | { label: string; matchingServices?: ServiceName[] }>,
  singleSelect = false,
): ServiceDetailGroup {
  return {
    id,
    label,
    options: options.map((option) => typeof option === "string" ? { label: option } : option),
    singleSelect,
  };
}

function mergeDetails(current: PlanDetailTag[], incoming: PlanDetailTag[]) {
  const map = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => map.set(item.id, map.has(item.id) ? { ...map.get(item.id)!, ...item } : item));
  return Array.from(map.values());
}

function serviceId(service: ServiceName) {
  return `service:${normalize(service).replace(/\s+/g, "-")}`;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function getServiceCategory(service: ServiceName) {
  if (service === "Venue") return "Venues";
  if (["Catering", "Bartending"].includes(service)) return "Food and Catering";
  if (service === "Cake & Desserts") return "Desserts";
  if (["DJ", "Live Music"].includes(service)) return "Music and DJs";
  if (["Photography", "Photo Booth", "Live Streaming"].includes(service)) return "Photography and Video";
  if (["Rentals", "Booth Rentals", "Portable Restrooms"].includes(service)) return "Rentals";
  if (["Magic", "Character Performers", "Bounce Houses"].includes(service)) return "Entertainment and Activities";
  if (["Florals", "Balloons"].includes(service)) return "Decor and Florals";
  if (["Transportation", "Party Bus", "Valet"].includes(service)) return "Transportation";
  if (["Security", "Staffing", "Cleaning"].includes(service)) return "Staffing and Logistics";
  if (service === "AV Production") return "Production and Equipment";
  return "Guest Services";
}

function getServiceDescription(service: ServiceName) {
  const descriptions: Partial<Record<ServiceName, string>> = {
    Catering: "Food and beverage service shaped around the event and guests.",
    DJ: "Music, announcements, and event flow led by one matched DJ service.",
    Photography: "Photo and video coverage with the exact formats you prefer.",
    Rentals: "Furniture, structures, equipment, and practical event inventory.",
    Transportation: "Guest and honoree transportation matched to the route.",
    Venue: "A place that fits the event, location, and guest count.",
  };
  return descriptions[service] ?? `Find ${service.toLowerCase()} providers for this event.`;
}
