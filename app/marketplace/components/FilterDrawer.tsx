"use client";

import { useEffect, useRef } from "react";
import type { EventType, ServiceName } from "@/app/data/marketplace";

type FilterDrawerProps = {
  eventTypes: EventType[];
  isOpen: boolean;
  query: string;
  excludedServices: ServiceName[];
  selectedEvent: EventType | "All";
  selectedServices: ServiceName[];
  serviceOptions: ServiceName[];
  onClose: () => void;
  onEventChange: (eventType: EventType | "All") => void;
  onQueryChange: (value: string) => void;
  onToggleExcludedService: (service: ServiceName) => void;
  onToggleService: (service: ServiceName) => void;
};

export function FilterDrawer({
  eventTypes,
  isOpen,
  onClose,
  onEventChange,
  onQueryChange,
  onToggleExcludedService,
  onToggleService,
  query,
  excludedServices,
  selectedEvent,
  selectedServices,
  serviceOptions,
}: FilterDrawerProps) {
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{if(isOpen) dialog.current?.showModal(); else dialog.current?.close();},[isOpen]);
  if (!isOpen) {
    return null;
  }

  return (
    <dialog ref={dialog} onCancel={onClose} aria-label="Marketplace filters" className="ui-surface fixed inset-0 m-auto max-h-[90dvh] w-[min(680px,96vw)] overflow-y-auto rounded-3xl p-0 backdrop:bg-black/40">
      <div className="w-full max-w-2xl rounded-[28px] border border-[#D4AF37]/16 ui-surface p-5 shadow-[0_34px_120px_rgba(13,19,33,0.22)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] ui-muted">
              Event details
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              Adjust what Arivvio should match
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-full border border-[#D4AF37]/20 px-4 text-sm font-semibold transition hover:border-[#D4AF37]/60"
          >
            Done
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search vendors, cities, or needs"
            className="h-12 rounded-2xl border border-[#D4AF37]/20 px-4 text-sm font-semibold outline-none transition focus:border-[#D4AF37]"
          />
          <div>
            <p className="text-sm font-semibold ui-text">Event type</p>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {(["All", ...eventTypes] as Array<EventType | "All">).map((eventType) => (
                <button
                  key={eventType}
                  type="button"
                  onClick={() => onEventChange(eventType)}
                  className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition ${
                    selectedEvent === eventType
                      ? "ui-primary"
                      : "border border-[#D4AF37]/18 ui-surface ui-muted hover:-translate-y-0.5 hover:border-[#D4AF37]/60"
                  }`}
                >
                  {eventType}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold ui-text">Include services</p>
            <div className="mt-3 flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1">
              {serviceOptions.map((service) => (
                <button
                  key={service}
                  type="button"
                  onClick={() => onToggleService(service)}
                  className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                    selectedServices.includes(service)
                      ? "ui-primary"
                      : "border border-[#D4AF37]/18 ui-surface ui-muted hover:-translate-y-0.5 hover:border-[#D4AF37]/60"
                  }`}
                >
                  {service}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-3xl ui-soft p-4 ring-1 ring-[#D4AF37]/10">
            <p className="text-sm font-semibold ui-text">Hide services</p>
            <p className="mt-1 text-xs leading-5 ui-muted">
              Use this only when a category is clearly not needed.
            </p>
            <div className="mt-3 flex max-h-36 flex-wrap gap-2 overflow-y-auto pr-1">
              {serviceOptions.map((service) => (
                <button
                  key={service}
                  type="button"
                  onClick={() => onToggleExcludedService(service)}
                  className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                    excludedServices.includes(service)
                      ? "ui-surface ui-text ring-2 ring-[#D4AF37]"
                      : "border border-[#D4AF37]/18 ui-surface ui-muted hover:-translate-y-0.5 hover:border-[#D4AF37]/60"
                  }`}
                >
                  {service}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
