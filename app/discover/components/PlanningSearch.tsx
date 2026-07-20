"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { searchPlanningPreferences } from "@/lib/planning-taxonomy/search";
import { getCategoryPlanningSuggestions } from "@/lib/event-intelligence/suggestions";
import type {
  PlanningPreference,
  PlanningPreferenceType,
} from "@/lib/planning-taxonomy";

const fallbackPlaceholderExamples = [
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
  cuisine: "Cuisine",
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
  categories,
  compact = false,
  label = "Search services and vendor types",
  onSelect,
  selectedIds,
  suggestions,
  support = "Search services, activities, rentals, food formats, transportation, staffing, and logistics.",
  types,
}: {
  categories?: string[];
  compact?: boolean;
  label?: string;
  onSelect: (preference: PlanningPreference) => void;
  selectedIds: string[];
  suggestions?: PlanningPreference[];
  support?: string;
  types?: PlanningPreferenceType[];
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const inputId = useId();
  const listboxId = useId();
  const inspiration = useMemo(
    () => suggestions?.length ? suggestions : getCategoryPlanningSuggestions({ categories, types }),
    [categories, suggestions, types],
  );
  const results = useMemo(
    () => query.trim().length >= 2
      ? searchPlanningPreferences(query, { categories, types })
      : inspiration,
    [categories, inspiration, query, types],
  );
  const placeholders = inspiration.length ? inspiration.map((item) => item.label) : fallbackPlaceholderExamples;

  useEffect(() => {
    const timer = window.setInterval(
      () => setPlaceholderIndex((current) => (current + 1) % placeholders.length),
      4200,
    );
    return () => window.clearInterval(timer);
  }, [placeholders.length]);

  useEffect(() => {
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  function choose(preference: PlanningPreference) {
    if (selectedIds.includes(preference.id)) return;
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
          placeholder={`Try ${placeholders[placeholderIndex % placeholders.length]}`}
          className={`${compact ? "h-11" : "h-14"} w-full rounded-2xl border border-neutral-300 bg-white px-4 pr-12 text-sm font-semibold text-[#0D1321] outline-none transition placeholder:font-medium placeholder:text-neutral-400 focus:border-[#D4AF37]`}
        />
        <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg text-[#B88A1D]">
          +
        </span>
      </div>
      {isOpen && (results.length > 0 || query.trim().length >= 2) ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-[min(360px,52vh)] touch-pan-y scroll-py-2 overflow-y-auto overscroll-contain scroll-smooth rounded-2xl border border-neutral-200 bg-white p-2 shadow-[0_24px_70px_rgba(13,19,33,0.18)]"
        >
          {results.length ? results.map((result, index) => {
            const selected = selectedIds.includes(result.id);
            return (
            <button
              id={`${listboxId}-${result.id}`}
              key={result.id}
              ref={(element) => { optionRefs.current[index] = element; }}
              type="button"
              role="option"
              aria-selected={selected}
              aria-label={selected ? `${result.label} is already selected` : `Add ${result.label}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(result)}
              className={`flex w-full items-start justify-between gap-4 rounded-xl border px-3 py-3 text-left transition ${
                selected ? "border-[#2E7D5B]/30 bg-[#EFF8F3]" : index === activeIndex ? "border-transparent bg-[#F7F4EC]" : "border-transparent hover:bg-neutral-50"
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-[#0D1321]">{result.label}</span>
                <span className="mt-1 block text-xs text-neutral-500">{result.description}</span>
                <span className="mt-1 block text-[11px] font-semibold text-[#8B6816]">{result.category}</span>
              </span>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${selected ? "bg-[#2E7D5B] text-white" : "bg-[#0D1321] text-white"}`}>
                <span className="sr-only">{typeLabels[result.type]}: </span>{selected ? "✓" : "+"}
              </span>
            </button>
          );}) : (
            <p className="px-3 py-5 text-center text-sm text-neutral-500">
              No close match yet. Try a broader word such as music, food, rentals, or access.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
