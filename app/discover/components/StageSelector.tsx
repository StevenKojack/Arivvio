"use client";

import { useMemo, useState } from "react";
import { resolveStages, type StageConfiguration } from "@/lib/event-intelligence/stages";
import type { EventStage } from "@/lib/event-intelligence/types";

export function StageSelector({
  configuration,
  onChange,
  value,
}: {
  configuration: StageConfiguration;
  onChange: (stages: EventStage[]) => void;
  value: EventStage[];
}) {
  const selectedIds = useMemo(() => value.map((stage) => stage.id), [value]);
  const matchingOption = configuration.options.find((option) =>
    option.stageIds.length === selectedIds.length && option.stageIds.every((id) => selectedIds.includes(id)),
  );
  const [showCustom, setShowCustom] = useState(!matchingOption && value.length > 0);

  return (
    <section className="rounded-[24px] border border-neutral-200 bg-white p-4 sm:p-5">
      <h3 className="text-base font-semibold text-[#0D1321]">Which parts are you planning?</h3>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-600">{configuration.description}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {configuration.options.map((option) => {
          const selected = option.id === "custom" ? showCustom : matchingOption?.id === option.id && !showCustom;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                if (option.id === "custom") {
                  setShowCustom(true);
                  if (!value.length) onChange([]);
                } else {
                  setShowCustom(false);
                  onChange(resolveStages(configuration, option.stageIds));
                }
              }}
              className={`min-h-14 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition hover:-translate-y-0.5 ${selected ? "border-[#0D1321] bg-[#0D1321] text-white shadow-[0_12px_30px_rgba(13,19,33,0.14)]" : "border-neutral-200 bg-[#FFFCF7] text-neutral-700 hover:border-[#D4AF37]"}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {showCustom ? (
        <div className="mt-4 rounded-2xl bg-[#F7F4EC] p-4">
          <p className="text-sm font-semibold text-[#0D1321]">Select each part in the plan</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {configuration.availableStages.map((stage) => {
              const selected = selectedIds.includes(stage.id);
              return (
                <button key={stage.id} type="button" aria-pressed={selected} onClick={() => {
                  const nextIds = selected ? selectedIds.filter((id) => id !== stage.id) : [...selectedIds, stage.id];
                  onChange(resolveStages(configuration, nextIds));
                }} className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${selected ? "border-[#0D1321] bg-white text-[#0D1321]" : "border-transparent bg-[#0D1321]/6 text-neutral-600 hover:border-[#D4AF37]"}`}>
                  {selected ? "Selected: " : "Add: "}{stage.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {value.length > 1 ? (
        <p className="mt-4 rounded-2xl border border-[#D4AF37]/22 bg-[#D4AF37]/8 px-4 py-3 text-sm leading-6 text-neutral-700">
          We&apos;ll begin with {value[0].label.toLowerCase()}, then guide you through {value.slice(1).map((stage) => stage.label.toLowerCase()).join(" and ")}. This keeps timing, locations, transportation, and vendors connected.
        </p>
      ) : null}
    </section>
  );
}
