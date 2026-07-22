import type { ServiceName } from "@/app/data/marketplace";
import { planningPreferenceCatalog } from "./catalog";
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
    preferenceId?: string;
    type?: PlanningPreferenceType;
  }>;
  singleSelect?: boolean;
};

export type PlanSelection = {
  aliases: string[];
  category: string;
  description: string;
  details: PlanDetailTag[];
  explicitLabels: string[];
  id: string;
  label: string;
  linkedService?: ServiceName;
  matchingServices: ServiceName[];
  preferenceId?: string;
  preferenceIds: string[];
  primaryExplicit: boolean;
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
    explicitLabels: service === primaryService ? [] : [service],
    id: serviceId(primaryService),
    label: primaryService,
    linkedService: primaryService,
    matchingServices: unique([primaryService, service]),
    preferenceIds: [],
    primaryExplicit: service === primaryService,
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
      explicitLabels: [preference.label],
      id: `preference:${preference.id}`,
      label: preference.label,
      matchingServices: preference.linkedService ? [preference.linkedService] : [],
      preferenceId: preference.id,
      preferenceIds,
      primaryExplicit: true,
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
    explicitLabels: normalize(preference.label) === normalize(primaryService) ? [] : [preference.label],
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
    primaryExplicit: normalize(preference.label) === normalize(primaryService),
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
    explicitLabels: unique([...item.explicitLabels, ...incoming.explicitLabels]),
    matchingServices: unique([...item.matchingServices, ...incoming.matchingServices]),
    preferenceId: item.preferenceId ?? incoming.preferenceId,
    preferenceIds: unique([...item.preferenceIds, ...incoming.preferenceIds]),
    primaryExplicit: item.primaryExplicit || incoming.primaryExplicit,
    source: incoming.source === "user-search" || incoming.source === "browse-all" ? incoming.source : item.source,
  });
}

export function updateSelectionDetails(selection: PlanSelection, details: PlanDetailTag[]) {
  const previousDetailPreferenceIds = new Set(selection.details.flatMap((detail) => detail.preferenceId ? [detail.preferenceId] : []));
  const nextDetailPreferenceIds = details.flatMap((detail) => detail.preferenceId ? [detail.preferenceId] : []);
  const basePreferenceIds = selection.preferenceIds.filter((id) => !previousDetailPreferenceIds.has(id));
  const preferenceIds = unique([...basePreferenceIds, ...nextDetailPreferenceIds]);
  const nextPreferenceLabels = planningPreferenceCatalog
    .filter((preference) => nextDetailPreferenceIds.includes(preference.id))
    .filter((preference) => normalize(preference.label) !== normalize(selection.label))
    .map((preference) => preference.label);
  const retainedLabels = selection.explicitLabels.filter((label) => {
    const preference = planningPreferenceCatalog.find((item) => normalize(item.label) === normalize(label));
    return !preference || !previousDetailPreferenceIds.has(preference.id) || nextDetailPreferenceIds.includes(preference.id);
  });
  return {
    ...selection,
    details,
    explicitLabels: unique([...retainedLabels, ...nextPreferenceLabels]),
    matchingServices: unique([
      ...(selection.linkedService ? [selection.linkedService] : []),
      ...details.flatMap((detail) => detail.matchingServices ?? []),
    ]),
    preferenceId: preferenceIds[0],
    preferenceIds,
  };
}

export function removePlanSelectionChoice(existing: PlanSelection, choice: PlanSelection) {
  const removedPreferenceIds = new Set(choice.preferenceIds);
  const remainingDetails = existing.details.filter((detail) => !detail.preferenceId || !removedPreferenceIds.has(detail.preferenceId));
  const remainingPreferenceIds = existing.preferenceIds.filter((id) => !removedPreferenceIds.has(id));
  const remainingLabels = existing.explicitLabels.filter((label) => !choice.explicitLabels.includes(label));
  const primaryExplicit = choice.primaryExplicit ? false : existing.primaryExplicit;

  if (!primaryExplicit && !remainingPreferenceIds.length && !remainingDetails.length && !remainingLabels.length) {
    return undefined;
  }

  return updateSelectionDetails({
    ...existing,
    explicitLabels: remainingLabels,
    preferenceId: remainingPreferenceIds[0],
    preferenceIds: remainingPreferenceIds,
    primaryExplicit,
  }, remainingDetails);
}

export function getPlanSelectionDisplayLabel(selection: PlanSelection) {
  if (selection.explicitLabels.length === 1) return selection.explicitLabels[0];
  if (selection.explicitLabels.length > 1) return selection.label;
  const identityGroups = getServiceDetailGroups(selection.linkedService).filter((group) => group.singleSelect).map((group) => normalize(group.label));
  const identityDetail = selection.details.find((detail) => identityGroups.includes(normalize(detail.group)));
  if (!identityDetail) return selection.label;
  return selection.linkedService === "Catering" ? `${identityDetail.label} Catering` : identityDetail.label;
}

