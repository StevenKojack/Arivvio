"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ServiceName } from "@/app/data/marketplace";
import { createServiceSelection, primaryServiceNames } from "@/lib/planning-taxonomy";

const categories = [
  ["Venues", "Places and event settings"],
  ["Food and Catering", "Meals, beverage service, and hospitality"],
  ["Music and DJs", "DJs, bands, and live music"],
  ["Photography and Video", "Photo, video, booths, and coverage"],
  ["Rentals", "Furniture, tents, lighting, and equipment"],
  ["Entertainment and Activities", "Performers and guest experiences"],
  ["Decor and Florals", "Flowers, balloons, and visual design"],
  ["Transportation", "Vehicles, shuttles, valet, and guest movement"],
  ["Desserts", "Cakes and dessert experiences"],
  ["Staffing and Logistics", "Event teams, security, cleaning, and operations"],
  ["Production and Equipment", "Sound, video, staging, and technical support"],
  ["Guest Services", "Invitations, registration, and printed details"],
] as const;

export function TagDirectoryModal({
  onClose,
  onRemove,
  onSelect,
  selectedIds,
}: {
  onClose: () => void;
  onRemove: (service: ServiceName) => void;
  onSelect: (service: ServiceName) => void;
  selectedIds: string[];
}) {
  const [activeCategory, setActiveCategory] = useState<string>();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeModal = useCallback(() => { setActiveCategory(undefined); setQuery(""); onClose(); }, [onClose]);
  const options = useMemo(() => {
    if (!activeCategory) return [];
    const normalized = deferredQuery.trim().toLowerCase();
    return primaryServiceNames
      .map((service) => createServiceSelection(service, "browse-all"))
      .filter((item) => item.category === activeCategory)
      .filter((item) => normalized.length < 2 || [item.label, item.description].some((value) => value.toLowerCase().includes(normalized)));
  }, [activeCategory, deferredQuery]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("button, input")?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") closeModal();
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled])"));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [closeModal]);

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-[#0D1321]/38 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="directory-title" className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[26px] bg-white shadow-[0_28px_80px_rgba(13,19,33,0.24)] sm:max-w-4xl sm:rounded-[26px]">
        <header className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 sm:px-6 sm:py-5">
          <div>
            {activeCategory ? <button type="button" onClick={() => { setActiveCategory(undefined); setQuery(""); }} className="mb-2 text-sm font-semibold text-[#B88A1D] outline-none focus-visible:ring-2 focus-visible:ring-[#0D1321]">&larr; All categories</button> : null}
            <h3 id="directory-title" className="text-xl font-semibold text-[#0D1321] sm:text-2xl">{activeCategory ?? "Browse all services"}</h3>
            <p className="mt-1 text-sm leading-6 text-neutral-600">{activeCategory ? "Choose the primary service first. You can shape its specialties after adding it." : "Start with the service you need. Arivvio keeps its subcategories quietly attached as details."}</p>
          </div>
          <button type="button" onClick={closeModal} aria-label="Close Browse All" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-xl text-neutral-600 outline-none hover:border-[#0D1321] focus-visible:ring-2 focus-visible:ring-[#0D1321]">&times;</button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          {!activeCategory ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{categories.map(([name, description]) => (
            <button key={name} type="button" onClick={() => setActiveCategory(name)} className="group flex min-h-24 items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-4 text-left outline-none transition hover:-translate-y-0.5 hover:border-[#D4AF37] hover:bg-[#FFFCF7] focus-visible:ring-2 focus-visible:ring-[#0D1321]">
              <span><span className="block text-sm font-semibold text-[#0D1321]">{name}</span><span className="mt-1 block text-xs leading-5 text-neutral-500">{description}</span></span><span aria-hidden="true" className="text-lg text-[#B88A1D]">&rarr;</span>
            </button>
          ))}</div> : <>
            <label className="block text-sm font-semibold text-[#0D1321]">Search within {activeCategory}
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${activeCategory.toLowerCase()}...`} className="mt-2 h-12 w-full rounded-2xl border border-neutral-300 px-4 text-sm outline-none focus:border-[#D4AF37]" />
            </label>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{options.map((item) => {
              const selected = selectedIds.includes(item.id);
              return <button key={item.id} type="button" aria-pressed={selected} aria-label={selected ? `Remove ${item.label}` : `Add ${item.label}`} onClick={() => selected ? onRemove(item.linkedService!) : onSelect(item.linkedService!)} className={`flex min-h-20 items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-left outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#0D1321] ${selected ? "border-[#2E7D5B] bg-[#EFF8F3]" : "border-neutral-200 bg-white hover:border-[#D4AF37]"}`}><span><span className="block text-sm font-semibold text-[#0D1321]">{item.label}</span><span className="mt-1 block text-xs leading-5 text-neutral-500">{item.description}</span></span><span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${selected ? "bg-[#2E7D5B]" : "bg-[#0D1321]"}`}>{selected ? "✓" : "+"}</span></button>;
            })}</div>
            {!options.length ? <p className="py-12 text-center text-sm text-neutral-500">No primary services match this search.</p> : null}
          </>}
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-neutral-200 bg-[#FFFCF7] px-5 py-4 sm:px-6"><p className="text-sm font-semibold text-neutral-600">{selectedIds.length} selected</p><button type="button" onClick={closeModal} className="h-11 rounded-full bg-[#0D1321] px-6 text-sm font-semibold text-white outline-none hover:bg-[#16233B] focus-visible:ring-2 focus-visible:ring-[#D4AF37]">Done</button></footer>
      </div>
    </div>,
    document.body,
  );
}
