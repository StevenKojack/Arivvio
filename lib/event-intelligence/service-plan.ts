import type { ServiceName } from "@/app/data/marketplace";
import type { EventRecognition, EventStage } from "./types";

export type ServiceSuggestion = {
  reason: string;
  service: ServiceName;
};

const essentialsByEvent: Record<string, ServiceName[]> = {
  anniversary: ["Venue", "Catering"],
  baptism: ["Venue"],
  "baby-shower": ["Venue", "Catering"],
  "bachelor-party": ["Venue"],
  "bachelorette-party": ["Venue"],
  birthday: ["Venue", "Catering"],
  "celebration-of-life": ["Venue"],
  christening: ["Venue"],
  "corporate-dinner": ["Venue", "Catering"],
  "corporate-event": ["Venue"],
  funeral: ["Venue"],
  "funeral-reception": ["Venue"],
  graduation: ["Venue"],
  memorial: ["Venue"],
  "pool-party": ["Catering", "Rentals"],
  quinceanera: ["Venue", "Catering"],
  "sweet-16": ["Venue", "Catering"],
  wedding: ["Venue"],
};

const reasons: Partial<Record<ServiceName, string>> = {
  "AV Production": "Keeps sound, screens, lighting, and presentations coordinated.",
  "Cake & Desserts": "A simple way to give the celebration a focal moment.",
  Cleaning: "Helpful for larger home and outdoor events.",
  DJ: "Useful when music and a guided flow matter.",
  Florals: "Can shape the setting without adding more logistics for you.",
  "Live Music": "A more personal music option for key moments.",
  "Photo Booth": "Popular for teen, milestone, and group celebrations.",
  Photography: "Keeps the important moments covered without relying on guests.",
  Rentals: "Helpful when seating, shade, tables, or equipment are not included.",
  Staffing: "Useful when guest count or venue flow needs extra hands.",
  Transportation: "Helpful when the event uses multiple locations.",
  Registration: "Useful when guests need organized check-in or credentials.",
  "Printed Programs": "Helpful for sharing the order of service and remembrance details.",
};

const contextualServices: Record<string, ServiceName[]> = {
  "baby-shower": ["Cake & Desserts", "Florals", "Photography", "Balloons", "Rentals"],
  "bachelor-party": ["Party Bus", "Transportation", "Bartending", "DJ", "Security"],
  "bachelorette-party": ["Party Bus", "Transportation", "Bartending", "Photography", "DJ"],
  birthday: ["DJ", "Rentals", "Photo Booth", "Photography", "Magic"],
  "celebration-of-life": ["Catering", "Florals", "Transportation", "Printed Programs", "Photography"],
  "corporate-dinner": ["AV Production", "Registration", "Catering", "Photography", "Staffing"],
  "corporate-event": ["AV Production", "Registration", "Catering", "Photography", "Staffing"],
  funeral: ["Catering", "Florals", "Transportation", "Printed Programs"],
  "funeral-reception": ["Catering", "Florals", "Transportation", "Printed Programs"],
  "pool-party": ["Rentals", "Staffing", "Cleaning", "Photography"],
  "sweet-16": ["DJ", "Photo Booth", "Photography", "Party Bus", "Rentals"],
  wedding: ["Florals", "Live Music", "Photography", "Cake & Desserts", "Transportation"],
};

export function getEssentialServices(
  recognition: EventRecognition,
  stages: EventStage[] = [],
  homeEvent = false,
) {
  const essentials = new Set<ServiceName>(
    essentialsByEvent[recognition.identity.canonicalEventType] ?? recognition.profile.requiredVendors,
  );

  if (homeEvent || recognition.identity.inferredContext.includes("home-event")) {
    essentials.delete("Venue");
  }
  if (stages.some((stage) => stage.id === "reception" || stage.id === "gathering" || stage.id === "dinner")) {
    essentials.add("Catering");
  }

  return Array.from(essentials).filter((service) => !recognition.excludedServices.includes(service));
}

export function getServiceSuggestions(
  recognition: EventRecognition,
  activeServices: ServiceName[],
  stages: EventStage[] = [],
  recommendationScores: Partial<Record<ServiceName, number>> = {},
): ServiceSuggestion[] {
  const candidates = new Set<ServiceName>();

  if (recognition.identity.inferredContext.includes("home-event")) {
    candidates.add("Rentals");
    candidates.add("Cleaning");
  }
  (contextualServices[recognition.identity.canonicalEventType] ?? [
    ...recognition.profile.recommendedVendors,
    ...recognition.profile.optionalVendors,
  ]).forEach((service) => candidates.add(service));

  if (stages.length > 1) candidates.add("Transportation");

  return Array.from(candidates)
    .filter((service) => !activeServices.includes(service))
    .filter((service) => !recognition.excludedServices.includes(service))
    .sort((left, right) => (recommendationScores[right] ?? 0) - (recommendationScores[left] ?? 0))
    .slice(0, 5)
    .map((service) => ({
      reason: reasons[service] ?? "A useful option if it fits the event you have in mind.",
      service,
    }));
}

export function formatServiceSummary(labels: string[]) {
  const unique = Array.from(new Set(labels.map((label) => label.trim()).filter(Boolean)));
  if (!unique.length) return "We can help once you tell us what matters most.";
  const visible = unique.slice(0, 5);
  const formatted = formatNaturalList(visible.map(formatSummaryLabel));
  return `We can help you find ${formatted}${unique.length > visible.length ? " and other matching support" : ""}.`;
}

function formatSummaryLabel(label: string) {
  if (label === "Armenian DJ") return "an Armenian DJ";
  if (["Persian DJ", "Latin DJ"].includes(label)) return `a ${label}`;
  if (/^(Armenian|Mexican|Persian|Italian|Mediterranean|Jewish|Greek|Indian|Korean|Lebanese)\b/.test(label)) {
    return label;
  }
  if (label === "DJ") return "a DJ";
  return label.toLowerCase();
}

export function formatNaturalList(items: string[]) {
  if (items.length === 0) return "the right support";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}