export function createPlanDetailTag(
  group: string,
  label: string,
  matchingServices?: ServiceName[],
  preferenceId?: string,
  type?: PlanningPreferenceType,
): PlanDetailTag {
  return createDetailTag(group, label, "explicit", preferenceId, matchingServices, type);
}

export function toSelectedPreferencesFromPlan(item: PlanSelection): SelectedPlanningPreference[] {
  const selectionPreference = item.subtype !== "marketplace-service" && item.preferenceId ? [{
    category: item.category,
    id: item.preferenceId,
    label: getPlanSelectionDisplayLabel(item),
    linkedService: item.linkedService,
    selectionSource: item.source === "natural-language-inference" ? "explicit-text" as const : "explicit-step-choice" as const,
    type: item.subtype,
  }] : [];
  const detailPreferences = item.details.flatMap((detail) => detail.preferenceId && detail.type ? [{
    category: detail.group,
    id: detail.preferenceId,
    label: detail.label,
    linkedService: item.linkedService,
    selectionSource: detail.source === "inferred" ? "explicit-text" as const : "explicit-step-choice" as const,
    type: detail.type,
  }] : []);
  return [...selectionPreference, ...detailPreferences];
}

export function isAdvancedPreference(preference: Pick<PlanningPreference, "type">) {
  return preference.type === "culture" || preference.type === "cuisine" || preference.type === "tradition";
}

export function getServiceDetailGroups(service?: ServiceName) {
  if (!service) return [];
  const primaryService = getPrimaryService(service);
  const generated = planningPreferenceCatalog
    .filter((preference) => preference.linkedService && getPrimaryService(preference.linkedService) === primaryService)
    .filter((preference) => normalize(preference.label) !== normalize(primaryService))
    .map((preference) => ({
      group: getDetailGroupForLabel(preference.label, preference.category),
      option: {
        label: getDetailLabel(preference.label, primaryService),
        matchingServices: preference.linkedService ? [preference.linkedService] : undefined,
        preferenceId: preference.id,
        type: preference.type,
      },
    }));
  const groups = (serviceDetailCatalog[primaryService] ?? []).map((group) => ({ ...group, options: [...group.options] }));

  generated.forEach(({ group, option }) => {
    const existing = groups.find((item) => normalize(item.label) === normalize(group));
    if (existing) {
      const existingIndex = existing.options.findIndex((item) => normalize(item.label) === normalize(option.label));
      if (existingIndex === -1) existing.options.push(option);
      else existing.options[existingIndex] = {
        ...existing.options[existingIndex],
        ...option,
        matchingServices: unique([...(existing.options[existingIndex].matchingServices ?? []), ...(option.matchingServices ?? [])]),
      };
    } else {
      groups.push(detailGroup(normalize(group).replace(/\s+/g, "-"), group, [option]));
    }
  });

  return groups;
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
  const detailLabel = getDetailLabel(label, getPrimaryService(linkedService));
  details.push(createDetailTag(group, detailLabel, source, preference.id, [linkedService], preference.type));

  if (/taco cart/i.test(label)) {
    details.push(createDetailTag("Cuisine", "Mexican", "inferred", undefined, undefined, "cuisine"));
  }
  return details;
}

export function getPrimaryService(service: ServiceName): ServiceName {
  if (["Party Bus", "Valet"].includes(service)) return "Transportation";
  if (["Photo Booth", "Live Streaming"].includes(service)) return "Photography";
  if (["Booth Rentals", "Portable Restrooms"].includes(service)) return "Rentals";
  if (service === "Bartending") return "Catering";
  return service;
}

function getDetailLabel(label: string, primaryService: ServiceName) {
  const detailLabel = label.replace(new RegExp(`\\s+${escapeRegExp(primaryService)}$`, "i"), "").trim();
  return detailLabel || label;
}

function getDetailGroupForLabel(label: string, category = "") {
  const value = `${label} ${category}`.toLowerCase();
  const normalizedCategory = category.toLowerCase();
  if (normalizedCategory.includes("venue")) return "Venue type";
  if (normalizedCategory.includes("live music")) return "Music style";
  if (normalizedCategory.includes("photo") || normalizedCategory.includes("media")) return "Coverage";
  if (normalizedCategory.includes("production")) return "Production needs";
  if (normalizedCategory.includes("performer")) return "Performer type";
  if (normalizedCategory.includes("activities")) return "Experience type";
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
  options: Array<string | { label: string; matchingServices?: ServiceName[]; preferenceId?: string; type?: PlanningPreferenceType }>,
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

export function getServiceCategory(service: ServiceName) {
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
