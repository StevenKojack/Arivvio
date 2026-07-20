"use client";

import { useMemo, useState } from "react";
import type { ServiceName } from "@/app/data/marketplace";
import { getEventMessage } from "@/lib/event-intelligence/messaging";
import {
  formatServiceSummary,
  getEssentialServices,
  getServiceSuggestions,
} from "@/lib/event-intelligence/service-plan";
import { getStageConfiguration } from "@/lib/event-intelligence/stages";
import type {
  AudienceProfile,
  EventRecognition,
  EventStage,
} from "@/lib/event-intelligence/types";
import { searchEventIntents } from "@/lib/event-intelligence/search";
import type {
  PlanningPreference,
  SelectedPlanningPreference,
} from "@/lib/planning-taxonomy";
import { AgeAudienceControl } from "./AgeAudienceControl";
import { PlanningSearch } from "./PlanningSearch";
import { ServiceRecommendationCard } from "./ServiceRecommendationCard";
import { StageSelector } from "./StageSelector";

export function StepTwoConfirmation({
  audience,
  onAudienceChange,
  onChangeEvent,
  onPreferenceAdd,
  onPreferenceRemove,
  onStagesChange,
  onToggleService,
  preferences,
  recognition,
  selectedServices,
  stages,
}: {
  audience: AudienceProfile;
  onAudienceChange: (value: AudienceProfile) => void;
  onChangeEvent: (value: string) => void;
  onPreferenceAdd: (preference: PlanningPreference) => void;
  onPreferenceRemove: (preference: SelectedPlanningPreference) => void;
  onStagesChange: (value: EventStage[]) => void;
  onToggleService: (service: ServiceName) => void;
  preferences: SelectedPlanningPreference[];
  recognition: EventRecognition;
  selectedServices: ServiceName[];
  stages: EventStage[];
}) {
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [eventQuery, setEventQuery] = useState(recognition.identity.selectedDisplayEvent);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const eventSuggestions = useMemo(() => searchEventIntents(eventQuery, 5), [eventQuery]);
  const message = getEventMessage(recognition, audience.honoreeAge);
  const stageConfiguration = getStageConfiguration(recognition);
  const essentials = getEssentialServices(recognition, stages);
  const recommendations = getServiceSuggestions(recognition, selectedServices, stages);
  const selectedOptionalServices = selectedServices.filter((service) => !essentials.includes(service));
  const specificServiceIds = new Set(preferences.filter((item) => item.linkedService).map((item) => item.linkedService));
  const summaryLabels = [
    ...selectedServices.filter((service) => !specificServiceIds.has(service)),
    ...preferences.filter((item) => item.linkedService).map((item) => item.label),
  ];
  const advancedPreferences = preferences.filter((item) => !item.linkedService || ["culture", "food", "audience", "accessibility", "setting", "atmosphere", "tradition"].includes(item.type));
  const specificityCount = preferences.filter((item) => item.type === "culture" || item.type === "food").length;

  function addPreference(preference: PlanningPreference) {
    onPreferenceAdd(preference);
    if (["culture", "food", "audience", "accessibility", "setting", "atmosphere", "tradition"].includes(preference.type)) {
      setAdvancedOpen(true);
    }
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[26px] border border-[#D4AF37]/24 bg-[linear-gradient(135deg,#FFFCF7_0%,#ffffff_68%)] p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B88A1D]">Your event</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#0D1321] sm:text-3xl">{recognition.identity.selectedDisplayEvent}</h2>
            <p className="mt-3 max-w-2xl text-lg font-semibold leading-7 text-[#0D1321]">{message.heading}</p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-600">{message.support}</p>
          </div>
          <button type="button" onClick={() => { setEventQuery(recognition.identity.selectedDisplayEvent); setIsEditingEvent((current) => !current); }} className="shrink-0 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:-translate-y-0.5 hover:border-[#D4AF37]">
            {isEditingEvent ? "Keep event" : "Change event type"}
          </button>
        </div>
        {isEditingEvent ? (
          <div className="mt-5 rounded-2xl border border-neutral-200 bg-white p-3">
            <label className="text-sm font-semibold text-[#0D1321]">Confirm event type
              <input value={eventQuery} onChange={(event) => setEventQuery(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-neutral-300 px-4 text-sm font-semibold outline-none focus:border-[#D4AF37]" />
            </label>
            <div className="mt-2 grid gap-1 sm:grid-cols-2">
              {eventSuggestions.map((suggestion) => (
                <button key={suggestion.label} type="button" onClick={() => { onChangeEvent(suggestion.label); setIsEditingEvent(false); }} className="rounded-xl px-3 py-2 text-left text-sm font-semibold text-neutral-700 transition hover:bg-[#F7F4EC]">
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {stageConfiguration ? (
        <StageSelector
          key={recognition.identity.canonicalEventType}
          configuration={stageConfiguration}
          value={stages}
          onChange={onStagesChange}
        />
      ) : null}

      <section className="rounded-[24px] border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
          <div>
            <h3 className="text-base font-semibold text-[#0D1321]">Start with the essentials</h3>
            <p className="mt-1 text-sm leading-6 text-neutral-600">A small starting point based on what you told us. You can change any of it.</p>
          </div>
          <span className="text-xs font-semibold text-neutral-400">{essentials.filter((service) => selectedServices.includes(service)).length} selected</span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {essentials.map((service) => (
            <ServiceRecommendationCard key={service} service={service} isSelected={selectedServices.includes(service)} onToggle={onToggleService} />
          ))}
        </div>
      </section>

      {recommendations.length || selectedOptionalServices.length ? (
        <section className="rounded-[24px] border border-neutral-200 bg-[#FFFCF7] p-4 sm:p-5">
          <h3 className="text-base font-semibold text-[#0D1321]">You may also want</h3>
          <p className="mt-1 text-sm leading-6 text-neutral-600">These are optional. Nothing is added unless you choose it.</p>
          {selectedOptionalServices.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedOptionalServices.map((service) => (
                <button key={service} type="button" onClick={() => onToggleService(service)} aria-label={`Remove ${service}`} className="rounded-full border border-[#D4AF37]/30 bg-white px-3 py-2 text-xs font-semibold text-[#0D1321] transition hover:-translate-y-0.5 hover:border-[#D4AF37]">
                  Selected: {service} <span aria-hidden="true">x</span>
                </button>
              ))}
            </div>
          ) : null}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {recommendations.map(({ reason, service }) => (
              <button key={service} type="button" onClick={() => onToggleService(service)} className="group flex min-h-[76px] items-start justify-between gap-4 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-[#D4AF37] hover:shadow-[0_12px_28px_rgba(13,19,33,0.06)]">
                <span>
                  <span className="block text-sm font-semibold text-[#0D1321]">{service}</span>
                  <span className="mt-1 block text-xs leading-5 text-neutral-500">{reason}</span>
                </span>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0D1321] text-sm font-semibold text-white transition group-hover:bg-[#B88A1D]">+</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-[24px] border border-[#D4AF37]/22 bg-white p-4 shadow-[0_16px_50px_rgba(13,19,33,0.05)] sm:p-5">
        <PlanningSearch selectedIds={preferences.map((item) => item.id)} onSelect={addPreference} />
        {preferences.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {preferences.map((preference) => (
              <button key={preference.id} type="button" onClick={() => onPreferenceRemove(preference)} aria-label={`Remove ${preference.label}`} className="rounded-full border border-[#D4AF37]/24 bg-[#F7F4EC] px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:-translate-y-0.5 hover:border-[#D4AF37]">
                {preference.label} <span aria-hidden="true">x</span>
              </button>
            ))}
          </div>
        ) : null}
        <p aria-live="polite" className="mt-4 rounded-2xl bg-[#0D1321] px-4 py-3 text-sm leading-6 text-white">
          {formatServiceSummary(summaryLabels)}
        </p>
      </section>

      <section className="rounded-[24px] border border-neutral-200 bg-white">
        <button type="button" aria-expanded={advancedOpen} onClick={() => setAdvancedOpen((current) => !current)} className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5">
          <span>
            <span className="block text-sm font-semibold text-[#0D1321]">Advanced details</span>
            <span className="mt-1 block text-xs text-neutral-500">Age, audience, culture, food, setting, access, and atmosphere.</span>
          </span>
          <span className="shrink-0 text-sm font-semibold text-[#B88A1D]">{advancedOpen ? "Hide" : "Edit"}</span>
        </button>
        {advancedOpen ? (
          <div className="grid gap-4 border-t border-neutral-200 p-4 sm:p-5 lg:grid-cols-2">
            <AgeAudienceControl value={audience} onChange={onAudienceChange} />
            <PlanningSearch compact label="Culture and traditions" support="Add one or more cultural contexts or traditions." types={["culture", "tradition"]} selectedIds={preferences.map((item) => item.id)} onSelect={addPreference} />
            <PlanningSearch compact label="Food and cuisine" support="Add cuisines, service styles, or dietary needs." types={["food"]} selectedIds={preferences.map((item) => item.id)} onSelect={addPreference} />
            <PlanningSearch compact label="Setting, atmosphere, and access" support="Add only the details that affect matching." types={["setting", "atmosphere", "accessibility", "audience"]} selectedIds={preferences.map((item) => item.id)} onSelect={addPreference} />
            {advancedPreferences.length ? (
              <div className="rounded-2xl bg-[#F7F4EC] p-4 lg:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Added details</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {advancedPreferences.map((preference) => <span key={preference.id} className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-neutral-700">{preference.label}</span>)}
                </div>
              </div>
            ) : null}
            {specificityCount >= 4 ? (
              <p className="rounded-2xl border border-[#D4AF37]/22 bg-[#D4AF37]/8 px-4 py-3 text-sm leading-6 text-neutral-700 lg:col-span-2">
                Highly specific combinations may narrow exact matches. Arivvio will still show the closest available options.
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
