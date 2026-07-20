"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { searchPlanningPreferences } from "@/lib/planning-taxonomy/search";
import type {
  PlanningPreference,
  PlanningPreferenceType,
} from "@/lib/planning-taxonomy";

const placeholderExamples = [
  "Armenian DJ",
  "Taco cart",
  "Teen activities",
  "Chocolate fountain",
  "Party bus",
  "Outdoor seating",
  "Live band",
  "Foam cannon",
];

const typeLabels: Record<PlanningPreferenceType, string> = {
  accessibility: "Accessibility",
  activity: "Audience and activity",
  atmosphere: "Atmosphere",
  audience: "Audience",
  culture: "Culture and tradition",
  equipment: "Production equipment",
  food: "Food and cuisine",
  location: "Location type",
  rental: "Rental",
  service: "Service preference",
  setting: "Setting",
  staffing: "Staffing and logistics",
  tradition: "Culture and tradition",
  transportation: "Transportation",
};

export function PlanningSearch({
  compact = false,
  label = "Tell us what matters for this event",
  onSelect,
  selectedIds,
  support = "Search for services, activities, food, culture, traditions, audience details, or anything else you want included.",
  types,
}: {
  compact?: boolean;
  label?: string;
  onSelect: (preference: PlanningPreference) => void;
  selectedIds: string[];
  support?: string;
  types?: PlanningPreferenceType[];
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const listboxId = useId();
  const results = useMemo(
    () => searchPlanningPreferences(query, { excludeIds: selectedIds, types }),
    [query, selectedIds, types],
  );

  useEffect(() => {
    const timer = window.setInterval(
      () => setPlaceholderIndex((current) => (current + 1) % placeholderExamples.length),
      4200,
    );
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  function choose(preference: PlanningPreference) {
    onSelect(preference);
    setQuery("");
    setActiveIndex(-1);
    setIsOpen(false);
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <label htmlFor={inputId} className="block text-sm font-semibold text-[#0D1321]">
        {label}
      </label>
      {support ? <p className="mt-1 text-sm leading-6 text-neutral-600">{support}</p> : null}
      <div className="relative mt-3">
        <input
          id={inputId}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen && results.length > 0}
          aria-activedescendant={isOpen && results[activeIndex] ? `${listboxId}-${results[activeIndex].id}` : undefined}
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(-1);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && results.length) {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((current) => (current + 1 + results.length) % results.length);
            } else if (event.key === "ArrowUp" && results.length) {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((current) => (current < 0 ? results.length - 1 : (current - 1 + results.length) % results.length));
            } else if (event.key === "Enter" && isOpen && results[activeIndex >= 0 ? activeIndex : 0]) {
              event.preventDefault();
              choose(results[activeIndex >= 0 ? activeIndex : 0]);
            } else if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
          placeholder={`Try ${placeholderExamples[placeholderIndex]}`}
          className={`${compact ? "h-11" : "h-14"} w-full rounded-2xl border border-neutral-300 bg-white px-4 pr-12 text-sm font-semibold text-[#0D1321] outline-none transition placeholder:font-medium placeholder:text-neutral-400 focus:border-[#D4AF37]`}
        />
        <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg text-[#B88A1D]">
          +
        </span>
      </div>
      {isOpen && query.trim().length >= 2 ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-[min(360px,52vh)] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-2 shadow-[0_24px_70px_rgba(13,19,33,0.18)]"
        >
          {results.length ? results.map((result, index) => (
            <button
              id={`${listboxId}-${result.id}`}
              key={result.id}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(result)}
              className={`flex w-full items-start justify-between gap-4 rounded-xl px-3 py-3 text-left transition ${
                index === activeIndex ? "bg-[#F7F4EC]" : "hover:bg-neutral-50"
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-[#0D1321]">{result.label}</span>
                <span className="mt-1 block text-xs text-neutral-500">{result.description}</span>
              </span>
              <span className="shrink-0 rounded-full bg-[#0D1321]/6 px-2.5 py-1 text-[11px] font-semibold text-neutral-600">
                {typeLabels[result.type]}
              </span>
            </button>
          )) : (
            <p className="px-3 py-5 text-center text-sm text-neutral-500">
              No close match yet. Try a broader word such as music, food, rentals, or access.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
