import type { EventStage } from './types';

export function reasonAboutBudget(input: { overall?: number; stages?: EventStage[]; estimates?: number[]; quotes?: number[] }) {
  const valid = (value: number) => Number.isFinite(value) && value >= 0;
  const total = (values: number[]) => Math.round(values.filter(valid).reduce((sum, value) => sum + value, 0) * 100) / 100;
  const overall = input.overall !== undefined && valid(input.overall) && input.overall > 0 ? input.overall : null;
  const allocated = total((input.stages ?? []).flatMap(stage => stage.budget === undefined ? [] : [stage.budget]));
  const estimates = total(input.estimates ?? []);
  const quotes = total(input.quotes ?? []);
  return { overall, allocated, estimates, quotes,
    unallocated: overall === null ? null : overall - allocated,
    remainingAgainstEstimates: overall === null ? null : overall - estimates,
    remainingAgainstQuotes: overall === null ? null : overall - quotes,
    signals: [
      ...(overall !== null && allocated > overall ? ['Stage allocations exceed the overall budget.'] : []),
      ...(overall !== null && estimates > overall ? ['Requested estimates exceed the overall budget.'] : []),
      ...(overall !== null && quotes > overall ? ['Received quotes exceed the overall budget.'] : []),
    ],
  };
}
