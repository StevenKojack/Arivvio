import { accessibilityPreferences, atmospherePreferences, audiencePreferences, settingPreferences } from "./contexts";
import { cuisinePreferences, culturePreferences, foodPreferences, traditionPreferences } from "./food-culture";
import {
  designMediaPreferences,
  entertainmentPreferences,
  productionPreferences,
  rentalPreferences,
  staffingPreferences,
  transportationPreferences,
  venuePreferences,
} from "./services";

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
