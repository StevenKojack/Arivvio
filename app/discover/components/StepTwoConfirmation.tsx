"use client";

import { useMemo, useState } from "react";
import type { ServiceName } from "@/app/data/marketplace";
import { getEventMessage } from "@/lib/event-intelligence/messaging";
import { getContextualPlanningSuggestions } from "@/lib/event-intelligence/suggestions";
import { getEssentialServices, getServiceSuggestions } from "@/lib/event-intelligence/service-plan";
import { getStageConfiguration } from "@/lib/event-intelligence/stages";
import type { AudienceProfile, EventIntelligenceProfile, EventRecognition, EventStage } from "@/lib/event-intelligence/types";
import { searchEventIntents } from "@/lib/event-intelligence/search";
import {
  createPreferenceSelection,
  createServiceSelection,
  type PlanSelection,
  type PlanSelectionSource,
  type PlanningPreference,
  type SelectedPlanningPreference,
} from "@/lib/planning-taxonomy";
import { AdvancedMultiSelectField } from "./AdvancedMultiSelectField";
import { AgeAudienceControl } from "./AgeAudienceControl";
import { GenderControl } from "./GenderControl";
import { PlanSelectionCard } from "./PlanSelectionCard";
import { PlanningSearch } from "./PlanningSearch";
import { StageSelector } from "./StageSelector";
import { TagDirectoryModal } from "./TagDirectoryModal";

