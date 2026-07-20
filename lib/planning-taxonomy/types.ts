import type { ServiceName } from "@/app/data/marketplace";

export type PlanningPreferenceType =
  | "accessibility"
  | "activity"
  | "atmosphere"
  | "audience"
  | "culture"
  | "equipment"
  | "food"
  | "location"
  | "rental"
  | "service"
  | "setting"
  | "staffing"
  | "tradition"
  | "transportation";

export type PlanningPreference = {
  aliases: string[];
  category: string;
  compatibleEventTypes?: string[];
  description: string;
  id: string;
  label: string;
  linkedService?: ServiceName;
  type: PlanningPreferenceType;
};

export type SelectedPlanningPreference = Pick<
  PlanningPreference,
  "category" | "id" | "label" | "linkedService" | "type"
>;
