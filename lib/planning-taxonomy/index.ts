import { audiencePreferences, accessibilityPreferences, atmospherePreferences, settingPreferences } from "./contexts";
import { culturePreferences, foodPreferences, traditionPreferences } from "./food-culture";
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
  ...traditionPreferences,
  ...audiencePreferences,
  ...accessibilityPreferences,
  ...settingPreferences,
  ...atmospherePreferences,
];

export { audiencePreferences, culturePreferences, foodPreferences };
