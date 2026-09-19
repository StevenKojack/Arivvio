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
