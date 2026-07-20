"use client";

import { useId, useMemo, useState } from "react";
import { searchPlanningPreferences } from "@/lib/planning-taxonomy/search";
import type { PlanningPreference, PlanningPreferenceType, SelectedPlanningPreference } from "@/lib/planning-taxonomy";

export function AdvancedMultiSelectField({
  label,
  onAdd,
  onRemove,
  placeholder,
  selected,
  types,
}: {
  label: string;
  onAdd: (item: PlanningPreference) => void;
  onRemove: (item: SelectedPlanningPreference) => void;
  placeholder: string;
  selected: SelectedPlanningPreference[];
  types: PlanningPreferenceType[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const listId = useId();
  const results = useMemo(
    () => searchPlanningPreferences(query, { limit: 7, types }),
    [query, types],
  );

  return (
    <div className="relative rounded-2xl border border-neutral-200 bg-white p-4">
      <label className="text-sm font-semibold text-[#0D1321]" htmlFor={`${listId}-input`}>{label}</label>
      <div className="relative mt-2">
        <input
          id={`${listId}-input`}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open && results.length > 0}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter" && results[0]) {
              event.preventDefault();
              onAdd(results[0]);
              setQuery("");
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 pr-12 text-sm font-medium outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15"
        />
        <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-[#B88A1D]">+</span>
        {open && query.trim().length >= 2 ? (
          <div id={listId} role="listbox" className="absolute inset-x-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-2 shadow-[0_18px_48px_rgba(13,19,33,0.14)]">
            {results.length ? results.map((item) => {
              const isSelected = selected.some((value) => value.id === item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    if (isSelected) {
                      const selectedItem = selected.find((value) => value.id === item.id);
                      if (selectedItem) onRemove(selectedItem);
                    } else {
                      onAdd(item);
                    }
                    setQuery("");
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${isSelected ? "bg-[#EFF8F3] text-[#285E49]" : "text-[#0D1321] hover:bg-[#F7F4EC]"}`}
                >
                  <span>{item.label}</span>
                  <span aria-hidden="true">{isSelected ? "✓" : "+"}</span>
                </button>
              );
            }) : <p className="px-3 py-4 text-center text-sm text-neutral-500">No close match found.</p>}
          </div>
        ) : null}
      </div>
      {selected.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onRemove(item)}
              aria-label={`Remove ${item.label} from ${label}`}
              className="rounded-full border border-[#2E7D5B]/30 bg-[#EFF8F3] px-3 py-2 text-xs font-semibold text-[#285E49] transition hover:border-[#2E7D5B] focus-visible:ring-2 focus-visible:ring-[#0D1321]"
            >
              {item.label} <span aria-hidden="true">&times;</span>
            </button>
          ))}
        </div>
      ) : <p className="mt-2 text-xs leading-5 text-neutral-500">Optional. Add more than one if it helps the plan.</p>}
    </div>
  );
}
