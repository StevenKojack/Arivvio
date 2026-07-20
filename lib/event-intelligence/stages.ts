import { normalizeSearchText } from "./normalize";
import type { EventRecognition, EventStage } from "./types";

export type StageOption = {
  description?: string;
  id: string;
  label: string;
  stageIds: string[];
};

export type StageConfiguration = {
  availableStages: EventStage[];
  description: string;
  options: StageOption[];
};

const stage = (id: string, label: string, order: number): EventStage => ({ id, label, order });

const configurations: Record<string, StageConfiguration> = {
  wedding: {
    availableStages: [
      stage("rehearsal-dinner", "Rehearsal dinner", 1),
      stage("ceremony", "Ceremony", 2),
      stage("reception", "Reception", 3),
      stage("afterparty", "Afterparty", 4),
      stage("brunch", "Next-day brunch", 5),
    ],
    description: "Some weddings use more than one location. Choose the parts you want Arivvio to organize.",
    options: [
      { id: "ceremony", label: "Ceremony only", stageIds: ["ceremony"] },
      { id: "reception", label: "Reception only", stageIds: ["reception"] },
      { id: "both", label: "Ceremony and reception", stageIds: ["ceremony", "reception"] },
      { id: "custom", label: "Additional events", stageIds: [] },
    ],
  },
  funeral: {
    availableStages: [
      stage("service", "Service", 1),
      stage("graveside", "Burial or graveside", 2),
      stage("gathering", "Reception or gathering", 3),
    ],
    description: "Choose the arrangements you would like Arivvio to help coordinate.",
    options: [
      { id: "service", label: "Service only", stageIds: ["service"] },
      { id: "graveside", label: "Burial or graveside only", stageIds: ["graveside"] },
      { id: "gathering", label: "Reception or gathering only", stageIds: ["gathering"] },
      { id: "all", label: "Service, burial, and gathering", stageIds: ["service", "graveside", "gathering"] },
      { id: "custom", label: "Custom combination", stageIds: [] },
    ],
  },
  "celebration-of-life": {
    availableStages: [stage("memorial", "Memorial", 1), stage("gathering", "Gathering or reception", 2)],
    description: "Choose whether you are planning the memorial, the gathering, or both.",
    options: [
      { id: "memorial", label: "Memorial only", stageIds: ["memorial"] },
      { id: "gathering", label: "Gathering or reception only", stageIds: ["gathering"] },
      { id: "both", label: "Both", stageIds: ["memorial", "gathering"] },
      { id: "custom", label: "Custom combination", stageIds: [] },
    ],
  },
  quinceanera: {
    availableStages: [stage("ceremony", "Religious ceremony", 1), stage("reception", "Reception", 2), stage("additional", "Additional celebration", 3)],
    description: "Choose the parts of the celebration you want Arivvio to organize.",
    options: [
      { id: "ceremony", label: "Religious ceremony only", stageIds: ["ceremony"] },
      { id: "reception", label: "Reception only", stageIds: ["reception"] },
      { id: "both", label: "Ceremony and reception", stageIds: ["ceremony", "reception"] },
      { id: "custom", label: "Additional celebration", stageIds: [] },
    ],
  },
  christening: ceremonyGatheringConfiguration(),
  baptism: ceremonyGatheringConfiguration(),
  "bar-mitzvah": serviceCelebrationConfiguration(),
  "bat-mitzvah": serviceCelebrationConfiguration(),
  "corporate-event": corporateConfiguration(),
  "corporate-dinner": corporateConfiguration(),
  "bachelor-party": destinationConfiguration(),
  "bachelorette-party": destinationConfiguration(),
};

export function getStageConfiguration(recognition: EventRecognition) {
  return configurations[recognition.identity.canonicalEventType];
}

export function getInitialStages(recognition: EventRecognition): EventStage[] {
  const configuration = getStageConfiguration(recognition);
  if (!configuration) return [];
  const query = recognition.normalizedQuery;
  const explicitStageIds = configuration.availableStages
    .filter((item) =>
      [item.id, item.label].some((term) => query.includes(normalizeSearchText(term))),
    )
    .map((item) => item.id);

  return resolveStages(configuration, explicitStageIds);
}

export function resolveStages(configuration: StageConfiguration, stageIds: string[]) {
  return configuration.availableStages
    .filter((item) => stageIds.includes(item.id))
    .sort((left, right) => left.order - right.order);
}

function ceremonyGatheringConfiguration(): StageConfiguration {
  return {
    availableStages: [stage("ceremony", "Religious ceremony", 1), stage("gathering", "Reception or family gathering", 2)],
    description: "Choose whether you need help with the ceremony, the gathering, or both.",
    options: [
      { id: "ceremony", label: "Religious ceremony only", stageIds: ["ceremony"] },
      { id: "gathering", label: "Reception or family gathering only", stageIds: ["gathering"] },
      { id: "both", label: "Both", stageIds: ["ceremony", "gathering"] },
    ],
  };
}

function serviceCelebrationConfiguration(): StageConfiguration {
  return {
    availableStages: [stage("service", "Religious service", 1), stage("celebration", "Celebration", 2)],
    description: "Choose whether you are planning the service, the celebration, or both.",
    options: [
      { id: "service", label: "Religious service only", stageIds: ["service"] },
      { id: "celebration", label: "Celebration only", stageIds: ["celebration"] },
      { id: "both", label: "Both", stageIds: ["service", "celebration"] },
    ],
  };
}

function corporateConfiguration(): StageConfiguration {
  return {
    availableStages: [stage("conference", "Conference or program", 1), stage("dinner", "Dinner", 2), stage("networking", "Networking reception", 3), stage("offsite", "Off-site activity", 4)],
    description: "Select the connected parts you want included in the event plan.",
    options: [
      { id: "program", label: "Program only", stageIds: ["conference"] },
      { id: "dinner", label: "Dinner or reception", stageIds: ["dinner", "networking"] },
      { id: "custom", label: "Multiple parts", stageIds: [] },
    ],
  };
}

function destinationConfiguration(): StageConfiguration {
  return {
    availableStages: [stage("start", "Starting location", 1), stage("transportation", "Transportation", 2), stage("dining", "Dining", 3), stage("entertainment", "Entertainment destination", 4), stage("dropoff", "Final drop-off", 5)],
    description: "Select the stops you want kept together in one plan.",
    options: [
      { id: "destination", label: "One destination", stageIds: ["entertainment"] },
      { id: "transport", label: "Transportation and destination", stageIds: ["transportation", "entertainment", "dropoff"] },
      { id: "custom", label: "Plan the full route", stageIds: [] },
    ],
  };
}
