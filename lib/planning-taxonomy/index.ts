import { audiencePreferences, accessibilityPreferences, atmospherePreferences, settingPreferences } from "./contexts";
import { cuisinePreferences, culturePreferences, foodPreferences, traditionPreferences } from "./food-culture";
import { designMediaPreferences, entertainmentPreferences, productionPreferences, rentalPreferences, staffingPreferences, transportationPreferences, venuePreferences } from "./services";

export type { PlanningPreference, PlanningPreferenceType, SelectedPlanningPreference } from "./types";

export const planningPreferenceCatalog = [
  ...venuePreferences,
  ...foodPreferences,
  ...entertainmentPreferences,
  ...rentalPreferences,
  ...productionPreferences,
  ...transportationPreferences,
  ...staffingPreferences,
  ...designMediaPreferences,
  ...culturePreferences,
  ...cuisinePreferences,
  ...traditionPreferences,
  ...audiencePreferences,
  ...accessibilityPreferences,
  ...settingPreferences,
  ...atmospherePreferences,
];

export { audiencePreferences, cuisinePreferences, culturePreferences, foodPreferences };
export type { PlanDetailTag, PlanSelection, PlanSelectionSource, ServiceDetailGroup } from "./selection";
export { createPlanDetailTag, createPreferenceSelection, createServiceSelection, getServiceDetailGroups, isAdvancedPreference, mergePlanSelection, primaryServiceNames, serviceDetailCatalog, toSelectedPreferencesFromPlan, updateSelectionDetails } from "./selection";
