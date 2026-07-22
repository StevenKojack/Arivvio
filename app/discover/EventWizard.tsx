"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getHoursBetween,
  getDistanceMiles,
  homeAreas,
  type Coordinates,
  type ServiceName,
} from "../data/marketplace";
import {
  searchEventIntents,
} from "@/lib/event-intelligence/search";
import { buildEventIntelligenceProfile } from "@/lib/event-intelligence/engine";
import { saveEventIntelligenceProfile } from "@/lib/event-intelligence/storage";
import { getEssentialServices, formatNaturalList } from "@/lib/event-intelligence/service-plan";
import type { AudienceProfile, EventIntelligenceProfile, EventRecognition, EventStage } from "@/lib/event-intelligence/types";
import {
  createPreferenceSelection,
  createServiceSelection,
  mergePlanSelection,
  removePlanSelectionChoice,
  toSelectedPreferencesFromPlan,
  updateSelectionDetails,
  type PlanDetailTag,
  type PlanSelection,
  type PlanSelectionSource,
  type PlanningPreference,
  type SelectedPlanningPreference,
} from "@/lib/planning-taxonomy";
import { AddressAutocomplete, type AddressSuggestion } from "./components/AddressAutocomplete";
import {
  searchAddressSuggestions,
  type AddressSuggestion as GeocodingSuggestion,
} from "@/lib/maps/geocoding";
import {
  ZoneMapEditor,
  summarizeMapZones,
  type MapZone,
} from "../components/maps/ZoneMapEditor";
import {
  createRadiusZone,
  getZoneCenter,
  loadLocationProfile,
  metersToMiles,
  saveLocationProfile,
  type LocationProfile,
} from "@/lib/maps/zones";
import { CalendarPicker } from "./components/CalendarPicker";
import { StepCard } from "./components/StepCard";
import { StepTwoConfirmation } from "./components/StepTwoConfirmation";
import { TimeDurationPicker } from "./components/TimeDurationPicker";
import { formatTime } from "@/lib/utils/format";

type LocationKind =
  | "Venue needed"
  | "Already have venue";

type LocationMode = "has_venue" | "needs_venue";

type EventLocation = {
  context:
    | "activity_venue"
    | "banquet_hall"
    | "business"
    | "church"
    | "likely_home"
    | "likely_venue"
    | "venue_needed"
    | "";
  coordinates?: {
    lat: number;
    lng: number;
  };
  id: number;
  kind: LocationKind;
  mode: LocationMode | "";
  currentLocationUsed?: boolean;
  mapboxPlaceId?: string;
  query: string;
  selectedAddress: string;
  selectedLabel: string;
  selectedVenueId?: string;
  zones: MapZone[];
};

const steps = ["What", "Confirm", "When", "Where", "Guests", "Review"] as const;

