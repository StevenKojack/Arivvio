"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AudienceGender, AudienceProfile, AudienceType, EventRecognition, GenderContext } from "@/lib/event-intelligence/types";
import { getFeaturedPersonPolicy } from "@/lib/event-intelligence/featured-person";

const ageOptions: Array<{ label: string; value: AudienceType }> = [
  { label: "All Ages", value: "all-ages" },
  { label: "Kids", value: "kids" },
  { label: "Teens", value: "teens" },
  { label: "Adults", value: "adults" },
  { label: "Seniors", value: "seniors" },
  { label: "Custom Age Range", value: "custom" },
];

const audienceGenderOptions: Array<{ label: string; value: AudienceGender }> = [
  { label: "All Genders", value: "all-genders" },
  { label: "Mostly Male", value: "mostly-male" },
  { label: "Mostly Female", value: "mostly-female" },
  { label: "Mixed", value: "mixed" },
];

const honoreeGenderOptions: Array<{ label: string; value: GenderContext }> = [
  { label: "Female", value: "female" },
  { label: "Male", value: "male" },
  { label: "Nonbinary", value: "nonbinary" },
  { label: "Prefer to self-describe", value: "self-described" },
  { label: "Prefer not to say", value: "prefer-not-to-say" },
];

export function InviteesModal({
  onClose,
  onSave,
  recognition,
  value,
}: {
  onClose: () => void;
  onSave: (value: AudienceProfile) => void;
  recognition: EventRecognition;
  value: AudienceProfile;
}) {
  const [draft, setDraft] = useState(value);
  const dialogRef = useRef<HTMLDivElement>(null);
  const featuredPerson = getFeaturedPersonPolicy(recognition);

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

  return createPortal(
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-[#0D1321]/38 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="invitees-title" className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[26px] bg-white shadow-[0_28px_80px_rgba(13,19,33,0.24)] sm:max-w-3xl sm:rounded-[26px]">
        <header className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 sm:px-6 sm:py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#B88A1D]">Invitees</p>
            <h3 id="invitees-title" className="mt-1 text-xl font-semibold text-[#0D1321] sm:text-2xl">Who should this plan work for?</h3>
            <p className="mt-1 text-sm leading-6 text-neutral-600">A little context helps Arivvio rank the right experiences without narrowing your choices.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close invitee details" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-xl text-neutral-600 outline-none hover:border-[#0D1321] focus-visible:ring-2 focus-visible:ring-[#0D1321]">&times;</button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          <section>
            <h4 className="text-base font-semibold text-[#0D1321]">General audience age</h4>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ageOptions.map((option) => <ChoiceButton key={option.value} label={option.label} selected={draft.audienceType === option.value} onClick={() => setDraft((current) => ({ ...current, audienceType: option.value }))} />)}
            </div>
            {draft.audienceType === "custom" ? (
              <div className="mt-4 rounded-2xl bg-[#F7F4EC] p-4">
                <div className="flex items-center justify-between gap-4 text-sm font-semibold text-[#0D1321]"><span>Guest age range</span><span>Ages {draft.guestAgeMin ?? 0} to {draft.guestAgeMax ?? 100}</span></div>
                <label className="mt-4 block text-xs font-semibold text-neutral-600">Youngest age
                  <input type="range" min="0" max="100" value={draft.guestAgeMin ?? 0} onChange={(event) => setDraft((current) => ({ ...current, guestAgeMin: Number(event.target.value), guestAgeMax: Math.max(current.guestAgeMax ?? 100, Number(event.target.value)) }))} className="mt-2 w-full accent-[#D4AF37]" />
                </label>
                <label className="mt-4 block text-xs font-semibold text-neutral-600">Oldest age
                  <input type="range" min="0" max="100" value={draft.guestAgeMax ?? 100} onChange={(event) => setDraft((current) => ({ ...current, guestAgeMax: Number(event.target.value), guestAgeMin: Math.min(current.guestAgeMin ?? 0, Number(event.target.value)) }))} className="mt-2 w-full accent-[#D4AF37]" />
                </label>
              </div>
            ) : null}
          </section>

          <section className="mt-7 border-t border-neutral-200 pt-6">
            <h4 className="text-base font-semibold text-[#0D1321]">Audience gender</h4>
            <p className="mt-1 text-sm leading-6 text-neutral-600">Optional context for matching. It never removes services.</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {audienceGenderOptions.map((option) => <ChoiceButton key={option.value} label={option.label} selected={draft.audienceGender === option.value} onClick={() => setDraft((current) => ({ ...current, audienceGender: option.value }))} />)}
            </div>
          </section>

          {featuredPerson ? (
            <section className="mt-7 border-t border-neutral-200 pt-6">
              <h4 className="text-base font-semibold text-[#0D1321]">{featuredPerson.question}</h4>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <ChoiceButton label="Me" selected={draft.celebrating === "self"} onClick={() => setDraft((current) => ({ ...current, celebrating: "self" }))} />
                <ChoiceButton label="Someone Else" selected={draft.celebrating === "someone-else"} onClick={() => setDraft((current) => ({ ...current, celebrating: "someone-else" }))} />
              </div>

              {draft.celebrating === "someone-else" && featuredPerson.allowSurprise ? (
                <div className="mt-5">
                  <p className="text-sm font-semibold text-[#0D1321]">Is it a surprise? <span className="font-normal text-neutral-500">(optional)</span></p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <ChoiceButton label="Yes" selected={draft.isSurprise === true} onClick={() => setDraft((current) => ({ ...current, isSurprise: true }))} />
                    <ChoiceButton label="No" selected={draft.isSurprise === false} onClick={() => setDraft((current) => ({ ...current, isSurprise: false }))} />
                  </div>
                </div>
              ) : null}

              {featuredPerson.dueDateQuestion ? (
                <label className="mt-5 block text-sm font-semibold text-[#0D1321]">{featuredPerson.dueDateQuestion}
                  <input type="date" value={draft.honoreeDueDate ?? ""} onChange={(event) => setDraft((current) => ({ ...current, honoreeDueDate: event.target.value }))} className="mt-2 h-12 w-full rounded-xl border border-neutral-300 px-4 text-sm outline-none focus:border-[#D4AF37]" />
                </label>
              ) : featuredPerson.ageQuestion ? (
                <label className="mt-5 block text-sm font-semibold text-[#0D1321]">{featuredPerson.ageQuestion}
                  <input type="number" min="0" max="120" value={draft.honoreeAge ?? ""} onChange={(event) => setDraft((current) => ({ ...current, honoreeAge: event.target.value ? Number(event.target.value) : undefined }))} placeholder="Optional" className="mt-2 h-12 w-full rounded-xl border border-neutral-300 px-4 text-sm outline-none focus:border-[#D4AF37]" />
                </label>
              ) : null}

              {featuredPerson.askGender ? (
                <div className="mt-5">
                  <p className="text-sm font-semibold text-[#0D1321]">About the person we&apos;re celebrating <span className="font-normal text-neutral-500">(optional)</span></p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {honoreeGenderOptions.map((option) => <ChoiceButton key={option.value} label={option.label} selected={normalizeGender(draft.honoreeGender ?? draft.genderContext) === option.value} onClick={() => setDraft((current) => ({ ...current, genderContext: undefined, honoreeGender: option.value }))} />)}
                  </div>
                  {draft.honoreeGender === "self-described" ? (
                    <label className="mt-4 block text-sm font-semibold text-[#0D1321]">How would they describe themselves?
                      <input value={draft.genderDescription ?? ""} onChange={(event) => setDraft((current) => ({ ...current, genderDescription: event.target.value }))} placeholder="Optional" className="mt-2 h-12 w-full rounded-xl border border-neutral-300 px-4 text-sm outline-none focus:border-[#D4AF37]" />
                    </label>
                  ) : null}
                </div>
              ) : null}

              {draft.honoreeAge !== undefined && draft.honoreeAge < 18 ? <p className="mt-5 rounded-2xl bg-[#FFF8E1] px-4 py-3 text-xs leading-5 text-neutral-600">Any bookings or purchases should be reviewed and approved by a legal adult.</p> : null}
            </section>
          ) : null}
        </div>

        <footer className="flex justify-end border-t border-neutral-200 bg-[#FFFCF7] px-5 py-4 sm:px-6">
          <button type="button" onClick={() => { onSave(draft); onClose(); }} className="h-11 rounded-full bg-[#0D1321] px-6 text-sm font-semibold text-white outline-none transition hover:-translate-y-0.5 hover:bg-[#16233B] focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2">Save invitee details</button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function ChoiceButton({ label, onClick, selected }: { label: string; onClick: () => void; selected: boolean }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[#0D1321] ${selected ? "border-[#2E7D5B] bg-[#EFF8F3] text-[#285E49]" : "border-neutral-200 bg-white text-neutral-700 hover:border-[#D4AF37]"}`}>{selected ? <span aria-hidden="true">✓ </span> : null}{label}</button>;
}

function normalizeGender(value?: GenderContext): GenderContext | undefined {
  if (value === "girl") return "female";
  if (value === "boy") return "male";
  return value;
}
