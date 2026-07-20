"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { normalizeSearchText } from "@/lib/event-intelligence/normalize";
import { planningPreferenceCatalog } from "@/lib/planning-taxonomy";
import type { PlanningPreference } from "@/lib/planning-taxonomy";

type DirectoryCategory = {
  description: string;
  id: string;
  name: string;
};

const categories: DirectoryCategory[] = [
  { id: "venues", name: "Venues", description: "Places and event settings" },
  { id: "food", name: "Food and Catering", description: "Meals, carts, bars, and service styles" },
  { id: "music", name: "Music and DJs", description: "DJs, bands, singers, and ceremony music" },
  { id: "photo", name: "Photography and Video", description: "Photo, video, booths, and event coverage" },
  { id: "rentals", name: "Rentals", description: "Furniture, tents, lighting, and equipment" },
  { id: "entertainment", name: "Entertainment and Activities", description: "Performers and guest experiences" },
  { id: "decor", name: "Decor and Florals", description: "Flowers, balloons, backdrops, and design" },
  { id: "transportation", name: "Transportation", description: "Shuttles, party buses, valet, and parking" },
  { id: "desserts", name: "Desserts", description: "Cakes, sweets, carts, and dessert displays" },
  { id: "staffing", name: "Staffing and Security", description: "Event teams, security, and guest support" },
  { id: "production", name: "Production and Equipment", description: "Sound, video, staging, and technical support" },
  { id: "cleaning", name: "Cleaning and Logistics", description: "Setup, cleanup, permits, and operations" },
  { id: "guest-services", name: "Invitations and Guest Services", description: "Invitations, registration, and printed details" },
  { id: "specialty", name: "Specialty Services", description: "Additional event-specific services" },
];

