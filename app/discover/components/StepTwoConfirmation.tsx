"use client";

import { useMemo, useState } from "react";
import type { ServiceName } from "@/app/data/marketplace";
import { getEventMessage } from "@/lib/event-intelligence/messaging";
import { getFeaturedPersonPolicy } from "@/lib/event-intelligence/featured-person";
import {
  getContextualPlanningSuggestions,
  getPlanningSearchHelper,
} from "@/lib/event-intelligence/suggestions";
import { getEssentialServices, getServiceSuggestions } from "@/lib/event-intelligence/service-plan";
import { getStageConfiguration } from "@/lib/event-intelligence/stages";
import type { AudienceProfile, EventIntelligenceProfile, EventRecognition, EventStage } from "@/lib/event-intelligence/types";
import { searchEventIntents } from "@/lib/event-intelligence/search";
import {
  createPreferenceSelection,
  createServiceSelection,
  getPlanSelectionDisplayLabel,
  isAdvancedPreference,
  type PlanDetailTag,
  type PlanSelection,
  type PlanSelectionSource,
  type PlanningPreference,
} from "@/lib/planning-taxonomy";
import { InviteesModal } from "./InviteesModal";
import { EventContextModal } from "./EventContextModal";
import { PlanSelectionCard } from "./PlanSelectionCard";
import { PlanningSearch } from "./PlanningSearch";
import { ServiceDetailsModal } from "./ServiceDetailsModal";
import { StageSelector } from "./StageSelector";
import { TagDirectoryModal } from "./TagDirectoryModal";

