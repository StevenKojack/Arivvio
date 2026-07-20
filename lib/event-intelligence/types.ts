import type { EventType, ServiceName } from "@/app/data/marketplace";
import type { SelectedPlanningPreference } from "@/lib/planning-taxonomy/types";

export type BudgetTier = "economy" | "standard" | "premium" | "luxury";
export type Formality = "casual" | "semi-formal" | "formal" | "black-tie";
export type IndoorOutdoor = "indoor" | "outdoor" | "indoor-outdoor";
export type TimeOfDay = "morning" | "afternoon" | "evening" | "late-night";

export type EventTone =
  | "celebratory"
  | "professional"
  | "respectful"
  | "warm"
  | "neutral";

export type EventIdentity = {
  aliases: string[];
  canonicalEventType: string;
  inferredContext: string[];
  internalEventFamily: string;
  selectedDisplayEvent: string;
  subtype?: string;
};

export type EventTaxonomyProfile = {
  aliases: string[];
  ageContext?: string;
  budgetTier: BudgetTier;
  culture?: string;
  description: string;
  eventFamily?: string;
  excludedServices?: ServiceName[];
  formality: Formality;
  guestSize: string;
  id: string;
  indoorOutdoor: IndoorOutdoor;
  likelyGuestType?: string;
  likelyNeeds?: string[];
  likelyVibe?: string;
  luxuryAddOns: ServiceName[];
  marketplaceEventType?: EventType;
  optionalVendors: ServiceName[];
  primaryType: string;
  recommendedTags: string[];
  recommendedVendors: ServiceName[];
  religion?: string;
  requiredVendors: ServiceName[];
  season: string;
  subtype?: string;
  timeOfDay: TimeOfDay;
  venueStyle: string;
};

export type EventRecognition = {
  confidence: number;
  identity: EventIdentity;
  matchedAlias: string;
  normalizedQuery: string;
  profile: EventTaxonomyProfile;
  preservedSubtype?: string;
  recommendedServices: ServiceName[];
  excludedServices: ServiceName[];
  suggestedClarifyingQuestions: string[];
  tags: string[];
};

export type EventStage = {
  id: string;
  label: string;
  order: number;
};

export type AudienceType =
  | "all-ages"
  | "adults"
  | "kids"
  | "teens"
  | "families"
  | "seniors"
  | "custom";

export type AudienceProfile = {
  audienceType?: AudienceType;
  genderContext?: "boy" | "female" | "girl" | "male";
  guestAgeMax?: number;
  guestAgeMin?: number;
  honoreeAge?: number;
};

export type IntelligenceSource =
  | "explicit-selection"
  | "explicit-text"
  | "explicit-step-choice"
  | "deterministic-inference"
  | "default";

export type IntelligenceValue<T> = {
  confidence: number;
  source: IntelligenceSource;
  userConfirmed: boolean;
  value: T;
};

export type IntelligenceEvidence = IntelligenceValue<string | number | boolean> & {
  field: string;
};

export type EventIntelligenceProfile = {
  activityStyle: string[];
  audience: AudienceProfile;
  commercialVenue: boolean;
  cultures: string[];
  evidence: IntelligenceEvidence[];
  entertainment: string[];
  eventType: IntelligenceValue<string>;
  excludedServices: ServiceName[];
  foodStyles: string[];
  guestSize?: number;
  homeEvent: boolean;
  indoorOutdoor?: IndoorOutdoor;
  inferredPreferenceIds: string[];
  preferences: SelectedPlanningPreference[];
  recognition: EventRecognition;
  recommendationScores: Partial<Record<ServiceName, number>>;
  religiousContext: string[];
  requestedServices: ServiceName[];
  stages: EventStage[];
  subtype?: IntelligenceValue<string>;
  transportationNeeds: string[];
  travelRequired: boolean;
  venuePreferences: string[];
  venueRequired: boolean;
};

export type DiscoveryQuestion = {
  id: string;
  label: string;
  options?: string[];
  placeholder?: string;
  type: "text" | "select" | "number" | "boolean";
};

export type EventTiming = {
  date: string;
  endTime: string;
  setupTime: string;
  startTime: string;
  teardownTime: string;
  timezone: string;
};

export type VendorScoreFactor = {
  label: string;
  value: number;
};

export type VendorMatchScore = {
  bucket: "required" | "recommended" | "optional" | "luxury" | "other";
  factors: VendorScoreFactor[];
  reasons: string[];
  score: number;
};
