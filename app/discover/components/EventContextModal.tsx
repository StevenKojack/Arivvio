"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { planningPreferenceCatalog, type PlanningPreference } from "@/lib/planning-taxonomy";

const contextOptions = planningPreferenceCatalog.filter((preference) => ["culture", "cuisine"].includes(preference.type));

export function EventContextModal({
  onClose,
  onSave,
  selectedIds,
}: {
  onClose: () => void;
  onSave: (preferences: PlanningPreference[]) => void;
  selectedIds: string[];
}) {
  const [draftIds, setDraftIds] = useState(() => new Set(selectedIds));
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const dialogRef = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => [
    { id: "culture", label: "Culture", support: "Traditions or cultural context you want represented thoughtfully." },
    { id: "cuisine", label: "Cuisine", support: "Food traditions that should shape matching and recommendations." },
  ].map((group) => ({
    ...group,
    options: contextOptions.filter((option) => option.type === group.id).filter((option) => deferredQuery.length < 2 || [option.label, ...option.aliases].some((value) => value.toLowerCase().includes(deferredQuery))),
  })), [deferredQuery]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("button, input")?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled])"));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [onClose]);

  function toggle(id: string) {
    setDraftIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-[#0D1321]/38 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="event-context-title" className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[26px] bg-white shadow-[0_28px_80px_rgba(13,19,33,0.24)] sm:max-w-3xl sm:rounded-[26px]">
        <header className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 sm:px-6 sm:py-5">
          <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#B88A1D]">Event context</p><h3 id="event-context-title" className="mt-1 text-xl font-semibold text-[#0D1321] sm:text-2xl">What should feel familiar?</h3><p className="mt-1 text-sm leading-6 text-neutral-600">Optional context helps connect food, music, traditions, and vendor experience without limiting your choices.</p></div>
          <button type="button" onClick={onClose} aria-label="Close culture and cuisine details" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-xl text-neutral-600 outline-none hover:border-[#0D1321] focus-visible:ring-2 focus-visible:ring-[#0D1321]">&times;</button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          <label className="block text-sm font-semibold text-[#0D1321]">Search culture or cuisine
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try Armenian, Italian, Filipino..." className="mt-2 h-12 w-full rounded-2xl border border-neutral-300 px-4 text-sm outline-none focus:border-[#D4AF37]" />
          </label>
          <div className="mt-6 space-y-7">{groups.map((group) => (
            <fieldset key={group.id}><legend className="text-sm font-semibold text-[#0D1321]">{group.label}</legend><p className="mt-1 text-xs leading-5 text-neutral-500">{group.support}</p><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{group.options.map((option) => {
              const selected = draftIds.has(option.id);
              return <button key={option.id} type="button" aria-pressed={selected} onClick={() => toggle(option.id)} className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[#0D1321] ${selected ? "border-[#2E7D5B] bg-[#EFF8F3] text-[#285E49]" : "border-neutral-200 bg-white text-neutral-700 hover:border-[#D4AF37]"}`}>{selected ? <span aria-hidden="true">\u2713 </span> : null}{option.label}</button>;
            })}</div></fieldset>
          ))}</div>
        </div>
        <footer className="flex items-center justify-between gap-4 border-t border-neutral-200 bg-[#FFFCF7] px-5 py-4 sm:px-6"><p className="text-sm font-semibold text-neutral-600">{draftIds.size} selected</p><button type="button" onClick={() => { onSave(contextOptions.filter((option) => draftIds.has(option.id))); onClose(); }} className="h-11 rounded-full bg-[#0D1321] px-6 text-sm font-semibold text-white outline-none transition hover:-translate-y-0.5 hover:bg-[#16233B] focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2">Save context</button></footer>
      </div>
    </div>,
    document.body,
  );
}
