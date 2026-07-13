import type { ServiceName } from "@/app/data/marketplace";

export type EventInferenceFixture = {
  excludedServices?: ServiceName[];
  expectedFamily: string;
  expectedSubtype: string;
  query: string;
  recommendedIncludes: ServiceName[];
};

export const eventInferenceFixtures: EventInferenceFixture[] = [
  {
    expectedFamily: "social party",
    expectedSubtype: "Pool party",
    query: "Pool Party",
    recommendedIncludes: ["Rentals", "Catering"],
  },
  {
    expectedFamily: "birthday",
    expectedSubtype: "Quinceañera",
    query: "quince",
    recommendedIncludes: ["DJ", "Catering", "Photography", "Florals"],
  },
  {
    expectedFamily: "wedding",
    expectedSubtype: "Armenian wedding",
    query: "Armenian wedding",
    recommendedIncludes: ["Venue", "Catering", "Florals", "Photography"],
  },
  {
    expectedFamily: "religious celebration",
    expectedSubtype: "Bar mitzvah",
    query: "bar mitzvah",
    recommendedIncludes: ["Venue", "Catering", "DJ", "Photo Booth"],
  },
  {
    excludedServices: ["DJ", "Magic", "Character Performers"],
    expectedFamily: "memorial",
    expectedSubtype: "Funeral reception",
    query: "funeral reception",
    recommendedIncludes: ["Venue", "Catering", "Florals", "Live Streaming"],
  },
  {
    expectedFamily: "corporate",
    expectedSubtype: "Corporate seminar",
    query: "corporate seminar",
    recommendedIncludes: ["Venue", "AV Production", "Registration", "Catering"],
  },
];
