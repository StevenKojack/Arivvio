import { preferenceGroup } from "./factory";

export const audiencePreferences = preferenceGroup(
  ["All ages", "Adults only", "Kids only", "Teens", "Families", "Seniors", "Teen activities", "Kids activities"],
  { category: "Audience", description: "Who the experience should work well for.", type: "audience" },
);

export const accessibilityPreferences = preferenceGroup(
  [
    "Wheelchair access", "Step-free access", "Accessible restrooms", "Accessible parking",
    "ASL interpretation", "Captioning", "Sensory-friendly space", "Quiet room", "Dietary accessibility",
  ],
  { category: "Accessibility", description: "An access need that should shape matching and planning.", type: "accessibility" },
);

export const settingPreferences = preferenceGroup(
  ["Indoor", "Outdoor", "Indoor and outdoor", "At home", "Near public transit", "Pet-friendly", "Rain backup", "Outdoor seating", "Poolside"],
  { category: "Setting", description: "A practical preference for the event setting.", type: "setting" },
);

export const atmospherePreferences = preferenceGroup(
  ["Casual", "Elegant", "Formal", "Relaxed", "High-energy", "Intimate", "Family-friendly", "Nightlife", "Quiet", "Colorful", "Minimal", "Traditional", "Modern"],
  { category: "Atmosphere", description: "How the event should feel to guests.", type: "atmosphere" },
);