export function EventWizard() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("query") ?? "";
  const initialIntelligence = useMemo(
    () => buildEventIntelligenceProfile({ query: initialQuery || "Private party" }),
    [initialQuery],
  );
  const initialStages = initialIntelligence.stages;
  const [step, setStep] = useState(initialQuery ? 1 : 0);
  const [query, setQuery] = useState(initialQuery);
  const [timing, setTiming] = useState({
    date: "",
    endDate: "",
    endTime: "22:00",
    setupTime: "17:00",
    startTime: "18:00",
    teardownTime: "23:00",
  });
  const [showAdvancedTiming, setShowAdvancedTiming] = useState(false);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [locations, setLocations] = useState<EventLocation[]>(() => [
    getInitialLocationFromSession(),
  ]);
  const [guestCount, setGuestCount] = useState(60);
  const [budget, setBudget] = useState(6000);
  const [planSelections, setPlanSelections] = useState<PlanSelection[]>(() => createInitialPlanSelections(initialIntelligence));
  const [audience, setAudience] = useState<AudienceProfile>(initialIntelligence.audience);
  const [stages, setStages] = useState<EventStage[]>(initialStages);
  const selectedServices = useMemo(
    () => Array.from(new Set(planSelections.flatMap((item) => item.matchingServices))),
    [planSelections],
  );
  const preferences = useMemo(() => planSelections.flatMap(toSelectedPreferencesFromPlan), [planSelections]);
  const eventIntelligence = useMemo(
    () => buildEventIntelligenceProfile({
      audience,
      guestSize: guestCount,
      inferPreferencesFromQuery: false,
      locationContext: locations[0]?.mode === "has_venue" ? "has_venue" : locations[0]?.context,
      planSelections,
      preferences,
      query: query || "Private party",
      selectedServices,
      stages,
    }),
    [audience, guestCount, locations, planSelections, preferences, query, selectedServices, stages],
  );
  const recognition = eventIntelligence.recognition;
  const planningNotes = useMemo(
    () =>
      [
        ...planSelections.flatMap((selection) => selection.details.map((detail) => `${selection.label}: ${detail.label}`)),
        ...preferences.map((preference) => preference.label),
      ]
        .filter(Boolean)
        .join(", "),
    [planSelections, preferences],
  );
  const suggestions = useMemo(() => searchEventIntents(query, 5), [query]);
  const visibleServices = selectedServices.filter(
    (service) => !recognition.excludedServices.includes(service),
  );
  const locationSummary = getLocationSummary(locations);
  const eventAnchor = locations.find((location) => location.coordinates)?.coordinates;
  const durationHours = getHoursBetween(timing.startTime, timing.endTime);
  const marketplaceHref = useMemo(() => {
    const profile = recognition.profile;
    const params = new URLSearchParams({
      budget: String(budget),
      date: timing.date,
      duration: String(durationHours),
      entryMode: "event",
      event: profile.marketplaceEventType ?? "Private Party",
      eventLabel: recognition.identity.selectedDisplayEvent,
      eventProfile: "session",
      guests: String(guestCount),
      location: locationSummary,
      locationProfile: "session",
      services: visibleServices.join(","),
      time: timing.startTime,
    });

    if (planningNotes) {
      params.set("notes", planningNotes);
    }

    if (audience.audienceType) params.set("audience", audience.audienceType);
    if (audience.honoreeAge !== undefined) params.set("honoreeAge", String(audience.honoreeAge));
    if (audience.genderContext) params.set("genderContext", audience.genderContext);

    if (stages.length) {
      params.set("stages", stages.map((stage) => stage.id).join(","));
    }

    if (eventAnchor) {
      params.set("lat", String(eventAnchor.lat));
      params.set("lng", String(eventAnchor.lng));
      params.set("locationContext", locations[0]?.context || "venue_needed");
    }

    const primaryZone = locations[0]?.zones.find((zone) => zone.type === "radius");
    if (primaryZone?.radiusMeters) {
      params.set("searchRadiusMiles", String(Math.round(metersToMiles(primaryZone.radiusMeters))));
    }

    return `/marketplace?${params.toString()}`;
  }, [
    audience,
    budget,
    durationHours,
    eventAnchor,
    guestCount,
    locationSummary,
    locations,
    planningNotes,
    recognition.identity.selectedDisplayEvent,
    recognition.profile,
    stages,
    timing.date,
    timing.startTime,
    visibleServices,
  ]);
  const canOpenMarketplace =
    Boolean(timing.date && timing.startTime && timing.endTime) &&
    guestCount > 0 &&
    locations.some((location) => location.mode && (location.mode === "needs_venue" || Boolean(location.query.trim() || location.selectedAddress)));

  useEffect(() => {
    const profile = buildLocationProfile(locations[0]);

    if (profile.locationMode || profile.coordinates || profile.zone) {
      saveLocationProfile(profile);
    }
  }, [locations]);

  useEffect(() => {
    saveEventIntelligenceProfile(eventIntelligence);
  }, [eventIntelligence]);

  function continueFromSearch(nextQuery = query) {
    const cleanQuery = nextQuery.trim();

    if (!cleanQuery) {
      return;
    }

    setQuery(cleanQuery);
    const nextIntelligence = buildEventIntelligenceProfile({ query: cleanQuery });
    setStages(nextIntelligence.stages);
    setAudience(nextIntelligence.audience);
    setPlanSelections(createInitialPlanSelections(nextIntelligence));
    setStep(1);
  }

  function addService(service: ServiceName, source: PlanSelectionSource = "initial-suggestion") {
    const selection = createServiceSelection(service, source);
    setPlanSelections((current) => mergePlanSelection(current, selection));
  }

  function addPlanPreference(preference: PlanningPreference, source: PlanSelectionSource) {
    const selection = createPreferenceSelection(preference, source);
    setPlanSelections((current) => mergePlanSelection(current, selection));
  }

  function addCanonicalPlanSelection(selection: PlanSelection) {
    setPlanSelections((current) => mergePlanSelection(current, selection));
  }

  function removePlanSelectionChoiceFromPlan(choice: PlanSelection) {
    setPlanSelections((current) => current.flatMap((item) => {
      if (item.id !== choice.id) return [item];
      const updated = removePlanSelectionChoice(item, choice);
      return updated ? [updated] : [];
    }));
  }

  function removePlanSelection(selection: PlanSelection) {
    setPlanSelections((current) => current.filter((item) => item.id !== selection.id));
  }

  function updatePlanDetails(selection: PlanSelection, details: PlanDetailTag[]) {
    setPlanSelections((current) => current.map((item) => item.id === selection.id ? updateSelectionDetails(item, details) : item));
  }

  function updateContextPreferences(nextPreferences: PlanningPreference[]) {
    setPlanSelections((current) => nextPreferences
      .map((preference) => createPreferenceSelection(preference, "browse-all"))
      .reduce<PlanSelection[]>(
        mergePlanSelection,
        current.filter((item) => !["culture", "cuisine", "tradition"].includes(item.subtype)),
      ));
  }

  function updateLocation(id: number, updates: Partial<EventLocation>) {
    setLocations((current) =>
      current.map((location) =>
        location.id === id ? { ...location, ...updates } : location,
      ),
    );
  }

  function canVisitStep(index: number) {
    if (index <= step) {
      return true;
    }

    if (index === 1 || index === 2) {
      return Boolean(query.trim());
    }

    if (index === 3) {
      return Boolean(query.trim() && timing.date);
    }

    if (index === 4) {
      return Boolean(query.trim() && timing.date);
    }

    return canOpenMarketplace || Boolean(query.trim() && timing.date && guestCount > 0);
  }

  return (
    <section className="px-6 py-10 sm:px-8 lg:px-12">
      <div
        className={`mx-auto min-w-0 transition-[max-width] duration-300 ${
          step === 3 ? "max-w-[1600px]" : step === 1 ? "max-w-6xl" : "max-w-5xl"
        }`}
      >
        <StepRail
          canVisitStep={canVisitStep}
          currentStep={step}
          onStepChange={setStep}
        />
        <div className="mt-8 overflow-visible rounded-[34px] border border-[#D4AF37]/16 bg-white shadow-[0_28px_90px_rgba(13,19,33,0.08)]">
          {step === 0 ? (
            <StepCard
              eyebrow="Step 1"
              title="What are you planning?"
              body="Type the event naturally. Arivvio will quietly shape the plan around it."
              action={
                <button
                  type="button"
                  onClick={() => continueFromSearch()}
                  disabled={!query.trim()}
                  className="h-12 rounded-full bg-[#0D1321] px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#111A2E] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continue
                </button>
              }
            >
              <SearchBox
                query={query}
                suggestions={suggestions}
                onChange={setQuery}
                onSelect={continueFromSearch}
              />
            </StepCard>
          ) : null}

          {step === 1 ? (
            <StepCard
              eyebrow="Step 2"
              title="Confirm your plan."
              body="Make sure we understood the occasion, then add only the details that should shape your matches."
              layout="wide"
              action={<PrimaryButton label="Looks right" onClick={() => setStep(2)} />}
            >
              <StepTwoConfirmation
                key={query}
                audience={audience}
                intelligence={eventIntelligence}
                onAudienceChange={setAudience}
                onChangeEvent={continueFromSearch}
                onContextPreferencesChange={updateContextPreferences}
                onPlanPreferenceAdd={addPlanPreference}
                onPlanSelectionAdd={addCanonicalPlanSelection}
                onPlanSelectionChoiceRemove={removePlanSelectionChoiceFromPlan}
                onPlanSelectionRemove={removePlanSelection}
                onPlanSelectionUpdate={updatePlanDetails}
                onPlanServiceAdd={addService}
                onStagesChange={setStages}
                recognition={recognition}
                stages={stages}
              />
            </StepCard>
          ) : null}

          {step === 2 ? (
            <StepCard
              eyebrow="Step 3"
              title="When is it?"
              body="Date and time help Arivvio estimate availability and pricing without asking for too much."
              action={<PrimaryButton label="Continue" onClick={() => setStep(3)} />}
            >
              <div className="grid gap-5">
                <CalendarPicker
                  label="Date"
                  value={timing.date}
                  onChange={(value) => setTiming((current) => ({ ...current, date: value }))}
                />
                <TimeDurationPicker
                  startTime={timing.startTime}
                  endTime={timing.endTime}
                  onStartTimeChange={(value) =>
                    setTiming((current) => ({ ...current, startTime: value }))
                  }
                  onEndTimeChange={(value) =>
                    setTiming((current) => ({ ...current, endTime: value }))
                  }
                />
              </div>
              <button
                type="button"
                onClick={() => setShowAdvancedTiming((current) => !current)}
                className="mt-5 rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:-translate-y-0.5 hover:border-[#0D1321]"
              >
                {showAdvancedTiming ? "Hide advanced timing" : "Advanced timing"}
              </button>
              {showAdvancedTiming ? (
                <div className="mt-4 grid gap-4 rounded-[24px] border border-neutral-200 bg-[#FFFCF7] p-4 md:grid-cols-2">
                  <label className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-neutral-800">
                    Multi-day event
                    <input
                      type="checkbox"
                      checked={isMultiDay}
                      onChange={(event) => setIsMultiDay(event.target.checked)}
                      className="h-5 w-5 accent-[#D4AF37]"
                    />
                  </label>
                  {isMultiDay ? (
                    <CalendarPicker
                      label="End date"
                      value={timing.endDate}
                      onChange={(value) =>
                        setTiming((current) => ({ ...current, endDate: value }))
                      }
                    />
                  ) : null}
                  <TimingField
                    label="Setup time"
                    type="time"
                    value={timing.setupTime}
                    onChange={(value) =>
                      setTiming((current) => ({ ...current, setupTime: value }))
                    }
                  />
                  <TimingField
                    label="Teardown time"
                    type="time"
                    value={timing.teardownTime}
                    onChange={(value) =>
                      setTiming((current) => ({ ...current, teardownTime: value }))
                    }
                  />
                </div>
              ) : null}
            </StepCard>
          ) : null}

          {step === 3 ? (
            <StepCard
              eyebrow="Step 4"
              title="Where is it?"
              body="Choose the known place, or draw one clean search area for where the venue should be."
              layout="wide"
              action={<PrimaryButton label="Continue" onClick={() => setStep(4)} />}
            >
              <LocationStep
                eventLabel={
                  recognition.identity.selectedDisplayEvent
                }
                location={locations[0]}
                onSelectAddress={(suggestion) => {
                  updateLocation(locations[0].id, {
                    context: suggestion.context,
                    coordinates: suggestion.coordinates,
                    currentLocationUsed: false,
                    kind: "Already have venue",
                    mapboxPlaceId: suggestion.id,
                    mode: "has_venue",
                    query: suggestion.label,
                    selectedAddress: suggestion.address,
                    selectedLabel: suggestion.label,
                    zones: [],
                  });
                  setPlanSelections((current) => current.filter((item) => item.linkedService !== "Venue"));
                }}
                onSelectMode={(mode) => {
                  updateLocation(locations[0].id, {
                    context: mode === "needs_venue" ? "venue_needed" : "",
                    currentLocationUsed: false,
                    kind: mode === "needs_venue" ? "Venue needed" : "Already have venue",
                    mapboxPlaceId: undefined,
                    mode,
                    query: "",
                    selectedAddress: "",
                    selectedLabel: "",
                    selectedVenueId: undefined,
                    zones: mode === "needs_venue" ? getDefaultPlannerZones(eventAnchor ?? getDefaultMapCenter()) : [],
                  });
                  if (mode === "needs_venue") addService("Venue");
                }}
                onUpdate={(updates) => updateLocation(locations[0].id, updates)}
              />
            </StepCard>
          ) : null}

          {step === 4 ? (
            <StepCard
              eyebrow="Step 5"
              title="Guests and budget."
              body="A simple range is enough. Arivvio will use it to keep matches realistic."
              action={<PrimaryButton label="Review plan" onClick={() => setStep(5)} />}
            >
              <div className="grid gap-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <TimingField
                    label="Guest count"
                    type="number"
                    value={String(guestCount)}
                    onChange={(value) => setGuestCount(Number(value))}
                  />
                  <TimingField
                    label="Estimated budget"
                    type="number"
                    value={String(budget)}
                    onChange={(value) => setBudget(Number(value))}
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-4">
                  {[
                    ["Simple", 2500],
                    ["Standard", 6000],
                    ["Premium", 15000],
                    ["Luxury", 30000],
                  ].map(([label, value]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setBudget(Number(value))}
                      className={`h-12 rounded-full border text-sm font-semibold transition hover:-translate-y-0.5 ${
                        budget === Number(value)
                          ? "border-[#0D1321] bg-[#0D1321] text-white"
                          : "border-neutral-200 bg-white text-neutral-700 hover:border-[#0D1321]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min="500"
                  max="50000"
                  step="500"
                  value={budget}
                  onChange={(event) => setBudget(Number(event.target.value))}
                  className="w-full accent-[#D4AF37]"
                />
              </div>
            </StepCard>
          ) : null}

          {step === 5 ? (
            <StepCard
              eyebrow="Step 6"
              title="Your plan is ready."
              body="Browse matches when you are ready. You can still edit the details before vendors appear."
              action={
                <div className="flex flex-wrap gap-3">
                  {canOpenMarketplace ? (
                    <Link
                      href={marketplaceHref}
                      onClick={() => saveLocationProfile(buildLocationProfile(locations[0]))}
                      className="inline-flex h-12 items-center justify-center rounded-full bg-[#0D1321] px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#111A2E]"
                    >
                      Browse matches
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="h-12 rounded-full bg-[#0D1321] px-6 text-sm font-semibold text-white opacity-40"
                    >
                      Add date and location first
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="h-12 rounded-full border border-neutral-300 bg-white px-6 text-sm font-semibold text-neutral-950 transition hover:-translate-y-0.5 hover:border-[#0D1321]"
                  >
                    Edit details
                  </button>
                </div>
              }
            >
              <FinalReview
                budget={budget}
                guestCount={guestCount}
                locations={locations}
                preferences={preferences}
                recognition={recognition}
                selectedServices={visibleServices}
                stages={stages}
                timing={timing}
              />
            </StepCard>
          ) : null}
        </div>

        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(current - 1, 0))}
            className="mt-5 text-sm font-semibold text-neutral-500 transition hover:text-neutral-950"
          >
            Back
          </button>
        ) : null}
      </div>
    </section>
  );
}

function createInitialPlanSelections(intelligence: EventIntelligenceProfile) {
  const preferenceSelections = intelligence.preferences
    .map((preference) => createPreferenceSelection(preference, "natural-language-inference"));
  const representedServices = new Set(preferenceSelections.flatMap((item) => item.matchingServices));
  const serviceSelections = Array.from(new Set([
    ...getEssentialServices(intelligence.recognition, intelligence.stages),
    ...intelligence.requestedServices,
  ]))
    .filter((service) => !representedServices.has(service))
    .map((service) => createServiceSelection(service, "initial-suggestion"));

  return [...serviceSelections, ...preferenceSelections].reduce<PlanSelection[]>(mergePlanSelection, []);
}

function StepRail({
  canVisitStep,
  currentStep,
  onStepChange,
}: {
  canVisitStep: (index: number) => boolean;
  currentStep: number;
  onStepChange: (index: number) => void;
}) {
  return (
    <div className="flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain scroll-smooth pb-1">
      {steps.map((label, index) => {
        const isAvailable = canVisitStep(index);

        return (
          <button
            key={label}
            type="button"
            disabled={!isAvailable}
            onClick={() => onStepChange(index)}
            className={`flex min-w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
              currentStep === index
                ? "border-[#0D1321] bg-[#0D1321] text-white shadow-[0_14px_34px_rgba(13,19,33,0.16)]"
                : currentStep > index
                  ? "border-[#D4AF37]/18 bg-white text-neutral-800 hover:-translate-y-0.5 hover:border-[#D4AF37]/60"
                  : isAvailable
                    ? "border-[#D4AF37]/18 bg-white text-neutral-500 hover:border-[#D4AF37]/45"
                    : "cursor-not-allowed border-neutral-200 bg-neutral-50 text-neutral-300"
            }`}
          >
            <span>{index + 1}</span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function SearchBox({
  onChange,
  onSelect,
  query,
  suggestions,
}: {
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
  query: string;
  suggestions: ReturnType<typeof searchEventIntents>;
}) {
  return (
    <div>
      <input
        value={query}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Pool party, funeral reception, corporate seminar..."
        className="h-14 w-full rounded-full border border-neutral-300 px-5 text-lg font-semibold outline-none transition focus:border-[#0D1321]"
      />
      <div className="mt-4 overflow-hidden rounded-[28px] border border-neutral-200 bg-[#FFFCF7] p-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.label}
            type="button"
            onClick={() => onSelect(suggestion.label)}
            className="flex w-full items-center justify-between gap-4 rounded-[22px] px-4 py-3 text-left transition hover:bg-white"
          >
            <span>
              <span className="block text-sm font-semibold text-neutral-950">
                {suggestion.label}
              </span>
              <span className="mt-1 block text-xs font-medium text-neutral-500">
                {suggestion.recognition.profile.likelyVibe ??
                  suggestion.recognition.profile.venueStyle}
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-700">
              Select
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function LocationStep({
  eventLabel,
  location,
  onSelectAddress,
  onSelectMode,
  onUpdate,
}: {
  eventLabel: string;
  location: EventLocation;
  onSelectAddress: (suggestion: AddressSuggestion) => void;
  onSelectMode: (mode: LocationMode) => void;
  onUpdate: (updates: Partial<EventLocation>) => void;
}) {
  const [locationMessage, setLocationMessage] = useState("");
  const [areaSuggestions, setAreaSuggestions] = useState<GeocodingSuggestion[]>([]);
  const [isSearchingArea, setIsSearchingArea] = useState(false);
  const matchedArea = getMatchingHomeArea(location.query);
  const mapCenter = location.coordinates ?? matchedArea?.coordinates ?? getDefaultMapCenter();

  useEffect(() => {
    if (location.mode !== "needs_venue") {
      return;
    }

    const query = location.query.trim();
    let isActive = true;
    const debounceId = window.setTimeout(async () => {
      if (query.length < 3) {
        setAreaSuggestions([]);
        setIsSearchingArea(false);
        return;
      }

      setIsSearchingArea(true);
      const suggestions = await searchAddressSuggestions(query);

      if (isActive) {
        setAreaSuggestions(suggestions);
        setIsSearchingArea(false);
      }
    }, query.length < 3 ? 0 : 260);

    return () => {
      isActive = false;
      window.clearTimeout(debounceId);
    };
  }, [location.mode, location.query]);

  function useCurrentLocation() {
    setLocationMessage("");

    if (!navigator.geolocation) {
      setLocationMessage("Your browser does not support current location.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const nearestArea = getNearestHomeArea(coordinates);

        onUpdate({
          context: "venue_needed",
          coordinates,
          currentLocationUsed: true,
          query: nearestArea ? `Current location near ${nearestArea.name}` : "Current location",
          selectedAddress: "",
          selectedLabel: "Current location",
          selectedVenueId: undefined,
          zones: location.zones.length
            ? normalizePlannerZones(location.zones)
            : getDefaultPlannerZones(coordinates),
        });
        setLocationMessage("Current location is now the anchor for venue matching.");
      },
      () => {
        setLocationMessage("Location permission was blocked or unavailable.");
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 },
    );
  }

  function updateAreaQuery(value: string) {
    const matchedArea = getMatchingHomeArea(value);

    onUpdate({
      context: "venue_needed",
      coordinates: matchedArea?.coordinates,
      currentLocationUsed: false,
      mapboxPlaceId: undefined,
      query: value,
      selectedAddress: "",
      selectedLabel: matchedArea ? matchedArea.name : "",
      selectedVenueId: undefined,
      zones:
        matchedArea && !location.zones.length
          ? getDefaultPlannerZones(matchedArea.coordinates)
          : normalizePlannerZones(location.zones),
    });

    if (matchedArea) {
      setLocationMessage(`${matchedArea.name} is now the anchor for venue matching.`);
    }
  }

  function selectAreaSuggestion(suggestion: GeocodingSuggestion) {
    onUpdate({
      context: "venue_needed",
      coordinates: suggestion.coordinates,
      currentLocationUsed: false,
      mapboxPlaceId: suggestion.id,
      query: suggestion.label,
      selectedAddress: "",
      selectedLabel: suggestion.label,
      selectedVenueId: undefined,
      zones: getDefaultPlannerZones(suggestion.coordinates),
    });
    setAreaSuggestions([]);
    setLocationMessage(
      suggestion.isFallback
        ? "Demo area match is now the anchor for venue matching."
        : "Map search area is now the anchor for venue matching.",
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <LocationChoiceCard
          body="Use a venue, hall, restaurant, home, or private address you already know."
          eyebrow="I know the place"
          isSelected={location.mode === "has_venue"}
          title="I have a venue"
          onClick={() => onSelectMode("has_venue")}
        />
        <LocationChoiceCard
          body="Start with a map and explore spaces that fit the event context."
          eyebrow="Help me find one"
          isSelected={location.mode === "needs_venue"}
          title="I need a venue"
          onClick={() => onSelectMode("needs_venue")}
        />
      </div>

      {location.mode === "has_venue" ? (
        <div className="rounded-[32px] border border-neutral-200 bg-[linear-gradient(135deg,#ffffff,#FFFCF7)] p-5 shadow-[0_20px_60px_rgba(13,19,33,0.06)]">
          <div className="mb-5">
            <p className="text-sm font-semibold text-neutral-950">
              Enter the venue or address
            </p>
            <p className="mt-1 text-sm leading-6 text-neutral-600">
              Arivvio will remember whether this looks like a venue or a private
              address for better matching later.
            </p>
          </div>
          <AddressAutocomplete
            label="Venue or address"
            value={location.query}
            selectedAddress={location.selectedAddress}
            selectedCoordinates={location.coordinates}
            onChange={(value) =>
              onUpdate({
                context: "",
                coordinates: undefined,
                currentLocationUsed: false,
                mapboxPlaceId: undefined,
                query: value,
                selectedAddress: "",
                selectedLabel: "",
              })
            }
            onSelect={onSelectAddress}
          />
          {location.selectedAddress ? (
            <LocationSignal
              context={location.context}
              label={location.selectedLabel}
            />
          ) : null}
        </div>
      ) : null}

      {location.mode === "needs_venue" ? (
        <div className="overflow-hidden rounded-[34px] border border-neutral-200 bg-white shadow-[0_24px_80px_rgba(13,19,33,0.1)]">
          <div className="grid min-h-[720px] xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="border-b border-neutral-200 bg-white/92 p-6 backdrop-blur xl:border-b-0 xl:border-r">
              <div>
                <p className="text-sm font-semibold text-neutral-950">
                  Venue area for {eventLabel}
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Search a city, use your current location, then draw the one
                  area where you want Arivvio to look for venues.
                </p>
              </div>
              <div className="mt-6 grid min-w-0 gap-3">
                <label className="min-w-0 text-sm font-semibold text-neutral-800">
                  Search city or area
                  <input
                    value={location.query}
                    onChange={(event) => updateAreaQuery(event.target.value)}
                    placeholder="Los Angeles, Glendale, Pasadena..."
                    className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-[#0D1321]"
                  />
                </label>
                {isSearchingArea || areaSuggestions.length ? (
                  <div className="overflow-hidden rounded-2xl border border-[#D4AF37]/16 bg-white shadow-[0_18px_44px_rgba(13,19,33,0.08)]">
                    {isSearchingArea ? (
                      <p className="px-4 py-3 text-xs font-semibold text-neutral-500">
                        Searching map areas...
                      </p>
                    ) : null}
                    {areaSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => selectAreaSuggestion(suggestion)}
                        className="block w-full border-t border-neutral-100 px-4 py-3 text-left text-sm font-semibold text-neutral-800 transition hover:bg-[#FFF8E1]"
                      >
                        {suggestion.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={useCurrentLocation}
                  className="mt-auto h-12 rounded-full bg-[#0D1321] px-5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(13,19,33,0.18)] transition hover:-translate-y-0.5 hover:bg-[#111A2E]"
                >
                  Use my current location
                </button>
              </div>
              {locationMessage ? (
                <p className="mt-3 rounded-2xl bg-[#FFFCF7] px-4 py-3 text-xs font-semibold text-neutral-600">
                  {locationMessage}
                </p>
              ) : null}
              <div className="mt-5 rounded-3xl bg-[#F6F3EA] p-4 text-xs font-semibold leading-5 text-neutral-600 ring-1 ring-[#D4AF37]/10">
                One confirmed area is saved for venue discovery. Switching between
                Circle and Freeform replaces the current area instead of stacking
                zones.
              </div>
            </div>
            <VenueDiscoveryMap
              center={mapCenter}
              zones={location.zones}
              onZonesChange={(zones) =>
                onUpdate({ zones: normalizePlannerZones(zones) })
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LocationChoiceCard({
  body,
  eyebrow,
  isSelected,
  onClick,
  title,
}: {
  body: string;
  eyebrow: string;
  isSelected: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group min-h-44 rounded-[30px] border p-5 text-left transition duration-300 hover:-translate-y-1 ${
        isSelected
          ? "border-[#0D1321] bg-[#0D1321] text-white shadow-[0_24px_70px_rgba(13,19,33,0.18)]"
          : "border-neutral-200 bg-white text-neutral-950 shadow-[0_18px_44px_rgba(13,19,33,0.05)] hover:border-neutral-400 hover:shadow-[0_24px_70px_rgba(13,19,33,0.1)]"
      }`}
    >
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          isSelected ? "bg-white/10 text-neutral-200" : "bg-[#f7f2ee] text-neutral-600"
        }`}
      >
        {eyebrow}
      </span>
      <span className="mt-8 block text-2xl font-semibold tracking-tight">
        {title}
      </span>
      <span
        className={`mt-3 block text-sm leading-6 ${
          isSelected ? "text-neutral-300" : "text-neutral-600"
        }`}
      >
        {body}
      </span>
    </button>
  );
}

function LocationSignal({
  context,
  label,
}: {
  context: EventLocation["context"];
  label: string;
}) {
  const isVenue = context !== "likely_home";

  return (
    <div className="mt-4 rounded-2xl border border-neutral-200 bg-[#FFFCF7] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">
        Address recognition
      </p>
      <p className="mt-1 text-sm font-semibold text-neutral-900">
        {getLocationContextLabel(context)}
      </p>
      <p className="mt-1 text-sm leading-6 text-neutral-600">
        {isVenue
          ? `${label} looks like a real venue. Arivvio can use this signal for future venue outreach.`
          : "This looks residential or private, so nearby mobile vendors will matter more than venue matches."}
      </p>
    </div>
  );
}

function VenueDiscoveryMap({
  center,
  zones,
  onZonesChange,
}: {
  center: Coordinates;
  zones: MapZone[];
  onZonesChange: (zones: MapZone[]) => void;
}) {
  return (
    <ZoneMapEditor
      defaultLabel="Venue search area"
      heightClassName="h-[72vh] min-h-[720px]"
      mapCenter={center}
      mapZoom={10.5}
      onZonesChange={onZonesChange}
      singleZone
      subtitle="Draw one venue search area. Circle and freeform replace each other."
      title="Venue search map"
      zones={zones}
    />
  );
}

function FinalReview({
  budget,
  guestCount,
  locations,
  preferences,
  recognition,
  selectedServices,
  stages,
  timing,
}: {
  budget: number;
  guestCount: number;
  locations: EventLocation[];
  preferences: SelectedPlanningPreference[];
  recognition: EventRecognition;
  selectedServices: ServiceName[];
  stages: EventStage[];
  timing: {
    date: string;
    endTime: string;
    startTime: string;
  };
}) {
  const eventName = recognition.identity.selectedDisplayEvent;

  return (
    <div className="space-y-5">
      <div className="rounded-[30px] border border-neutral-200 bg-[linear-gradient(135deg,#FFFCF7,#ffffff)] p-5">
        <p className="text-sm font-semibold text-neutral-500">
          Arivvio will search for
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">
          {eventName}
        </h2>
        <p className="mt-3 text-base leading-7 text-neutral-600">
          We will start with {formatNaturalList(selectedServices.map((service) => service.toLowerCase()))}.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <PlainDetail label="Date" value={timing.date || "Choose date"} />
        <PlainDetail label="Time" value={`${formatTime(timing.startTime)} - ${formatTime(timing.endTime)}`} />
        <PlainDetail label="Guests" value={guestCount.toLocaleString()} />
        <PlainDetail label="Budget" value={`$${budget.toLocaleString()}`} />
      </div>
      {stages.length ? (
        <div className="rounded-[30px] border border-neutral-200 bg-white p-5">
          <p className="text-sm font-semibold text-neutral-950">Event parts</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {stages.map((stage) => (
              <span key={stage.id} className="rounded-full bg-[#F7F4EC] px-3 py-2 text-xs font-semibold text-neutral-700">
                {stage.order}. {stage.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      <div className="rounded-[30px] border border-neutral-200 bg-white p-5">
        <p className="text-sm font-semibold text-neutral-950">Locations</p>
        <div className="mt-3 space-y-2">
          {locations.map((location) => (
            <p key={location.id} className="rounded-2xl bg-[#FFFCF7] px-4 py-3 text-sm font-semibold text-neutral-700">
              {location.kind}:{" "}
              {location.selectedLabel ||
                location.selectedAddress ||
                location.query ||
                "Flexible"}
            </p>
          ))}
        </div>
      </div>
      {preferences.length ? (
        <div className="rounded-[30px] border border-neutral-200 bg-white p-5">
          <p className="text-sm font-semibold text-neutral-950">Added details</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {preferences.map((preference) => (
              <span
                key={preference.id}
                className="rounded-full bg-[#F6F3EA] px-3 py-2 text-xs font-semibold text-neutral-700"
              >
                {preference.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PlainDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[inset_0_0_0_1px_rgba(229,229,229,1)]">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold capitalize text-neutral-950">{value}</p>
    </div>
  );
}

function TimingField({
  label,
  onChange,
  type,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  type: string;
  value: string;
}) {
  return (
    <label className="text-sm font-semibold text-neutral-800">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-neutral-300 px-4 text-sm font-semibold outline-none transition focus:border-[#0D1321]"
      />
    </label>
  );
}

function PrimaryButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-12 rounded-full bg-[#0D1321] px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#111A2E]"
    >
      {label}
    </button>
  );
}

function getInitialLocationFromSession(): EventLocation {
  const profile = loadLocationProfile();

  if (!profile) {
    return getEmptyLocation();
  }

  return locationFromProfile(profile);
}
function getEmptyLocation(): EventLocation {
  return {
    context: "",
    id: 1,
    kind: "Venue needed",
    mode: "",
    query: "",
    selectedAddress: "",
    selectedLabel: "",
    zones: [],
  };
}

function locationFromProfile(profile: LocationProfile): EventLocation {
  const mode =
    profile.locationMode === "needs_venue"
      ? "needs_venue"
      : profile.locationMode
        ? "has_venue"
        : "";

  return {
    context:
      profile.locationMode === "needs_venue"
        ? "venue_needed"
        : profile.inferredLocationType === "home_private"
          ? "likely_home"
          : profile.inferredLocationType === "venue"
            ? "likely_venue"
            : "",
    coordinates: profile.coordinates,
    currentLocationUsed: profile.currentLocationUsed,
    id: 1,
    kind: mode === "has_venue" ? "Already have venue" : "Venue needed",
    mapboxPlaceId: profile.mapboxPlaceId,
    mode,
    query: profile.label ?? profile.formattedAddress ?? "",
    selectedAddress: profile.formattedAddress ?? "",
    selectedLabel: profile.label ?? "",
    selectedVenueId: profile.selectedVenueId,
    zones: profile.zone ? [{ ...profile.zone, label: "Venue search area" }] : [],
  };
}

function buildLocationProfile(location?: EventLocation): LocationProfile {
  if (!location) {
    return {};
  }
  const zone = location.zones[0];

  return {
    coordinates: location.coordinates ?? (zone ? getZoneCenter(zone) : undefined),
    currentLocationUsed: Boolean(location.currentLocationUsed),
    formattedAddress: location.selectedAddress || location.query || undefined,
    inferredLocationType:
      location.context === "likely_home"
        ? "home_private"
        : location.context
          ? "venue"
          : undefined,
    label: location.selectedLabel || location.query || undefined,
    locationMode:
      location.mode === "needs_venue"
        ? "needs_venue"
        : location.context === "likely_home"
          ? "home_private"
          : location.mode === "has_venue"
            ? "has_venue"
            : undefined,
    mapboxPlaceId: location.mapboxPlaceId,
    searchAreaLabel: zone?.label,
    selectedVenueId: location.selectedVenueId,
    zone,
  };
}

function getDefaultPlannerZones(center = getDefaultMapCenter()): MapZone[] {
  return [
    createRadiusZone({
      center,
      id: `search-zone-${Date.now()}`,
      label: "Venue search area",
      radiusMeters: 12000,
    }),
  ];
}

function normalizePlannerZones(zones: MapZone[]) {
  const zone = zones[0];

  return zone ? [{ ...zone, label: "Venue search area" }] : [];
}

function getDefaultMapCenter(): Coordinates {
  return homeAreas[0]?.coordinates ?? { lat: 34.0522, lng: -118.2437 };
}

function getLocationContextLabel(context: EventLocation["context"]) {
  if (context === "activity_venue") {
    return "Likely activity venue";
  }

  if (context === "banquet_hall") {
    return "Likely banquet hall";
  }

  if (context === "church") {
    return "Likely church or religious venue";
  }

  if (context === "business") {
    return "Likely business or venue";
  }

  if (context === "likely_venue") {
    return "Likely venue";
  }

  return "Likely home/private address";
}

function getLocationSummary(locations: EventLocation[]) {
  return locations
    .map((location) => {
      const value =
        location.selectedLabel ||
        location.selectedAddress ||
        location.query ||
        "Flexible";
      const zoneSummary = location.zones.length
        ? ` (${summarizeMapZones(location.zones)})`
        : "";

      return `${location.kind}: ${value}${zoneSummary}`;
    })
    .join(" | ");
}

function getMatchingHomeArea(value: string) {
  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue.length < 3) {
    return undefined;
  }

  return homeAreas.find((area) =>
    area.name.toLowerCase().includes(normalizedValue),
  );
}

function getNearestHomeArea(coordinates: { lat: number; lng: number }) {
  return homeAreas
    .map((area) => ({
      area,
      distance: getDistanceMiles(coordinates, area.coordinates),
    }))
    .sort((a, b) => a.distance - b.distance)[0]?.area;
}
