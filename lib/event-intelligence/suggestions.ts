import { planningPreferenceCatalog } from "@/lib/planning-taxonomy";
import type {
  PlanningPreference,
  PlanningPreferenceType,
} from "@/lib/planning-taxonomy/types";
import type { AudienceProfile, EventRecognition } from "./types";

const eventSuggestionLabels: Record<string, string[]> = {
  anniversary: ["Private dining room", "Live band", "Photographer", "Florals", "Wedding cake"],
  baptism: ["Church", "Reception catering", "Photographer", "Traditional music", "Family style"],
  "baby-shower": ["Dessert table", "Balloons", "Photographer", "Mocktail bar", "Backdrop"],
  "bachelor-party": ["Party bus", "VIP transportation", "Steakhouse", "Nightclub", "Private dining room", "DJ"],
  "bachelorette-party": ["Party bus", "VIP transportation", "Private dining room", "Nightclub", "Photographer", "DJ"],
  "bar-mitzvah": ["Religious ceremony", "Live band", "Cultural DJ", "Photographer", "Reception catering"],
  "bat-mitzvah": ["Religious ceremony", "Live band", "Cultural DJ", "Photographer", "Reception catering"],
  birthday: ["Teen activities", "Magician", "Taco cart", "Bounce house", "Photo booth", "Arcade", "Foam cannon"],
  christmas: ["Catering", "Live band", "Florals", "Dessert table", "Photographer"],
  "celebration-of-life": ["Reception catering", "Floral arrangements", "Guest transportation", "Memorial printing", "Photographer"],
  christening: ["Church", "Reception catering", "Photographer", "Traditional music", "Family style"],
  "corporate-dinner": ["AV Production", "Stage", "Coffee cart", "Catering", "Registration staff", "Photographer"],
  "corporate-event": ["AV Production", "Stage", "Coffee cart", "Catering", "Registration staff", "Photographer"],
  conference: ["AV Production", "Stage", "Coffee cart", "Registration staff", "Projectors", "Event staff"],
  engagement: ["Private dining room", "Photographer", "Florals", "Live band", "Dessert table"],
  funeral: ["Reception catering", "Floral arrangements", "Guest transportation", "Memorial printing"],
  halloween: ["Character performers", "DJ", "Dessert table", "Lighting", "Security"],
  "gender-reveal": ["Dessert table", "Balloons", "Photographer", "Mocktail bar", "Backdrop"],
  fundraiser: ["AV Production", "Registration staff", "Catering", "Photographer", "Custom signage"],
  graduation: ["Photo booth", "Photographer", "Taco cart", "DJ", "Balloons"],
  memorial: ["Reception catering", "Floral arrangements", "Guest transportation", "Memorial printing"],
  "pool-party": ["Lifeguard", "Outdoor seating", "Taco cart", "Canopies", "Foam cannon", "Cleanup"],
  quinceanera: ["Cultural DJ", "Live band", "Photographer", "Florals", "Formal entrance", "Wedding cake"],
  seminar: ["AV Production", "Coffee cart", "Registration staff", "Projectors", "Microphones"],
  "sweet-16": ["Teen activities", "Photo booth", "DJ", "Party bus", "Arcade games", "Photographer"],
  "trade-show": ["AV Production", "Booth rentals", "Registration staff", "Custom signage", "Event staff"],
  wedding: ["Florals", "Live band", "String quartet", "Ceremony music", "Wedding cake", "Photographer"],
  thanksgiving: ["Reception catering", "Tables", "Chairs", "Dessert table", "Cleanup"],
  "new-years-eve": ["DJ", "Catering", "Lighting", "Security", "Guest transportation"],
  diwali: ["Indian catering", "Live band", "Lighting", "Florals", "Photographer"],
  "lunar-new-year": ["Reception catering", "Traditional music", "Florals", "Photographer", "Event staff"],
};

const typeSuggestionLabels: Partial<Record<PlanningPreferenceType, string[]>> = {
  accessibility: ["Wheelchair access", "Step-free access", "Accessible restrooms", "Accessible parking"],
  activity: ["Magician", "Photo booth", "Fire dancers", "Painting lesson", "Arcade games"],
  atmosphere: ["Elegant", "Relaxed", "Intimate", "High-energy", "Traditional", "Modern"],
  audience: ["All ages", "Adults only", "Kids only", "Teens", "Families"],
  culture: ["Armenian", "Persian", "Jewish", "Filipino", "Greek", "Indian"],
  food: ["Armenian catering", "Mexican catering", "Mediterranean catering", "Sushi", "Barbecue", "Taco cart"],
  location: ["Banquet hall", "Church", "Private dining room", "Backyard", "Rooftop", "Arcade"],
  rental: ["Tables", "Chairs", "Tents", "Lighting", "Dance floor", "Stage"],
  setting: ["Indoor", "Outdoor", "At home", "Outdoor seating", "Rain backup"],
  staffing: ["Event staff", "Registration staff", "Security", "Cleanup", "Day-of coordinator"],
  tradition: ["Religious ceremony", "Traditional music", "Formal entrance", "Memorial tribute"],
  transportation: ["Party bus", "Limousine", "Shuttle", "Valet", "VIP transportation"],
};

export function getContextualPlanningSuggestions(
  recognition: EventRecognition,
  audience?: AudienceProfile,
) {
  const labels = [...(eventSuggestionLabels[recognition.identity.canonicalEventType] ?? [])];

  if (recognition.identity.canonicalEventType === "birthday" && audience?.audienceType === "kids") {
    labels.unshift("Kids activities", "Character performers", "Bounce house");
  }
  if (recognition.identity.canonicalEventType === "birthday" && audience?.audienceType === "teens") {
    labels.unshift("Teen activities", "Arcade", "Photo booth");
  }

  return getPreferencesByLabels(labels);
}

export function getPlanningSearchHelper(
  recognition: EventRecognition,
  audience?: AudienceProfile,
) {
  const suggestions = getContextualPlanningSuggestions(recognition, audience)
    .slice(0, 5)
    .map((item) => item.label);

  if (!suggestions.length) {
    return "Search for a service, experience, or practical need.";
  }

  const finalSuggestion = suggestions.pop();
  const readable = suggestions.length
    ? `${suggestions.join(", ")}, or ${finalSuggestion}`
    : finalSuggestion;

  return `Try ${readable}.`;
}

export function getCategoryPlanningSuggestions(options: {
  categories?: string[];
  types?: PlanningPreferenceType[];
}) {
  const labels = (options.types ?? []).flatMap((type) => typeSuggestionLabels[type] ?? []);
  const categoryItems = options.categories?.length
    ? planningPreferenceCatalog.filter((item) => options.categories?.includes(item.category)).slice(0, 7)
    : [];

  return uniquePreferences([...getPreferencesByLabels(labels), ...categoryItems]);
}

export function getPreferencesByLabels(labels: string[]) {
  return uniquePreferences(labels.flatMap((label) => {
    const match = planningPreferenceCatalog.find((item) => item.label.toLowerCase() === label.toLowerCase());
    return match ? [match] : [];
  }));
}

function uniquePreferences(items: PlanningPreference[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
