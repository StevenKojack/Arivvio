import { allServices, type ServiceName } from "@/app/data/marketplace";
import {
  createPlanDetailTag,
  createPreferenceSelection,
  createServiceSelection,
  getServiceDetailGroups,
  mergePlanSelection,
  updateSelectionDetails,
  type PlanSelection,
  type SelectedPlanningPreference,
} from "@/lib/planning-taxonomy";
import { normalizeSearchText } from "./normalize";
import { hasNegatedPhrase, hasPositivePhrase } from "./intent-text";

const serviceAliases: Partial<Record<ServiceName, string[]>> = {
  Catering: ["catering", "caterer", "food service", "food", "tacos"],
  DJ: ["dj", "disc jockey"],
  Photography: ["photography", "photographer", "taking pictures"],
  Florals: ["flowers", "florist"],
  "AV Production": ["av", "audio visual"],
  Rentals: ["rentals", "rental"],
  Transportation: ["transportation", "transport"],
  Venue: ["venue", "event space"],
};

export function inferServicePlanSelections(
  query: string,
  preferences: SelectedPlanningPreference[],
  excludedServices: ServiceName[],
) {
  let selections: PlanSelection[] = [];

  preferences
    .filter((preference) => preference.linkedService && preference.type !== "location")
    .filter((preference) => !excludedServices.includes(preference.linkedService as ServiceName))
    .forEach((preference) => {
      selections = mergePlanSelection(
        selections,
        createPreferenceSelection(preference, "natural-language-inference"),
      );
    });

  allServices.forEach((service) => {
    const terms = [service, ...(serviceAliases[service] ?? [])];
    if (
      !excludedServices.includes(service) &&
      terms.some((term) => hasPositivePhrase(query, term) && !hasNegatedPhrase(query, term))
    ) {
      selections = mergePlanSelection(
        selections,
        createServiceSelection(service, "natural-language-inference"),
      );
    }
  });

  selections = selections.map((selection) => {
    if (!selection.linkedService) return selection;
    const groups = getServiceDetailGroups(selection.linkedService);
    let inferredDetails = groups.flatMap((group) =>
      group.options
        .filter((option) => hasPositivePhrase(query, option.label))
        .filter((option) => !hasNegatedPhrase(query, option.label))
        .map((option) => ({
          ...createPlanDetailTag(
            group.label,
            option.label,
            option.matchingServices,
            option.preferenceId,
            option.type,
          ),
          source: "inferred" as const,
        })),
    );

    // Keep the strongest explicit music request even when a broader cultural
    // DJ preference is also recognized from the same sentence.
    if (
      selection.linkedService === "DJ" &&
      hasPositivePhrase(query, "Top 40") &&
      !hasNegatedPhrase(query, "Top 40")
    ) {
      inferredDetails = mergeDetails(inferredDetails, [{
        ...createPlanDetailTag("Music types", "Top 40"),
        source: "inferred" as const,
      }]);
    }

    return inferredDetails.length
      ? updateSelectionDetails(selection, mergeDetails(selection.details, inferredDetails))
      : selection;
  });

  return selections;
}

function mergeDetails<T extends { group: string; label: string }>(current: T[], incoming: T[]) {
  const details = new Map<string, T>();
  [...current, ...incoming].forEach((detail) => {
    const key = normalizeSearchText(detail.label);
    if (!details.has(key)) details.set(key, detail);
  });
  return Array.from(details.values());
}
