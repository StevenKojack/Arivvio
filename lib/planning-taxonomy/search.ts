import { normalizeSearchText } from "@/lib/event-intelligence/normalize";
import { planningPreferenceCatalog } from ".";
import type { PlanningPreference, PlanningPreferenceType } from "./types";

export function searchPlanningPreferences(
  query: string,
  options: { excludeIds?: string[]; limit?: number; types?: PlanningPreferenceType[] } = {},
) {
  const normalized = normalizeSearchText(query);
  const excluded = new Set(options.excludeIds ?? []);

  if (normalized.length < 2) return [];

  return planningPreferenceCatalog
    .filter((item) => !excluded.has(item.id))
    .filter((item) => !options.types || options.types.includes(item.type))
    .map((item) => ({ item, score: scorePreference(item, normalized) }))
    .filter(({ score }) => score > 0.18)
    .sort((left, right) => right.score - left.score || left.item.label.localeCompare(right.item.label))
    .slice(0, options.limit ?? 8)
    .map(({ item }) => item);
}

function scorePreference(item: PlanningPreference, query: string) {
  const values = [item.label, item.category, ...item.aliases].map(normalizeSearchText);
  return Math.max(...values.map((value) => {
    if (value === query) return 1;
    if (value.startsWith(query)) return 0.92;
    if (value.includes(query) || query.includes(value)) return 0.78;
    const words = query.split(" ");
    const overlap = words.filter((word) => value.includes(word)).length / words.length;
    return overlap * 0.62;
  }));
}

export function toSelectedPreference(item: PlanningPreference) {
  return {
    category: item.category,
    id: item.id,
    label: item.label,
    linkedService: item.linkedService,
    type: item.type,
  };
}
