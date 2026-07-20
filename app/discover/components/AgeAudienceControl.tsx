"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { AudienceProfile, AudienceType } from "@/lib/event-intelligence/types";

const options: Array<{ id: AudienceType; label: string }> = [
  { id: "all-ages", label: "All ages" },
  { id: "adults", label: "Adults only" },
  { id: "kids", label: "Kids only" },
  { id: "teens", label: "Teens" },
  { id: "families", label: "Families" },
  { id: "seniors", label: "Seniors" },
  { id: "custom", label: "Custom range" },
];

export function AgeAudienceControl({
  onChange,
  value,
}: {
  onChange: (value: AudienceProfile) => void;
  value: AudienceProfile;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!isOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setIsOpen(true);
        }}
        className="flex min-h-12 w-full items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-[#D4AF37]"
      >
        <span>
          <span className="block text-sm font-semibold text-[#0D1321]">Age and audience</span>
          <span className="mt-1 block text-xs text-neutral-500">{summarizeAudience(value)}</span>
        </span>
        <span className="text-sm font-semibold text-[#B88A1D]">Edit</span>
      </button>
      {isOpen && typeof document !== "undefined" ? createPortal(
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-[#0D1321]/34 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsOpen(false);
        }}>
          <div role="dialog" aria-modal="true" aria-labelledby="audience-title" className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-[0_30px_100px_rgba(13,19,33,0.28)] sm:max-w-xl sm:rounded-[28px] sm:p-6">
            <div className="flex items-start justify-between gap-5">
              <div>
                <h3 id="audience-title" className="text-xl font-semibold text-[#0D1321]">Who is this for?</h3>
                <p className="mt-1 text-sm leading-6 text-neutral-600">The person being celebrated and the guest audience are separate details.</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-full border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-600 hover:border-[#0D1321]">Close</button>
            </div>

            <label className="mt-6 block text-sm font-semibold text-[#0D1321]">
              Honoree age <span className="font-normal text-neutral-500">(optional)</span>
              <input
                type="number"
                min="0"
                max="120"
                value={draft.honoreeAge ?? ""}
                onChange={(event) => setDraft((current) => ({ ...current, honoreeAge: event.target.value ? Number(event.target.value) : undefined }))}
                placeholder="For example, 15"
                className="mt-2 h-12 w-full rounded-2xl border border-neutral-300 px-4 text-sm font-semibold outline-none focus:border-[#D4AF37]"
              />
            </label>

            <fieldset className="mt-6">
              <legend className="text-sm font-semibold text-[#0D1321]">Guest audience</legend>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, audienceType: option.id }))}
                    className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition ${draft.audienceType === option.id ? "border-[#0D1321] bg-[#0D1321] text-white" : "border-neutral-200 bg-white text-neutral-700 hover:border-[#D4AF37]"}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            {draft.audienceType === "custom" ? (
              <div className="mt-6 rounded-2xl bg-[#F7F4EC] p-4">
                <div className="flex items-center justify-between gap-4 text-sm font-semibold text-[#0D1321]">
                  <span>Guest age range</span>
                  <span>Ages {draft.guestAgeMin ?? 0} to {draft.guestAgeMax ?? 100}</span>
                </div>
                <label className="mt-4 block text-xs font-semibold text-neutral-600">Youngest age
                  <input type="range" min="0" max="100" value={draft.guestAgeMin ?? 0} onChange={(event) => setDraft((current) => ({ ...current, guestAgeMin: Number(event.target.value), guestAgeMax: Math.max(current.guestAgeMax ?? 100, Number(event.target.value)) }))} className="mt-2 w-full accent-[#D4AF37]" />
                </label>
                <label className="mt-4 block text-xs font-semibold text-neutral-600">Oldest age
                  <input type="range" min="0" max="100" value={draft.guestAgeMax ?? 100} onChange={(event) => setDraft((current) => ({ ...current, guestAgeMax: Number(event.target.value), guestAgeMin: Math.min(current.guestAgeMin ?? 0, Number(event.target.value)) }))} className="mt-2 w-full accent-[#D4AF37]" />
                </label>
              </div>
            ) : null}

            <button type="button" onClick={() => { onChange(draft); setIsOpen(false); }} className="mt-6 h-12 w-full rounded-full bg-[#0D1321] px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#16233B]">
              Save audience details
            </button>
          </div>
        </div>, document.body) : null}
    </>
  );
}

function summarizeAudience(value: AudienceProfile) {
  const audience = options.find((option) => option.id === value.audienceType)?.label;
  const parts = [value.honoreeAge !== undefined ? `Honoree age ${value.honoreeAge}` : "", audience ?? "Not specified"];
  if (value.audienceType === "custom") parts.push(`ages ${value.guestAgeMin ?? 0}-${value.guestAgeMax ?? 100}`);
  return parts.filter(Boolean).join(" / ");
}
