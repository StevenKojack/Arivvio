"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  discoveryCategories,
  getDiscoveryGroups,
  type DiscoveryOption,
  type PlanSelection,
} from "@/lib/planning-taxonomy";

export function TagDirectoryModal({
  onClose,
  onRemove,
  onSelect,
  planItemCount,
  selections,
}: {
  onClose: () => void;
  onRemove: (selection: PlanSelection) => void;
  onSelect: (selection: PlanSelection) => void;
  planItemCount: number;
  selections: PlanSelection[];
}) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const dialogRef = useRef<HTMLDivElement>(null);
  const activeCategory = discoveryCategories.find((category) => category.id === activeCategoryId);
  const closeModal = useCallback(() => { setActiveCategoryId(undefined); setQuery(""); onClose(); }, [onClose]);
  const groups = useMemo(() => {
    if (!activeCategoryId) return [];
    return getDiscoveryGroups(activeCategoryId)
      .map((group) => ({
        ...group,
        options: group.options.filter((option) => deferredQuery.length < 2 || [option.label, option.description, option.group].some((value) => value.toLowerCase().includes(deferredQuery))),
      }))
      .filter((group) => group.options.length);
  }, [activeCategoryId, deferredQuery]);

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

  function isSelected(option: DiscoveryOption) {
    const existing = selections.find((selection) => selection.id === option.selection.id);
    if (!existing) return false;
    if (option.selection.preferenceIds.length) return option.selection.preferenceIds.every((id) => existing.preferenceIds.includes(id));
    return option.selection.primaryExplicit && existing.primaryExplicit;
  }

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-[#0D1321]/38 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="directory-title" className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[26px] bg-white shadow-[0_28px_80px_rgba(13,19,33,0.24)] sm:max-w-5xl sm:rounded-[26px]">
        <header className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 sm:px-6 sm:py-5">
          <div>
            {activeCategory ? <button type="button" onClick={() => { setActiveCategoryId(undefined); setQuery(""); }} className="mb-2 text-sm font-semibold text-[#B88A1D] outline-none focus-visible:ring-2 focus-visible:ring-[#0D1321]">&larr; All categories</button> : null}
            <h3 id="directory-title" className="text-xl font-semibold text-[#0D1321] sm:text-2xl">{activeCategory?.label ?? "Browse everything Arivvio can help with"}</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-600">{activeCategory?.description ?? "Explore by category when you want ideas. Every choice uses the same intelligence as search and suggestions."}</p>
          </div>
          <button type="button" onClick={closeModal} aria-label="Close Browse All" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-xl text-neutral-600 outline-none hover:border-[#0D1321] focus-visible:ring-2 focus-visible:ring-[#0D1321]">&times;</button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          {!activeCategory ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{discoveryCategories.map((category) => (
              <button key={category.id} type="button" onClick={() => setActiveCategoryId(category.id)} className="group flex min-h-24 items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-4 text-left outline-none transition hover:-translate-y-0.5 hover:border-[#D4AF37] hover:bg-[#FFFCF7] focus-visible:ring-2 focus-visible:ring-[#0D1321]">
                <span><span className="block text-sm font-semibold text-[#0D1321]">{category.label}</span><span className="mt-1 block text-xs leading-5 text-neutral-500">{category.description}</span></span><span aria-hidden="true" className="text-lg text-[#B88A1D]">&rarr;</span>
              </button>
            ))}</div>
          ) : <>
            <label className="block text-sm font-semibold text-[#0D1321]">Search within {activeCategory.label}
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${activeCategory.label.toLowerCase()}...`} className="mt-2 h-12 w-full rounded-2xl border border-neutral-300 px-4 text-sm outline-none focus:border-[#D4AF37]" />
            </label>
            <div className="mt-6 space-y-7">{groups.map((group) => (
              <section key={group.id} aria-labelledby={`browse-group-${group.id}`}>
                <div className="flex items-center gap-3"><h4 id={`browse-group-${group.id}`} className="text-sm font-semibold text-[#0D1321]">{group.label}</h4><span className="text-xs text-neutral-400">{group.options.length}</span></div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{group.options.map((option) => {
                  const selected = isSelected(option);
                  return <button key={option.id} type="button" aria-pressed={selected} aria-label={selected ? `Remove ${option.label}` : `Add ${option.label}`} onClick={() => selected ? onRemove(option.selection) : onSelect(option.selection)} className={`flex min-h-[74px] items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-left outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#0D1321] ${selected ? "border-[#2E7D5B] bg-[#EFF8F3]" : "border-neutral-200 bg-white hover:border-[#D4AF37]"}`}><span><span className="block text-sm font-semibold text-[#0D1321]">{option.label}</span><span className="mt-1 line-clamp-2 text-xs leading-5 text-neutral-500">{option.description}</span></span><span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${selected ? "bg-[#2E7D5B]" : "bg-[#0D1321]"}`}>{selected ? "\u2713" : "+"}</span></button>;
                })}</div>
              </section>
            ))}</div>
            {!groups.length ? <p className="py-12 text-center text-sm text-neutral-500">No matches in this category yet.</p> : null}
          </>}
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-neutral-200 bg-[#FFFCF7] px-5 py-4 sm:px-6"><p className="text-sm font-semibold text-neutral-600">{planItemCount} plan item{planItemCount === 1 ? "" : "s"}</p><button type="button" onClick={closeModal} className="h-11 rounded-full bg-[#0D1321] px-6 text-sm font-semibold text-white outline-none hover:bg-[#16233B] focus-visible:ring-2 focus-visible:ring-[#D4AF37]">Done</button></footer>
      </div>
    </div>,
    document.body,
  );
}