export function TagDirectoryModal({
  isOpen,
  onClose,
  onSelect,
  onRemove,
  selectedIds,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (preference: PlanningPreference) => void;
  onRemove: (preference: PlanningPreference) => void;
  selectedIds: string[];
}) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const dialogRef = useRef<HTMLDivElement>(null);
  const activeCategory = categories.find((item) => item.id === activeCategoryId);
  const options = useMemo(
    () => activeCategoryId ? getCategoryOptions(activeCategoryId, deferredQuery) : [],
    [activeCategoryId, deferredQuery],
  );
  const closeModal = useCallback(() => {
    setActiveCategoryId(undefined);
    setQuery("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const firstFocusable = dialog?.querySelector<HTMLElement>("button, input");
    firstFocusable?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled])"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [closeModal, isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-[#0D1321]/38 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="directory-title" className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[26px] bg-white shadow-[0_28px_80px_rgba(13,19,33,0.24)] sm:max-w-4xl sm:rounded-[26px]">
        <header className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            {activeCategory ? (
              <button type="button" onClick={() => { setActiveCategoryId(undefined); setQuery(""); }} className="mb-2 text-sm font-semibold text-[#B88A1D] outline-none hover:text-[#8B6816] focus-visible:ring-2 focus-visible:ring-[#0D1321]">&larr; All categories</button>
            ) : null}
            <h3 id="directory-title" className="text-xl font-semibold text-[#0D1321] sm:text-2xl">{activeCategory?.name ?? "Browse all services"}</h3>
            <p className="mt-1 text-sm leading-6 text-neutral-600">{activeCategory?.description ?? "Choose a category, then add only what your event needs."}</p>
          </div>
          <button type="button" onClick={closeModal} aria-label="Close Browse All" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-xl text-neutral-600 outline-none transition hover:border-[#0D1321] focus-visible:ring-2 focus-visible:ring-[#0D1321]">&times;</button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          {!activeCategory ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <button key={category.id} type="button" onClick={() => setActiveCategoryId(category.id)} className="group flex min-h-28 items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 text-left outline-none transition hover:-translate-y-0.5 hover:border-[#D4AF37] hover:bg-[#FFFCF7] focus-visible:ring-2 focus-visible:ring-[#0D1321]">
                  <CategoryIcon id={category.id} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[#0D1321]">{category.name}</span>
                    <span className="mt-1 block text-xs leading-5 text-neutral-500">{category.description}</span>
                  </span>
                  <span aria-hidden="true" className="text-lg text-[#B88A1D] transition group-hover:translate-x-0.5">&rarr;</span>
                </button>
              ))}
            </div>
          ) : (
            <>
              <label className="block text-sm font-semibold text-[#0D1321]">Search within {activeCategory.name}
                <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${activeCategory.name.toLowerCase()}...`} className="mt-2 h-12 w-full rounded-2xl border border-neutral-300 px-4 text-sm font-medium outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15" />
              </label>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {options.map((item) => {
                  const selected = selectedIds.includes(item.id);
                  return (
                    <button key={item.id} type="button" aria-pressed={selected} aria-label={selected ? `Remove ${item.label}` : `Add ${item.label}`} onClick={() => selected ? onRemove(item) : onSelect(item)} className={`flex min-h-20 items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-left outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#0D1321] ${selected ? "border-[#2E7D5B] bg-[#EFF8F3]" : "border-neutral-200 bg-white hover:border-[#D4AF37]"}`}>
                      <span>
                        <span className="block text-sm font-semibold text-[#0D1321]">{item.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-neutral-500">{item.category}</span>
                      </span>
                      <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${selected ? "bg-[#2E7D5B]" : "bg-[#0D1321]"}`}>{selected ? "✓" : "+"}</span>
                    </button>
                  );
                })}
              </div>
              {!options.length ? <p className="py-12 text-center text-sm text-neutral-500">No matching options in this category.</p> : null}
            </>
          )}
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-neutral-200 bg-[#FFFCF7] px-5 py-4 sm:px-6">
          <p aria-live="polite" className="text-sm font-semibold text-neutral-600">{selectedIds.length} selected</p>
          <button type="button" onClick={closeModal} className="h-11 rounded-full bg-[#0D1321] px-6 text-sm font-semibold text-white outline-none transition hover:-translate-y-0.5 hover:bg-[#16233B] focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2">Done</button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function getCategoryOptions(categoryId: string, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  return planningPreferenceCatalog
    .filter(isMarketplacePreference)
    .filter((item) => getCategoryId(item) === categoryId)
    .filter((item) => normalizedQuery.length < 2 || [item.label, item.category, item.description, ...item.aliases].some((value) => normalizeSearchText(value).includes(normalizedQuery)))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function isMarketplacePreference(item: PlanningPreference) {
  return !["accessibility", "atmosphere", "audience", "culture", "cuisine", "setting", "tradition"].includes(item.type);
}

function getCategoryId(item: PlanningPreference) {
  const label = normalizeSearchText(item.label);
  if (item.type === "location") return "venues";
  if (/cake|cupcake|dessert|chocolate|candy|cotton candy|popcorn|snow cone|ice cream/.test(label)) return "desserts";
  if (item.type === "food") return "food";
  if (["Music", "Live music"].includes(item.category)) return "music";
  if (["Photo and video", "Interactive media"].includes(item.category)) return "photo";
  if (item.type === "rental") return "rentals";
  if (item.type === "activity" || ["Entertainment", "Performers", "Activities and entertainment"].includes(item.category)) return "entertainment";
  if (item.category === "Design and decor" && /invitation|place card|table number|printing/.test(label)) return "guest-services";
  if (item.category === "Design and decor") return "decor";
  if (item.type === "transportation") return "transportation";
  if (item.type === "staffing" && /cleanup|setup|breakdown|permit|parking|restroom/.test(label)) return "cleaning";
  if (item.type === "staffing") return "staffing";
  if (item.type === "equipment") return "production";
  return "specialty";
}

function CategoryIcon({ id }: { id: string }) {
  const paths: Record<string, string> = {
    venues: "M4 20V9l8-5 8 5v11M8 20v-6h8v6",
    food: "M7 3v8M4 3v5c0 2 6 2 6 0V3M17 3v18M17 3c4 3 4 8 0 10",
    music: "M9 18V5l10-2v13M9 9l10-2M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    photo: "M4 7h4l2-3h4l2 3h4v13H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    rentals: "M5 12h14v8M7 12V6h10v6M8 20v2M16 20v2",
    transportation: "M4 16V9l3-4h10l3 4v7M6 16h12M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
    staffing: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 21c0-4 3-7 7-7s7 3 7 7",
    production: "M4 8h16v10H4zM8 8V5h8v3M9 12h6M12 8v10",
  };
  const path = paths[id] ?? "M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.8-5.4 2.8 1-6.1-4.4-4.3 6.1-.9z";
  return <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F7F4EC] text-[#B88A1D]"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg></span>;
}
