import type { EventRecognition } from "./types";
import { getEventContextTone } from "./visual-tone";

// Curated editorial photography, not photographs of a user's event or a listed business.
export const eventAtmospheres = [
  { id: "gathering", label: "A table for your people", query: "Anniversary", phrase: "Good food. Familiar faces. A reason to gather.", photo: "photo-1511795409834-ef04bbd61622", alt: "Flowers and glassware on a table set for a gathering", position: "center" },
  { id: "birthday", label: "Make a birthday of it", query: "Birthday party", phrase: "Another year. A day that feels like you.", photo: "photo-1464349095431-e9a21285b5f3", alt: "A celebration cake with candles", position: "center 55%" },
  { id: "wedding", label: "Your day, your way", query: "Wedding", phrase: "From the first arrival to the last dance.", photo: "photo-1519167758481-83f550bb49b3", alt: "An elegant venue prepared for a wedding reception", position: "center" },
  { id: "outdoor", label: "Take it outside", query: "Backyard BBQ", phrase: "A little fresh air. A lot to look forward to.", photo: "photo-1500530855697-b586d89ba3ee", alt: "A quiet outdoor landscape in warm evening light", position: "center" },
  { id: "party", label: "Something worth celebrating", query: "Graduation party", phrase: "Big news deserves good company.", photo: "photo-1527529482837-4698179dc6ce", alt: "Friends gathered around a table for a celebration", position: "center" },
  { id: "corporate", label: "Bring the team together", query: "Corporate dinner", phrase: "Make room for a different kind of workday.", photo: "photo-1517245386807-bb43f82c33c4", alt: "People gathered at a shared table for a business event", position: "center" },
  { id: "memorial", label: "A moment to remember", query: "Memorial", phrase: "Space to gather, reflect and remember.", photo: "photo-1526047932273-341f2a7631f9", alt: "A quiet arrangement of flowers", position: "center" },
] as const;
export type Atmosphere = typeof eventAtmospheres[number];
export function atmosphereForEvent(recognition: EventRecognition): Atmosphere {
  const tone = getEventContextTone(recognition);
  if (tone === "respectful") return eventAtmospheres[6];
  if (tone === "professional") return eventAtmospheres[5];
  if (recognition.identity.canonicalEventType === "birthday") return eventAtmospheres[1];
  if (recognition.identity.canonicalEventType === "wedding") return eventAtmospheres[2];
  if (recognition.profile.visualPersonality === "water" || /outdoor|backyard|picnic/.test(recognition.normalizedQuery)) return eventAtmospheres[3];
  return eventAtmospheres[0];
}
export function atmosphereImage(atmosphere: Atmosphere, width = 1500) {
  return `https://images.unsplash.com/${atmosphere.photo}?auto=format&fit=crop&w=${width}&q=75`;
}

export function canRotateAtmosphere({ reduced, interacting, paused, hidden }: { reduced: boolean; interacting: boolean; paused: boolean; hidden: boolean }) {
  return !reduced && !interacting && !paused && !hidden;
}
