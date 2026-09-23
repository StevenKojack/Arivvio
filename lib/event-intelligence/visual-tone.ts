import type { EventRecognition } from "./types";
import { normalizeSearchText } from "./normalize";

export type VisualTone = "celebratory" | "elegant" | "neutral";
export function getEventVisualTone(recognition: EventRecognition): VisualTone {
  const context = normalizeSearchText(`${recognition.normalizedQuery} ${recognition.identity.canonicalEventType} ${recognition.identity.internalEventFamily}`);
  // Conservative guard wins even when a festive word occurs in a serious context.
  if (/\b(funeral|memorial|celebration of life|wake|repass|burial|remembrance|mourning|corporate|conference|professional|ceremonial)\b/.test(context)) return "neutral";
  if (recognition.confidence < 0.48) return "neutral";
  if (recognition.identity.canonicalEventType === "birthday") return "celebratory";
  if (recognition.identity.canonicalEventType === "wedding") return "elegant";
  return "neutral";
}

export function getEventPersonality(recognition: EventRecognition) {
  const context = normalizeSearchText(`${recognition.normalizedQuery} ${recognition.identity.canonicalEventType} ${recognition.identity.internalEventFamily}`);
  if (getEventContextTone(recognition) !== "warm" || /\bceremonial\b/.test(context) || recognition.confidence < 0.48) return "none";
  return recognition.profile.visualPersonality ?? "none";
}

// Shared with planning recommendations, not only decorative treatments.
export function getEventContextTone(recognition: EventRecognition): "respectful" | "professional" | "warm" {
  const context = normalizeSearchText(`${recognition.identity.canonicalEventType} ${recognition.identity.internalEventFamily} ${recognition.normalizedQuery}`);
  if (/\b(funeral|memorial|celebration of life|wake|repass|burial|remembrance|mourning)\b/.test(context)) return "respectful";
  if (/\b(corporate|conference|business|professional|employees|company)\b/.test(context)) return "professional";
  return "warm";
}
