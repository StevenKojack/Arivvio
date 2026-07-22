"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createPlanDetailTag, getPlanSelectionDisplayLabel, getServiceDetailGroups, type PlanDetailTag, type PlanSelection } from "@/lib/planning-taxonomy";

export function ServiceDetailsModal({
  item,
  onClose,
  onSave,
}: {
  item: PlanSelection;
  onClose: () => void;
  onSave: (details: PlanDetailTag[]) => void;
}) {
  const [details, setDetails] = useState(item.details);
  const dialogRef = useRef<HTMLDivElement>(null);
  const groups = getServiceDetailGroups(item.linkedService);
  const displayLabel = getPlanSelectionDisplayLabel(item);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("button")?.focus();
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

  function toggle(group: (typeof groups)[number], label: string, matchingServices?: PlanDetailTag["matchingServices"]) {
    const id = detailId(group.label, label);
    const selected = details.some((detail) => detail.id === id);
    if (selected) {
      setDetails((current) => current.filter((detail) => detail.id !== id));
      return;
    }
    const option = group.options.find((item) => item.label === label);
    const next = createPlanDetailTag(group.label, label, matchingServices, option?.preferenceId, option?.type);
    setDetails((current) => [
      ...(group.singleSelect ? current.filter((detail) => detail.group !== group.label) : current),
      next,
    ]);
  }

  return createPortal(
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-[#0D1321]/38 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="service-detail-title" className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[26px] bg-white shadow-[0_28px_80px_rgba(13,19,33,0.24)] sm:max-w-3xl sm:rounded-[26px]">
        <header className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 sm:px-6 sm:py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#B88A1D]">{item.category}</p>
            <h3 id="service-detail-title" className="mt-1 text-xl font-semibold text-[#0D1321] sm:text-2xl">Shape your {displayLabel} match</h3>
            <p className="mt-1 text-sm leading-6 text-neutral-600">Add only the details that matter. You will still have one {item.label} service in your plan.</p>
          </div>
          <button type="button" onClick={onClose} aria-label={`Close ${displayLabel} details`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-xl text-neutral-600 outline-none hover:border-[#0D1321] focus-visible:ring-2 focus-visible:ring-[#0D1321]">&times;</button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          {groups.length ? <div className="space-y-7">{groups.map((group) => (
            <fieldset key={group.id}>
              <legend className="text-sm font-semibold text-[#0D1321]">{group.label}</legend>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {group.options.map((option) => {
                  const selected = details.some((detail) => detail.id === detailId(group.label, option.label));
                  return <button key={option.label} type="button" aria-pressed={selected} onClick={() => toggle(group, option.label, option.matchingServices)} className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[#0D1321] ${selected ? "border-[#2E7D5B] bg-[#EFF8F3] text-[#285E49]" : "border-neutral-200 bg-white text-neutral-700 hover:border-[#D4AF37]"}`}>{selected ? <span aria-hidden="true">✓ </span> : null}{option.label}</button>;
                })}
              </div>
            </fieldset>
          ))}</div> : <div className="rounded-2xl border border-dashed border-neutral-300 bg-[#FAFAF9] px-5 py-10 text-center"><p className="text-sm font-semibold text-[#0D1321]">No extra details needed yet.</p><p className="mt-1 text-sm text-neutral-500">Arivvio already has enough context to begin matching this service.</p></div>}
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-neutral-200 bg-[#FFFCF7] px-5 py-4 sm:px-6">
          <p aria-live="polite" className="text-sm font-semibold text-neutral-600">{details.length} detail{details.length === 1 ? "" : "s"} added</p>
          <button type="button" onClick={() => { onSave(details); onClose(); }} className="h-11 rounded-full bg-[#0D1321] px-6 text-sm font-semibold text-white outline-none transition hover:-translate-y-0.5 hover:bg-[#16233B] focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2">Save details</button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function detailId(group: string, label: string) {
  return `${normalize(group)}:${normalize(label)}`;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
