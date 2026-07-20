"use client";

import type { AudienceProfile, GenderContext } from "@/lib/event-intelligence/types";

const options: Array<{ label: string; value: GenderContext }> = [
  { label: "Female", value: "female" },
  { label: "Male", value: "male" },
  { label: "Nonbinary", value: "nonbinary" },
  { label: "Prefer to self-describe", value: "self-described" },
  { label: "Prefer not to say", value: "prefer-not-to-say" },
];

export function GenderControl({ onChange, value }: { onChange: (value: AudienceProfile) => void; value: AudienceProfile }) {
  const normalizedValue = value.genderContext === "girl" ? "female" : value.genderContext === "boy" ? "male" : value.genderContext;

  return (
    <fieldset className="rounded-2xl border border-neutral-200 bg-white p-4">
      <legend className="px-1 text-sm font-semibold text-[#0D1321]">Gender</legend>
      <p className="mt-1 text-xs leading-5 text-neutral-500">Optional, and only used as event context when you provide it.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const selected = normalizedValue === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange({
                ...value,
                genderContext: selected ? undefined : option.value,
                genderDescription: option.value === "self-described" ? value.genderDescription : undefined,
              })}
              className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${selected ? "border-[#2E7D5B] bg-[#EFF8F3] text-[#285E49]" : "border-neutral-200 bg-white text-neutral-700 hover:border-[#D4AF37]"}`}
            >
              {selected ? <span aria-hidden="true">✓ </span> : null}{option.label}
            </button>
          );
        })}
      </div>
      {normalizedValue === "self-described" ? (
        <label className="mt-3 block text-xs font-semibold text-neutral-600">How would you describe it?
          <input value={value.genderDescription ?? ""} onChange={(event) => onChange({ ...value, genderContext: "self-described", genderDescription: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none transition focus:border-[#D4AF37]" />
        </label>
      ) : null}
    </fieldset>
  );
}
