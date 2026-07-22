import type { ServiceName } from "@/app/data/marketplace";
import { planningPreferenceCatalog } from "./catalog";
import {
  createPreferenceSelection,
  createServiceSelection,
  getServiceCategory,
  primaryServiceNames,
  type PlanSelection,
} from "./selection";
import type { PlanningPreference } from "./types";

export type DiscoveryCategory = {
  description: string;
  id: string;
  label: string;
};

export type DiscoveryOption = {
  description: string;
  group: string;
  id: string;
  label: string;
  preference?: PlanningPreference;
  selection: PlanSelection;
  service?: ServiceName;
};

export type DiscoveryGroup = {
  id: string;
  label: string;
  options: DiscoveryOption[];
};

export const discoveryCategories: DiscoveryCategory[] = [
  category("venues", "Venues", "Places, settings, and activity destinations"),
  category("food", "Food and Catering", "Cuisine, meals, drinks, and specialty food experiences"),
  category("music", "Music", "DJs, musicians, and live performance styles"),
  category("entertainment", "Entertainment and Activities", "Performers, interactive experiences, and activities"),
  category("photo-video", "Photo and Video", "Coverage, booths, content, and creative keepsakes"),
  category("rentals", "Rentals", "Furniture, structures, effects, and event equipment"),
  category("decor", "Decor and Florals", "Flowers, balloons, signage, and visual details"),
  category("transportation", "Transportation", "Vehicles, shuttles, parking, and arrivals"),
  category("staffing", "Staffing and Logistics", "People and operational support"),
  category("production", "Production and Equipment", "Sound, video, lighting, and technical production"),
  category("guest-services", "Guest Services", "Invitations, registration, printed materials, and guest care"),
  category("event-details", "Event Style and Access", "Culture, traditions, atmosphere, setting, and accessibility"),
];

export function getDiscoveryGroups(categoryId: string) {
  const options = getDiscoveryOptions().filter((option) => getCategoryId(option) === categoryId);
  const grouped = new Map<string, DiscoveryOption[]>();
  options.forEach((option) => grouped.set(option.group, [...(grouped.get(option.group) ?? []), option]));
  return Array.from(grouped, ([label, items]) => ({
    id: toId(label),
    label,
    options: items.sort((left, right) => left.label.localeCompare(right.label)),
  })).sort((left, right) => (left.label === "General services" ? -1 : right.label === "General services" ? 1 : left.label.localeCompare(right.label)));
}

function getDiscoveryOptions() {
  const primary = primaryServiceNames.map((service) => ({
    description: createServiceSelection(service, "browse-all").description,
    group: "General services",
    id: `service:${toId(service)}`,
    label: service,
    selection: createServiceSelection(service, "browse-all"),
    service,
  } satisfies DiscoveryOption));
  const preferences = planningPreferenceCatalog.map((preference) => ({
    description: preference.description,
    group: preference.category,
    id: `preference:${preference.id}`,
    label: preference.label,
    preference,
    selection: createPreferenceSelection(preference, "browse-all"),
  } satisfies DiscoveryOption));
  const seen = new Set<string>();
  return [...primary, ...preferences].filter((option) => {
    const identity = `${option.selection.id}:${option.label}`.toLowerCase();
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

function getCategoryId(option: DiscoveryOption) {
  const preference = option.preference;
  const serviceCategory = option.selection.linkedService ? getServiceCategory(option.selection.linkedService) : option.selection.category;
  if (preference?.type === "location" || serviceCategory === "Venues") return "venues";
  if (preference?.type === "food" || preference?.type === "cuisine" || ["Food and Catering", "Desserts"].includes(serviceCategory)) return "food";
  if (serviceCategory === "Music and DJs") return "music";
  if (preference?.type === "activity" || serviceCategory === "Entertainment and Activities") return "entertainment";
  if (serviceCategory === "Photography and Video" || /photo|video/i.test(preference?.category ?? "")) return "photo-video";
  if (preference?.type === "rental" || serviceCategory === "Rentals") return "rentals";
  if (serviceCategory === "Decor and Florals" || /design|decor/i.test(preference?.category ?? "")) return "decor";
  if (preference?.type === "transportation" || serviceCategory === "Transportation") return "transportation";
  if (preference?.type === "staffing" || serviceCategory === "Staffing and Logistics") return "staffing";
  if (preference?.type === "equipment" || serviceCategory === "Production and Equipment") return "production";
  if (["culture", "tradition", "setting", "atmosphere", "accessibility", "audience"].includes(preference?.type ?? "")) return "event-details";
  return "guest-services";
}

function category(id: string, label: string, description: string): DiscoveryCategory {
  return { description, id, label };
}

function toId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
