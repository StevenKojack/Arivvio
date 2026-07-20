"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { normalizeSearchText } from "@/lib/event-intelligence/normalize";
import { planningPreferenceCatalog } from "@/lib/planning-taxonomy";
import type { PlanningPreference } from "@/lib/planning-taxonomy/types";

export function TagDirectoryModal({
  isOpen,
  onClose,
  onSelect,
  selectedIds,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (preference: PlanningPreference) => void;
  selectedIds: string[];
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);
  const groups = useMemo(() => getDirectoryGroups(query), [query]);

  useEffect(() => {
    if (!isOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex items-end justify-center bg-[#0D1321]/38 backdrop-blur-[2px] sm:items-center sm:p-6"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="tag-directory-title" className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_32px_100px_rgba(13,19,33,0.3)] sm:max-w-3xl sm:rounded-[28px]">
        <div className="border-b border-neutral-200 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 id="tag-directory-title" className="text-xl font-semibold text-[#0D1321]">Browse everything</h3>
              <p className="mt-1 text-sm leading-6 text-neutral-600">Explore the details Arivvio can include, then add only what matters.</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-600 transition hover:border-[#0D1321]">Close</button>
          </div>
          <label className="mt-5 block text-sm font-semibold text-[#0D1321]">Search the directory
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search food, rentals, traditions, access..." className="mt-2 h-12 w-full rounded-2xl border border-neutral-300 px-4 text-sm font-semibold outline-none transition focus:border-[#D4AF37]" />
          </label>
        </div>
        <div className="touch-pan-y overflow-y-auto overscroll-contain p-4 sm:p-6">
          <div className="space-y-2">
            {groups.map(([category, items]) => {
              const isExpanded = query.trim().length >= 2 || expanded.includes(category);
              return (
                <section key={category} className="overflow-hidden rounded-2xl border border-neutral-200">
                  <button type="button" aria-expanded={isExpanded} onClick={() => setExpanded((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category])} className="flex w-full items-center justify-between gap-4 bg-[#FFFCF7] px-4 py-3 text-left transition hover:bg-[#F7F4EC]">
                    <span className="text-sm font-semibold text-[#0D1321]">{category}</span>
                    <span className="text-xs font-semibold text-neutral-500">{items.length} {isExpanded ? "Hide" : "View"}</span>
                  </button>
                  {isExpanded ? (
                    <div className="grid gap-2 border-t border-neutral-200 p-3 sm:grid-cols-2">
                      {items.map((item) => {
                        const selected = selectedIds.includes(item.id);
                        return (
                          <button key={item.id} type="button" aria-pressed={selected} onClick={() => { if (!selected) onSelect(item); }} className={`min-h-14 rounded-xl border px-3 py-3 text-left transition ${selected ? "border-[#2E7D5B] bg-[#EFF8F3]" : "border-neutral-200 bg-white hover:-translate-y-0.5 hover:border-[#D4AF37]"}`}>
                            <span className="block text-sm font-semibold text-[#0D1321]">{item.label}</span>
                            <span className="mt-1 block text-xs text-neutral-500">{selected ? "Added to your plan" : item.category}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
          {!groups.length ? <p className="py-12 text-center text-sm text-neutral-500">No matching details yet. Try a broader word.</p> : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function getDirectoryGroups(query: string): Array<[string, PlanningPreference[]]> {
  const normalized = normalizeSearchText(query);
  const filtered = planningPreferenceCatalog.filter((item) => {
    if (normalized.length < 2) return true;
    return [item.label, item.category, item.description, ...item.aliases]
      .map(normalizeSearchText)
      .some((value) => value.includes(normalized));
  });
  const grouped = new Map<string, PlanningPreference[]>();

  filtered.forEach((item) => {
    const category = getDirectoryCategory(item);
    grouped.set(category, [...(grouped.get(category) ?? []), item]);
  });
  return Array.from(grouped.entries()).sort(([left], [right]) => left.localeCompare(right));
}

function getDirectoryCategory(item: PlanningPreference) {
  if (item.label === "Cleanup") return "Cleaning";
  if (/religious/i.test(item.label)) return "Religious";
  if (/cultural/i.test(item.label)) return "Cultural";
  if (item.type === "accessibility") return "Accessibility";
  if (item.type === "activity") return "Activities";
  if (item.type === "culture") return "Cultural";
  if (item.type === "equipment") return "Production";
  if (item.type === "food") return "Food";
  if (item.type === "location") return "Venues";
  if (item.type === "rental") return "Rentals";
  if (item.type === "staffing") return "Staffing";
  if (item.type === "transportation") return "Transportation";
  if (item.type === "tradition" && /relig|blessing|glass|hora/i.test(item.label)) return "Religious";
  if (item.type === "tradition") return "Traditions";
  if (item.category === "Design and decor") return "Decor";
  if (["Interactive media", "Photo and video"].includes(item.category)) return "Photography";
  if (["Music", "Live music", "Entertainment", "Performers"].includes(item.category)) return "Entertainment";
  return item.category;
}