export function StepTwoConfirmation({
  audience,
  intelligence,
  onAudienceChange,
  onChangeEvent,
  onContextPreferencesChange,
  onPlanPreferenceAdd,
  onPlanSelectionAdd,
  onPlanSelectionChoiceRemove,
  onPlanSelectionRemove,
  onPlanSelectionUpdate,
  onPlanServiceAdd,
  onStagesChange,
  recognition,
  stages,
}: {
  audience: AudienceProfile;
  intelligence: EventIntelligenceProfile;
  onAudienceChange: (value: AudienceProfile) => void;
  onChangeEvent: (value: string) => void;
  onContextPreferencesChange: (preferences: PlanningPreference[]) => void;
  onPlanPreferenceAdd: (preference: PlanningPreference, source: PlanSelectionSource) => void;
  onPlanSelectionAdd: (selection: PlanSelection) => void;
  onPlanSelectionChoiceRemove: (selection: PlanSelection) => void;
  onPlanSelectionRemove: (selection: PlanSelection) => void;
  onPlanSelectionUpdate: (selection: PlanSelection, details: PlanDetailTag[]) => void;
  onPlanServiceAdd: (service: ServiceName, source: PlanSelectionSource) => void;
  onStagesChange: (value: EventStage[]) => void;
  recognition: EventRecognition;
  stages: EventStage[];
}) {
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [eventQuery, setEventQuery] = useState(recognition.identity.selectedDisplayEvent);
  const [advancedOpen, setAdvancedOpen] = useState(() => hasInviteeDetails(audience) || Boolean(getFeaturedPersonPolicy(recognition)));
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [inviteesOpen, setInviteesOpen] = useState(false);
  const [selectedPlanItem, setSelectedPlanItem] = useState<PlanSelection>();
  const [planMessage, setPlanMessage] = useState("");
  const planSelections = intelligence.planSelections;
  const eventSuggestions = useMemo(() => searchEventIntents(eventQuery, 5), [eventQuery]);
  const message = getEventMessage(recognition, audience);
  const stageConfiguration = getStageConfiguration(recognition);
  const essentialServices = getEssentialServices(recognition, stages);
  const recommendedServices = getServiceSuggestions(recognition, essentialServices, stages, intelligence.recommendationScores);
  const contextualSuggestions = useMemo(() => getContextualPlanningSuggestions(recognition, audience), [audience, recognition]);
  const searchHelper = useMemo(() => getPlanningSearchHelper(recognition, audience), [audience, recognition]);
  const relevantSuggestions = useMemo(() => {
    const suggestions = [
      ...essentialServices.map((service) => createServiceSelection(service, "initial-suggestion")),
      ...recommendedServices.map((item) => createServiceSelection(item.service, "initial-suggestion")),
      ...contextualSuggestions.map((preference) => createPreferenceSelection(preference, "initial-suggestion")),
    ];
    const seen = new Set<string>();
    return suggestions.filter((item) => {
      if (seen.has(item.id) || planSelections.some((selected) => selected.id === item.id)) return false;
      seen.add(item.id);
      return true;
    }).slice(0, 6);
  }, [contextualSuggestions, essentialServices, planSelections, recommendedServices]);
  const contextPreferences = intelligence.preferences.filter(isAdvancedPreference);
  const contextSelections = contextPreferences.map((preference) => createPreferenceSelection(preference, "browse-all"));
  const selectedIds = [
    ...planSelections.flatMap((item) => [item.id, ...item.preferenceIds]),
    ...contextSelections.flatMap((item) => [item.id, ...item.preferenceIds]),
  ];

  function addPlanPreference(preference: PlanningPreference, source: PlanSelectionSource) {
    const selection = createPreferenceSelection(preference, source);
    onPlanPreferenceAdd(preference, source);
    setPlanMessage(isAdvancedPreference(preference)
      ? `${preference.label} was saved in Advanced details.`
      : `${getPlanSelectionDisplayLabel(selection)} was added to your plan.`);
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
              {eventSuggestions.map((suggestion) => <button key={suggestion.label} type="button" onClick={() => { onChangeEvent(suggestion.label); setIsEditingEvent(false); }} className="rounded-xl px-3 py-2 text-left text-sm font-semibold text-neutral-700 transition hover:bg-[#F7F4EC]">{suggestion.label}</button>)}
            </div>
          </div>
        ) : null}
      </section>

      {stageConfiguration ? <StageSelector key={recognition.identity.canonicalEventType} configuration={stageConfiguration} value={stages} onChange={onStagesChange} /> : null}

      <section className="rounded-[24px] border border-[#D4AF37]/22 bg-white p-4 shadow-[0_14px_42px_rgba(13,19,33,0.05)] sm:p-5">
        <h3 className="text-xl font-semibold text-[#0D1321]">Let&apos;s start building your plan</h3>
        <p className="mt-1 text-sm leading-6 text-neutral-600">Explore services and add anything you want Arivvio to help you find.</p>
        <div className="mt-5">
          <PlanningSearch label="What should Arivvio help you find?" support={searchHelper} suggestions={contextualSuggestions} selectedIds={selectedIds} onSelect={(preference) => addPlanPreference(preference, "user-search")} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setDirectoryOpen(true)} className="h-11 rounded-full border border-neutral-200 bg-[#FFFCF7] px-5 text-sm font-semibold text-[#0D1321] outline-none transition hover:-translate-y-0.5 hover:border-[#D4AF37] focus-visible:ring-2 focus-visible:ring-[#0D1321]">Browse All</button>
          <span className="text-xs font-semibold text-neutral-500">{planSelections.length} added to your plan</span>
        </div>

        {relevantSuggestions.length ? (
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-[#0D1321]">A few relevant ideas</h4>
            <p className="mt-1 text-xs leading-5 text-neutral-500">Suggestions based on this event. Add only what feels useful.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {relevantSuggestions.map((item) => (
                <button key={item.id} type="button" aria-label={`Add ${item.label}`} onClick={() => {
                  const preference = item.preferenceIds.length ? contextualSuggestions.find((candidate) => item.preferenceIds.includes(candidate.id)) : undefined;
                  if (preference) addPlanPreference(preference, "initial-suggestion");
                  else if (item.linkedService) onPlanServiceAdd(item.linkedService, "initial-suggestion");
                }} className="group flex min-h-[72px] items-start justify-between gap-3 rounded-2xl border border-neutral-200 bg-[#FFFCF7] px-4 py-3 text-left outline-none transition hover:-translate-y-0.5 hover:border-[#D4AF37] focus-visible:ring-2 focus-visible:ring-[#0D1321]">
                  <span><span className="block text-sm font-semibold text-[#0D1321]">{getPlanSelectionDisplayLabel(item)}</span><span className="mt-1 block text-xs leading-5 text-neutral-500">{item.details.length ? `${item.label} · ${item.details.map((detail) => detail.label).join(", ")}` : item.category}</span></span>
                  <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0D1321] text-sm font-bold text-white transition group-hover:bg-[#B88A1D]">+</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 border-t border-neutral-200 pt-5">
          <h4 className="text-sm font-semibold text-[#0D1321]">Added to your plan</h4>
          <p className="mt-1 text-xs leading-5 text-neutral-500">Click any selected service to personalize it. Your exact choices stay attached to the plan.</p>
          {planSelections.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{planSelections.map((item) => <PlanSelectionCard key={item.id} item={item} onOpen={setSelectedPlanItem} onRemove={removePlanSelection} />)}</div> : <div className="mt-3 rounded-2xl border border-dashed border-neutral-300 bg-[#FAFAF9] px-4 py-7 text-center text-sm text-neutral-500">Search or browse services to begin building your plan.</div>}
          <p aria-live="polite" className="mt-3 min-h-5 text-xs font-medium text-[#285E49]">{planMessage}</p>
        </div>
      </section>

      <section className="rounded-[24px] border border-neutral-200 bg-white">
        <button type="button" aria-expanded={advancedOpen} onClick={() => setAdvancedOpen((current) => !current)} className="flex w-full items-center justify-between gap-4 rounded-[24px] px-4 py-4 text-left outline-none sm:px-5 focus-visible:ring-2 focus-visible:ring-[#0D1321]">
          <span><span className="block text-sm font-semibold text-[#0D1321]">Advanced details</span><span className="mt-1 block text-xs text-neutral-500">Optional invitee context for better recommendations.</span></span>
          <span className="shrink-0 text-sm font-semibold text-[#B88A1D]">{advancedOpen ? "Hide" : "Open"}</span>
        </button>
        {advancedOpen ? (
          <div className="grid gap-3 border-t border-neutral-200 bg-[#FFFCF7] p-4 sm:p-5 sm:grid-cols-2">
            <button type="button" onClick={() => setInviteesOpen(true)} className="flex w-full items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-left outline-none transition hover:-translate-y-0.5 hover:border-[#D4AF37] focus-visible:ring-2 focus-visible:ring-[#0D1321]">
              <span><span className="block text-sm font-semibold text-[#0D1321]">Invitees</span><span className="mt-1 block text-xs leading-5 text-neutral-500">{getInviteeSummary(audience, recognition)}</span></span>
              <span aria-hidden="true" className="text-lg text-[#B88A1D]">&rarr;</span>
            </button>
            <button type="button" onClick={() => setContextOpen(true)} className="flex w-full items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-left outline-none transition hover:-translate-y-0.5 hover:border-[#D4AF37] focus-visible:ring-2 focus-visible:ring-[#0D1321]">
              <span><span className="block text-sm font-semibold text-[#0D1321]">Culture and cuisine</span><span className="mt-1 block text-xs leading-5 text-neutral-500">{contextPreferences.length ? contextPreferences.slice(0, 3).map((preference) => preference.label).join(" · ") : "Optional context for food, music, and traditions."}</span></span>
              <span aria-hidden="true" className="text-lg text-[#B88A1D]">&rarr;</span>
            </button>
          </div>
        ) : null}
      </section>

      {directoryOpen ? <TagDirectoryModal onClose={() => setDirectoryOpen(false)} onSelect={onPlanSelectionAdd} onRemove={onPlanSelectionChoiceRemove} planItemCount={planSelections.length} selections={[...planSelections, ...contextSelections]} /> : null}
      {selectedPlanItem ? <ServiceDetailsModal item={selectedPlanItem} onClose={() => setSelectedPlanItem(undefined)} onSave={(details) => onPlanSelectionUpdate(selectedPlanItem, details)} /> : null}
      {inviteesOpen ? <InviteesModal recognition={recognition} value={audience} onClose={() => setInviteesOpen(false)} onSave={onAudienceChange} /> : null}
      {contextOpen ? <EventContextModal selectedIds={contextPreferences.map((preference) => preference.id)} onClose={() => setContextOpen(false)} onSave={onContextPreferencesChange} /> : null}
    </div>
  );
}

function hasInviteeDetails(audience: AudienceProfile) {
  return Boolean(audience.honoreeAge !== undefined || audience.audienceType === "custom" || audience.celebrating);
}

function getInviteeSummary(audience: AudienceProfile, recognition: EventRecognition) {
  const details = [
    audience.audienceType ? formatLabel(audience.audienceType) : undefined,
    audience.audienceGender ? formatLabel(audience.audienceGender) : undefined,
    audience.honoreeAge !== undefined ? `celebrating age ${audience.honoreeAge}` : undefined,
  ].filter(Boolean);
  if (details.length) return details.join(" · ");
  const featuredPerson = getFeaturedPersonPolicy(recognition);
  return featuredPerson?.ageQuestion
    ? `${featuredPerson.question} Add their age and invitee mix.`
    : featuredPerson?.dueDateQuestion
      ? `${featuredPerson.question} Add the due date and invitee mix.`
      : featuredPerson?.question ?? "Age range and audience mix.";
}

function formatLabel(value: string) {
  return value.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