export function StepTwoConfirmation({
  advancedPreferences,
  audience,
  intelligence,
  onAdvancedPreferenceAdd,
  onAdvancedPreferenceRemove,
  onAudienceChange,
  onChangeEvent,
  onPlanPreferenceAdd,
  onPlanSelectionRemove,
  onPlanServiceAdd,
  onStagesChange,
  planSelections,
  recognition,
  stages,
}: {
  advancedPreferences: SelectedPlanningPreference[];
  audience: AudienceProfile;
  intelligence: EventIntelligenceProfile;
  onAdvancedPreferenceAdd: (preference: PlanningPreference) => void;
  onAdvancedPreferenceRemove: (preference: SelectedPlanningPreference) => void;
  onAudienceChange: (value: AudienceProfile) => void;
  onChangeEvent: (value: string) => void;
  onPlanPreferenceAdd: (preference: PlanningPreference, source: PlanSelectionSource) => void;
  onPlanSelectionRemove: (selection: PlanSelection) => void;
  onPlanServiceAdd: (service: ServiceName, source: PlanSelectionSource) => void;
  onStagesChange: (value: EventStage[]) => void;
  planSelections: PlanSelection[];
  recognition: EventRecognition;
  stages: EventStage[];
}) {
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [eventQuery, setEventQuery] = useState(recognition.identity.selectedDisplayEvent);
  const [advancedOpen, setAdvancedOpen] = useState(() => shouldOpenAdvanced(audience, advancedPreferences));
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [planMessage, setPlanMessage] = useState("");
  const eventSuggestions = useMemo(() => searchEventIntents(eventQuery, 5), [eventQuery]);
  const message = getEventMessage(recognition, audience.honoreeAge);
  const stageConfiguration = getStageConfiguration(recognition);
  const essentialServices = getEssentialServices(recognition, stages);
  const recommendedServices = getServiceSuggestions(recognition, essentialServices, stages, intelligence.recommendationScores);
  const contextualSuggestions = useMemo(() => getContextualPlanningSuggestions(recognition, audience), [audience, recognition]);
  const relevantSuggestions = useMemo(() => {
    const serviceSuggestions = [...essentialServices.map((service) => createServiceSelection(service, "initial-suggestion")), ...recommendedServices.map((item) => createServiceSelection(item.service, "initial-suggestion"))];
    const preferenceSuggestions = contextualSuggestions.map((preference) => createPreferenceSelection(preference, "initial-suggestion"));
    const seen = new Set<string>();
    return [...serviceSuggestions, ...preferenceSuggestions]
      .filter((item) => {
        const identity = item.preferenceId ?? item.linkedService ?? item.id;
        if (seen.has(identity)) return false;
        seen.add(identity);
        return !planSelections.some((selected) =>
          selected.id === item.id ||
          (item.preferenceId && selected.preferenceId === item.preferenceId) ||
          (item.linkedService && selected.linkedService === item.linkedService)
        );
      })
      .slice(0, 6);
  }, [contextualSuggestions, essentialServices, planSelections, recommendedServices]);
  const selectedPreferenceIds = planSelections.flatMap((item) => item.preferenceId ? [item.preferenceId] : []);
  const cultureValues = advancedPreferences.filter((item) => item.type === "culture" || item.type === "tradition");
  const cuisineValues = advancedPreferences.filter((item) => item.type === "cuisine");
  const showAge = !["funeral", "memorial", "celebration-of-life"].includes(recognition.identity.canonicalEventType) || audience.honoreeAge !== undefined || audience.audienceType !== undefined;

  function addPlanPreference(preference: PlanningPreference, source: PlanSelectionSource) {
    onPlanPreferenceAdd(preference, source);
    setPlanMessage(`${preference.label} was added to your plan.`);
  }

  function removePlanSelection(selection: PlanSelection) {
    onPlanSelectionRemove(selection);
    setPlanMessage(`You can continue without ${selection.label.toLowerCase()}. Add it again at any time.`);
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
          <button type="button" onClick={() => { setEventQuery(recognition.identity.selectedDisplayEvent); setIsEditingEvent((current) => !current); }} className="shrink-0 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 outline-none transition hover:-translate-y-0.5 hover:border-[#D4AF37] focus-visible:ring-2 focus-visible:ring-[#0D1321]">
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
                <button key={suggestion.label} type="button" onClick={() => { onChangeEvent(suggestion.label); setIsEditingEvent(false); }} className="rounded-xl px-3 py-2 text-left text-sm font-semibold text-neutral-700 transition hover:bg-[#F7F4EC]">{suggestion.label}</button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {stageConfiguration ? <StageSelector key={recognition.identity.canonicalEventType} configuration={stageConfiguration} value={stages} onChange={onStagesChange} /> : null}

      <section className="rounded-[24px] border border-[#D4AF37]/22 bg-white p-4 shadow-[0_14px_42px_rgba(13,19,33,0.05)] sm:p-5">
        <div>
          <h3 className="text-xl font-semibold text-[#0D1321]">Let&apos;s start building your plan</h3>
          <p className="mt-1 text-sm leading-6 text-neutral-600">Explore our services and add anything you want Arivvio to help you find.</p>
        </div>

        <div className="mt-5">
          <PlanningSearch label="Search services and vendor types" support="Try DJ, Armenian DJ, table rentals, taco cart, security, or any other service." suggestions={contextualSuggestions} selectedIds={selectedPreferenceIds} onSelect={(preference) => addPlanPreference(preference, "user-search")} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setDirectoryOpen(true)} className="h-11 rounded-full border border-neutral-200 bg-[#FFFCF7] px-5 text-sm font-semibold text-[#0D1321] outline-none transition hover:-translate-y-0.5 hover:border-[#D4AF37] focus-visible:ring-2 focus-visible:ring-[#0D1321]">Browse All</button>
          <span className="text-xs font-semibold text-neutral-500">{planSelections.length} added to your plan</span>
        </div>

        {relevantSuggestions.length ? (
          <div className="mt-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-[#0D1321]">A few relevant ideas</h4>
                <p className="mt-1 text-xs leading-5 text-neutral-500">Suggestions based on this event. Add only what feels useful.</p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {relevantSuggestions.map((item) => (
                <button key={item.id} type="button" aria-label={`Add ${item.label}`} onClick={() => item.preferenceId ? addPlanPreference(contextualSuggestions.find((preference) => preference.id === item.preferenceId) ?? planSelectionToPreference(item), "initial-suggestion") : item.linkedService && onPlanServiceAdd(item.linkedService, "initial-suggestion")} className="group flex min-h-[72px] items-start justify-between gap-3 rounded-2xl border border-neutral-200 bg-[#FFFCF7] px-4 py-3 text-left outline-none transition hover:-translate-y-0.5 hover:border-[#D4AF37] focus-visible:ring-2 focus-visible:ring-[#0D1321]">
                  <span>
                    <span className="block text-sm font-semibold text-[#0D1321]">{item.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-neutral-500">{item.category}</span>
                  </span>
                  <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0D1321] text-sm font-bold text-white transition group-hover:bg-[#B88A1D]">+</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 border-t border-neutral-200 pt-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-[#0D1321]">Added to your plan</h4>
              <p className="mt-1 text-xs leading-5 text-neutral-500">What Arivvio is currently helping you find.</p>
            </div>
          </div>
          {planSelections.length ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {planSelections.map((item) => <PlanSelectionCard key={item.id} item={item} onRemove={removePlanSelection} />)}
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-dashed border-neutral-300 bg-[#FAFAF9] px-4 py-7 text-center text-sm text-neutral-500">Search or browse services to begin building your plan.</div>
          )}
          <p aria-live="polite" className="mt-3 min-h-5 text-xs font-medium text-[#285E49]">{planMessage}</p>
        </div>
      </section>

      <section className="rounded-[24px] border border-neutral-200 bg-white">
        <button type="button" aria-expanded={advancedOpen} onClick={() => setAdvancedOpen((current) => !current)} className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left outline-none sm:px-5 focus-visible:ring-2 focus-visible:ring-[#0D1321]">
          <span>
            <span className="block text-sm font-semibold text-[#0D1321]">Advanced details</span>
            <span className="mt-1 block text-xs text-neutral-500">Age, gender, culture, and cuisine.</span>
          </span>
          <span className="shrink-0 text-sm font-semibold text-[#B88A1D]">{advancedOpen ? "Hide" : "Edit"}</span>
        </button>
        {advancedOpen ? (
          <div className="grid gap-4 border-t border-neutral-200 bg-[#FFFCF7] p-4 sm:p-5 lg:grid-cols-2">
            {showAge ? <AgeAudienceControl recognition={recognition} value={audience} onChange={onAudienceChange} /> : null}
            <GenderControl value={audience} onChange={onAudienceChange} />
            <AdvancedMultiSelectField label="Culture" placeholder="Search Armenian, Persian, Filipino..." types={["culture", "tradition"]} selected={cultureValues} onAdd={onAdvancedPreferenceAdd} onRemove={onAdvancedPreferenceRemove} />
            <AdvancedMultiSelectField label="Cuisine" placeholder="Search Mexican, Mediterranean, vegan..." types={["cuisine"]} selected={cuisineValues} onAdd={onAdvancedPreferenceAdd} onRemove={onAdvancedPreferenceRemove} />
          </div>
        ) : null}
      </section>

      <TagDirectoryModal
        isOpen={directoryOpen}
        onClose={() => setDirectoryOpen(false)}
        onSelect={(preference) => addPlanPreference(preference, "browse-all")}
        onRemove={(preference) => {
          const selection = planSelections.find((item) => item.preferenceId === preference.id);
          if (selection) removePlanSelection(selection);
        }}
        selectedIds={selectedPreferenceIds}
      />
    </div>
  );
}

function shouldOpenAdvanced(audience: AudienceProfile, preferences: SelectedPlanningPreference[]) {
  return Boolean(audience.honoreeAge !== undefined || audience.genderContext || preferences.length);
}

function planSelectionToPreference(item: PlanSelection): PlanningPreference {
  return {
    aliases: item.aliases,
    category: item.category,
    description: item.description,
    id: item.preferenceId ?? item.id,
    label: item.label,
    linkedService: item.linkedService,
    type: item.subtype === "marketplace-service" ? "service" : item.subtype,
  };
}
