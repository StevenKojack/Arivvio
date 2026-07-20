import type { ServiceName } from "@/app/data/marketplace";
import type { PlanningPreference, PlanningPreferenceType, SelectedPlanningPreference } from "./types";

export type PlanSelectionSource =
  | "browse-all"
  | "initial-suggestion"
  | "natural-language-inference"
  | "previous-saved-selection"
  | "user-search";

export type PlanSelection = {
  aliases: string[];
  category: string;
  description: string;
  id: string;
  label: string;
  linkedService?: ServiceName;
  preferenceId?: string;
  source: PlanSelectionSource;
  subtype: PlanningPreferenceType | "marketplace-service";
};

export function createServiceSelection(
  service: ServiceName,
  source: PlanSelectionSource,
): PlanSelection {
  return {
    aliases: [],
    category: getServiceCategory(service),
    description: getServiceDescription(service),
    id: `service:${service.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    label: service,
    linkedService: service,
    source,
    subtype: "marketplace-service",
  };
}

export function createPreferenceSelection(
  preference: PlanningPreference | SelectedPlanningPreference,
  source: PlanSelectionSource,
): PlanSelection {
  return {
    aliases: "aliases" in preference ? preference.aliases : [],
    category: preference.category,
    description: "description" in preference ? preference.description : `Find ${preference.label.toLowerCase()} options for this event.`,
    id: `preference:${preference.id}`,
    label: preference.label,
    linkedService: preference.linkedService,
    preferenceId: preference.id,
    source,
    subtype: preference.type,
  };
}

export function toSelectedPreferenceFromPlan(item: PlanSelection): SelectedPlanningPreference | undefined {
  if (!item.preferenceId || item.subtype === "marketplace-service") return undefined;

  return {
    category: item.category,
    id: item.preferenceId,
    label: item.label,
    linkedService: item.linkedService,
    selectionSource: item.source === "natural-language-inference" ? "explicit-text" : "explicit-step-choice",
    type: item.subtype,
  };
}

export function isAdvancedPreference(preference: Pick<PlanningPreference, "type">) {
  return preference.type === "culture" || preference.type === "cuisine" || preference.type === "tradition";
}

function getServiceCategory(service: ServiceName) {
  if (["Venue"].includes(service)) return "Venues";
  if (["Catering", "Bartending"].includes(service)) return "Food and Catering";
  if (["Cake & Desserts"].includes(service)) return "Desserts";
  if (["DJ", "Live Music"].includes(service)) return "Music and DJs";
  if (["Photography", "Photo Booth", "Live Streaming"].includes(service)) return "Photography and Video";
  if (["Rentals", "Booth Rentals", "Portable Restrooms"].includes(service)) return "Rentals";
  if (["Magic", "Character Performers", "Bounce Houses"].includes(service)) return "Entertainment and Activities";
  if (["Florals", "Balloons"].includes(service)) return "Decor and Florals";
  if (["Transportation", "Party Bus", "Valet"].includes(service)) return "Transportation";
  if (["Security", "Staffing", "Cleaning"].includes(service)) return "Staffing and Logistics";
  if (["AV Production"].includes(service)) return "Production and Equipment";
  return "Guest Services";
}

function getServiceDescription(service: ServiceName) {
  const descriptions: Partial<Record<ServiceName, string>> = {
    Catering: "Food service matched to the event and guest count.",
    DJ: "Music, announcements, and event flow led by a DJ.",
    Photography: "Professional photo coverage for the event.",
    Rentals: "Tables, chairs, linens, lighting, and event equipment.",
    Venue: "A place that fits the event, location, and guest count.",
  };
  return descriptions[service] ?? `Find ${service.toLowerCase()} providers for this event.`;
}
