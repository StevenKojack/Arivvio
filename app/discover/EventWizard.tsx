"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  allServices,
  getHoursBetween,
  getDistanceMiles,
  homeAreas,
  type Coordinates,
  type ServiceName,
} from "../data/marketplace";
import {
  recognizeEventIntent,
  searchEventIntents,
} from "@/lib/event-intelligence/search";
import {
  derivePlanningContext,
  getContextDetails,
  getContextServices,
} from "@/lib/event-intelligence/context";
import { AddressAutocomplete, type AddressSuggestion } from "./components/AddressAutocomplete";
import {
  ZoneMapEditor,
  summarizeMapZones,
  type MapZone,
} from "../components/maps/ZoneMapEditor";
import { CalendarPicker } from "./components/CalendarPicker";
import { ServiceRecommendationCard } from "./components/ServiceRecommendationCard";
import { StepCard } from "./components/StepCard";
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
  query: string;
  selectedAddress: string;
  selectedLabel: string;
  selectedVenueId?: string;
  zones: MapZone[];
};

type PlanAddition = {
  id: string;
  kind: "Culture/style" | "Service" | "Venue style" | "Note";
  label: string;
  service?: ServiceName;
};

const steps = ["What", "Confirm", "When", "Where", "Guests", "Review"] as const;

export function EventWizard() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("query") ?? "";
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
  const [locations, setLocations] = useState<EventLocation[]>([
    {
      context: "",
      id: 1,
      kind: "Venue needed",
      mode: "",
      query: "",
      selectedAddress: "",
      selectedLabel: "",
      zones: [],
    },
  ]);
  const [guestCount, setGuestCount] = useState(60);
  const [budget, setBudget] = useState(6000);
  const [customNote, setCustomNote] = useState("");
  const [planAdditions, setPlanAdditions] = useState<PlanAddition[]>([]);
  const [selectedServices, setSelectedServices] = useState<ServiceName[]>(
    () => recognizeEventIntent(initialQuery || "Private party").recommendedServices,
  );
  const recognition = useMemo(
    () => recognizeEventIntent(query || "Private party"),
    [query],
  );
  const planningNotes = useMemo(
    () =>
      [
        ...planAdditions.map((addition) => addition.label),
        customNote.trim(),
      ]
        .filter(Boolean)
        .join(", "),
    [customNote, planAdditions],
  );
  const planningContext = useMemo(
    () =>
      derivePlanningContext({
        budget,
        eventLabel: query,
        locationContext: locations[0]?.context,
        locationText: getLocationSummary(locations),
        notes: planningNotes,
      }),
    [budget, locations, planningNotes, query],
  );
  const suggestions = useMemo(() => searchEventIntents(query, 5), [query]);
  const contextualServices = useMemo(
    () => getContextServices(planningContext),
    [planningContext],
  );
  const visibleServices = mergeServices(selectedServices, contextualServices).filter(
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
      event: profile.marketplaceEventType ?? "Private Party",
      guests: String(guestCount),
      location: locationSummary,
      services: visibleServices.join(","),
      time: timing.startTime,
    });

    if (planningNotes) {
      params.set("notes", planningNotes);
    }

    if (eventAnchor) {
      params.set("lat", String(eventAnchor.lat));
      params.set("lng", String(eventAnchor.lng));
      params.set("locationContext", locations[0]?.context || "venue_needed");
    }

    const primaryZone = locations[0]?.zones.find((zone) => zone.type === "radius");
    if (primaryZone?.radiusPct) {
      params.set("searchRadiusMiles", String(Math.round(primaryZone.radiusPct * 0.75)));
    }

    return `/marketplace?${params.toString()}`;
  }, [
    budget,
    durationHours,
    eventAnchor,
    guestCount,
    locationSummary,
    locations,
    planningNotes,
    recognition.profile,
    timing.date,
    timing.startTime,
    visibleServices,
  ]);
  const canOpenMarketplace =
    Boolean(timing.date && timing.startTime && timing.endTime) &&
    guestCount > 0 &&
    locations.some((location) => location.mode && (location.mode === "needs_venue" || Boolean(location.query.trim() || location.selectedAddress)));

  function continueFromSearch(nextQuery = query) {
    const cleanQuery = nextQuery.trim();

    if (!cleanQuery) {
      return;
    }

    setQuery(cleanQuery);
    setSelectedServices(recognizeEventIntent(cleanQuery).recommendedServices);
    setStep(1);
  }

  function toggleService(service: ServiceName) {
    setSelectedServices((current) =>
      current.includes(service)
        ? current.filter((item) => item !== service)
        : [...current, service],
    );
  }

  function addService(service: ServiceName) {
    setSelectedServices((current) =>
      current.includes(service) ? current : [...current, service],
    );
  }

  function addCustomNoteToPlan() {
    const additions = parsePlanAdditions(customNote);
    const nextAdditions: PlanAddition[] =
      additions.length > 0
        ? additions
        : [
            {
              id: `note-${normalizeId(customNote)}`,
              kind: "Note" as const,
              label: customNote.trim(),
            },
          ].filter((addition) => addition.label);

    if (!nextAdditions.length) {
      return;
    }

    setPlanAdditions((current) => mergeAdditions(current, nextAdditions));
    nextAdditions.forEach((addition) => {
      if (addition.service) {
        addService(addition.service);
      }
    });
    setCustomNote("");
  }

  function removePlanAddition(addition: PlanAddition) {
    setPlanAdditions((current) => current.filter((item) => item.id !== addition.id));

    if (addition.service && !recognition.recommendedServices.includes(addition.service)) {
      setSelectedServices((current) =>
        current.filter((service) => service !== addition.service),
      );
    }
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
          step === 3 ? "max-w-7xl" : "max-w-5xl"
        }`}
      >
        <StepRail
          canVisitStep={canVisitStep}
          currentStep={step}
          onStepChange={setStep}
        />
        <div className="mt-8 overflow-visible rounded-[34px] border border-neutral-200 bg-white shadow-[0_28px_90px_rgba(20,20,20,0.08)]">
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
                  className="h-12 rounded-full bg-neutral-950 px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
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
              title={getConfirmationTitle(recognition)}
              body={getConfirmationBody(recognition)}
              action={<PrimaryButton label="Looks right" onClick={() => setStep(2)} />}
            >
              <UnderstandingCard
                additions={planAdditions}
                customNote={customNote}
                planningContext={planningContext}
                recognition={recognition}
                selectedServices={selectedServices}
                onAddCustomNote={addCustomNoteToPlan}
                onAddService={addService}
                onCustomNoteChange={setCustomNote}
                onRemoveAddition={removePlanAddition}
                onToggleService={toggleService}
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
                className="mt-5 rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:-translate-y-0.5 hover:border-neutral-950"
              >
                {showAdvancedTiming ? "Hide advanced timing" : "Advanced timing"}
              </button>
              {showAdvancedTiming ? (
                <div className="mt-4 grid gap-4 rounded-[24px] border border-neutral-200 bg-[#fbfbfa] p-4 md:grid-cols-2">
                  <label className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-neutral-800">
                    Multi-day event
                    <input
                      type="checkbox"
                      checked={isMultiDay}
                      onChange={(event) => setIsMultiDay(event.target.checked)}
                      className="h-5 w-5 accent-neutral-950"
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
                  recognition.preservedSubtype ??
                  recognition.profile.subtype ??
                  recognition.profile.primaryType
                }
                location={locations[0]}
                onSelectAddress={(suggestion) =>
                  updateLocation(locations[0].id, {
                    context: suggestion.context,
                    coordinates: suggestion.coordinates,
                    kind: "Already have venue",
                    mode: "has_venue",
                    query: suggestion.label,
                    selectedAddress: suggestion.address,
                    selectedLabel: suggestion.label,
                    zones: [],
                  })
                }
                onSelectMode={(mode) =>
                  updateLocation(locations[0].id, {
                    context: mode === "needs_venue" ? "venue_needed" : "",
                    kind: mode === "needs_venue" ? "Venue needed" : "Already have venue",
                    mode,
                    query: "",
                    selectedAddress: "",
                    selectedLabel: "",
                    selectedVenueId: undefined,
                    zones: mode === "needs_venue" ? getDefaultPlannerZones() : [],
                  })
                }
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
                          ? "border-neutral-950 bg-neutral-950 text-white"
                          : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-950"
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
                  className="w-full accent-neutral-950"
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
                      className="inline-flex h-12 items-center justify-center rounded-full bg-neutral-950 px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-neutral-800"
                    >
                      Browse matches
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="h-12 rounded-full bg-neutral-950 px-6 text-sm font-semibold text-white opacity-40"
                    >
                      Add date and location first
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="h-12 rounded-full border border-neutral-300 bg-white px-6 text-sm font-semibold text-neutral-950 transition hover:-translate-y-0.5 hover:border-neutral-950"
                  >
                    Edit details
                  </button>
                </div>
              }
            >
              <FinalReview
                additions={planAdditions}
                budget={budget}
                guestCount={guestCount}
                locations={locations}
                recognition={recognition}
                selectedServices={visibleServices}
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
                ? "border-neutral-950 bg-neutral-950 text-white shadow-[0_14px_34px_rgba(20,20,20,0.16)]"
                : currentStep > index
                  ? "border-neutral-200 bg-white text-neutral-800 hover:-translate-y-0.5 hover:border-neutral-950"
                  : isAvailable
                    ? "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-400"
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
        className="h-14 w-full rounded-full border border-neutral-300 px-5 text-lg font-semibold outline-none transition focus:border-neutral-950"
      />
      <div className="mt-4 overflow-hidden rounded-[28px] border border-neutral-200 bg-[#fbfbfa] p-2">
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

function UnderstandingCard({
  additions,
  customNote,
  onAddCustomNote,
  onAddService,
  onCustomNoteChange,
  onRemoveAddition,
  onToggleService,
  planningContext,
  recognition,
  selectedServices,
}: {
  additions: PlanAddition[];
  customNote: string;
  onAddCustomNote: () => void;
  onAddService: (service: ServiceName) => void;
  onCustomNoteChange: (value: string) => void;
  onRemoveAddition: (addition: PlanAddition) => void;
  onToggleService: (service: ServiceName) => void;
  planningContext: ReturnType<typeof derivePlanningContext>;
  recognition: ReturnType<typeof recognizeEventIntent>;
  selectedServices: ServiceName[];
}) {
  const profile = recognition.profile;
  const [isEditing, setIsEditing] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const visibleServices = selectedServices.filter(
    (service) => !recognition.excludedServices.includes(service),
  );
  const addableServices = allServices.filter(
    (service) =>
      !visibleServices.includes(service) &&
      !recognition.excludedServices.includes(service) &&
      (!serviceSearch ||
        service.toLowerCase().includes(serviceSearch.trim().toLowerCase())),
  );
  const contextDetails = getContextDetails(planningContext);

  return (
    <div className="space-y-5">
      <div className="rounded-[30px] border border-neutral-200 bg-[linear-gradient(135deg,#fbfbfa,#ffffff)] p-5">
        <p className="text-sm font-semibold text-neutral-500">
          Looks like you are planning
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">
          {recognition.preservedSubtype ?? profile.subtype ?? profile.primaryType}
        </h2>
        <p className="mt-3 text-base leading-7 text-neutral-600">
          {getConfirmationBody(recognition)}
        </p>
        {contextDetails.length ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {contextDetails.map(([label, value]) => (
              <PlainDetail key={label} label={label} value={value} />
            ))}
          </div>
        ) : null}
      </div>

      <div className="rounded-[30px] border border-neutral-200 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-neutral-950">
              We will start with
            </p>
            <p className="mt-1 text-sm text-neutral-600">
              Add or remove only what matters now.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsEditing((current) => !current)}
            className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:-translate-y-0.5 hover:border-neutral-950"
          >
            {isEditing ? "Done" : "Edit details"}
          </button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {visibleServices.map((service) => (
            <ServiceRecommendationCard
              key={service}
              service={service}
              isSelected
              onToggle={onToggleService}
            />
          ))}
        </div>
      </div>

      {isEditing ? (
        <div className="rounded-[30px] border border-neutral-200 bg-white p-5 shadow-[0_18px_50px_rgba(20,20,20,0.06)]">
          <label className="block text-sm font-semibold text-neutral-800">
            Add a service
            <input
              value={serviceSearch}
              onChange={(event) => setServiceSearch(event.target.value)}
              placeholder="Search services"
              className="mt-2 h-12 w-full rounded-2xl border border-neutral-300 px-4 text-sm font-semibold outline-none transition focus:border-neutral-950"
            />
          </label>
          <div className="mt-3 grid max-h-56 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {addableServices.slice(0, 8).map((service) => (
              <ServiceRecommendationCard
                key={service}
                service={service}
                isSelected={false}
                onToggle={onAddService}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-[30px] border border-neutral-200 bg-[#fbfbfa] p-5">
        <label className="block text-sm font-semibold text-neutral-800">
          Want to add anything?
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              value={customNote}
              onChange={(event) => onCustomNoteChange(event.target.value)}
              placeholder="Tell us anything that matters: age, culture, food style, activities, guests, vibe, traditions..."
              className="h-12 flex-1 rounded-2xl border border-neutral-300 bg-white px-4 text-sm font-semibold outline-none transition focus:border-neutral-950"
            />
            <button
              type="button"
              onClick={onAddCustomNote}
              disabled={!customNote.trim()}
              className="h-12 rounded-full bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add to plan
            </button>
          </div>
        </label>
        {additions.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {additions.map((addition) => (
              <button
                key={addition.id}
                type="button"
                onClick={() => onRemoveAddition(addition)}
                className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:-translate-y-0.5 hover:border-neutral-950"
              >
                {addition.kind}: {addition.label} x
              </button>
            ))}
          </div>
        ) : null}
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
  const matchedArea = getMatchingHomeArea(location.query);
  const mapCenter = location.coordinates ?? matchedArea?.coordinates ?? getDefaultMapCenter();

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
          query: nearestArea ? `Current location near ${nearestArea.name}` : "Current location",
          selectedAddress: "",
          selectedLabel: "Current location",
          selectedVenueId: undefined,
          zones: location.zones.length
            ? normalizePlannerZones(location.zones)
            : getDefaultPlannerZones(),
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
      query: value,
      selectedAddress: "",
      selectedLabel: matchedArea ? matchedArea.name : "",
      selectedVenueId: undefined,
      zones:
        matchedArea && !location.zones.length
          ? getDefaultPlannerZones()
          : normalizePlannerZones(location.zones),
    });

    if (matchedArea) {
      setLocationMessage(`${matchedArea.name} is now the anchor for venue matching.`);
    }
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
        <div className="rounded-[32px] border border-neutral-200 bg-[linear-gradient(135deg,#ffffff,#fbfbfa)] p-5 shadow-[0_20px_60px_rgba(20,20,20,0.06)]">
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
            onChange={(value) =>
              onUpdate({
                context: "",
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
        <div className="overflow-hidden rounded-[34px] border border-neutral-200 bg-white shadow-[0_24px_80px_rgba(20,20,20,0.1)]">
          <div className="border-b border-neutral-200 bg-white/90 p-5 backdrop-blur">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-xl">
                <p className="text-sm font-semibold text-neutral-950">
                  Venue area for {eventLabel}
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Search a city, use your current location, then draw the one
                  area where you want Arivvio to look for venues.
                </p>
              </div>
              <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] xl:min-w-[520px]">
                <label className="min-w-0 text-sm font-semibold text-neutral-800">
                  Search city or area
                  <input
                    value={location.query}
                    onChange={(event) => updateAreaQuery(event.target.value)}
                    placeholder="Los Angeles, Glendale, Pasadena..."
                    className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-neutral-950"
                  />
                </label>
                <button
                  type="button"
                  onClick={useCurrentLocation}
                  className="mt-auto h-12 rounded-full bg-neutral-950 px-5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(20,20,20,0.18)] transition hover:-translate-y-0.5 hover:bg-neutral-800"
                >
                  Use my current location
                </button>
              </div>
            </div>
              {locationMessage ? (
                <p className="mt-3 rounded-2xl bg-[#fbfbfa] px-4 py-3 text-xs font-semibold text-neutral-600">
                  {locationMessage}
                </p>
              ) : null}
          </div>
          <VenueDiscoveryMap
            center={mapCenter}
            zones={location.zones}
            onZonesChange={(zones) =>
              onUpdate({ zones: normalizePlannerZones(zones) })
            }
          />
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
          ? "border-neutral-950 bg-neutral-950 text-white shadow-[0_24px_70px_rgba(20,20,20,0.18)]"
          : "border-neutral-200 bg-white text-neutral-950 shadow-[0_18px_44px_rgba(20,20,20,0.05)] hover:border-neutral-400 hover:shadow-[0_24px_70px_rgba(20,20,20,0.1)]"
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
    <div className="mt-4 rounded-2xl border border-neutral-200 bg-[#fbfbfa] px-4 py-3">
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
      heightClassName="h-[64vh] min-h-[600px] max-h-[820px]"
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
  additions,
  budget,
  guestCount,
  locations,
  recognition,
  selectedServices,
  timing,
}: {
  additions: PlanAddition[];
  budget: number;
  guestCount: number;
  locations: EventLocation[];
  recognition: ReturnType<typeof recognizeEventIntent>;
  selectedServices: ServiceName[];
  timing: {
    date: string;
    endTime: string;
    startTime: string;
  };
}) {
  const eventName =
    recognition.preservedSubtype ??
    recognition.profile.subtype ??
    recognition.profile.primaryType;

  return (
    <div className="space-y-5">
      <div className="rounded-[30px] border border-neutral-200 bg-[linear-gradient(135deg,#fbfbfa,#ffffff)] p-5">
        <p className="text-sm font-semibold text-neutral-500">
          Arivvio will search for
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">
          {eventName}
        </h2>
        <p className="mt-3 text-base leading-7 text-neutral-600">
          We will start with {toFriendlyNeeds(selectedServices)}.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <PlainDetail label="Date" value={timing.date || "Choose date"} />
        <PlainDetail label="Time" value={`${formatTime(timing.startTime)} - ${formatTime(timing.endTime)}`} />
        <PlainDetail label="Guests" value={guestCount.toLocaleString()} />
        <PlainDetail label="Budget" value={`$${budget.toLocaleString()}`} />
      </div>
      <div className="rounded-[30px] border border-neutral-200 bg-white p-5">
        <p className="text-sm font-semibold text-neutral-950">Locations</p>
        <div className="mt-3 space-y-2">
          {locations.map((location) => (
            <p key={location.id} className="rounded-2xl bg-[#fbfbfa] px-4 py-3 text-sm font-semibold text-neutral-700">
              {location.kind}:{" "}
              {location.selectedLabel ||
                location.selectedAddress ||
                location.query ||
                "Flexible"}
            </p>
          ))}
        </div>
      </div>
      {additions.length ? (
        <div className="rounded-[30px] border border-neutral-200 bg-white p-5">
          <p className="text-sm font-semibold text-neutral-950">Added details</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {additions.map((addition) => (
              <span
                key={addition.id}
                className="rounded-full bg-[#f7f7f5] px-3 py-2 text-xs font-semibold text-neutral-700"
              >
                {addition.label}
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
        className="mt-2 h-12 w-full rounded-2xl border border-neutral-300 px-4 text-sm font-semibold outline-none transition focus:border-neutral-950"
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
      className="h-12 rounded-full bg-neutral-950 px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-neutral-800"
    >
      {label}
    </button>
  );
}

function parsePlanAdditions(value: string): PlanAddition[] {
  const text = value.toLowerCase();
  const additions: PlanAddition[] = [];
  const context = derivePlanningContext({
    eventLabel: text,
    notes: text,
  });
  const cultures = [
    "armenian",
    "mexican",
    "persian",
    "filipino",
    "korean",
    "japanese",
    "indian",
    "jewish",
    "latin",
  ];
  const detectedCulture = cultures.find((culture) => text.includes(culture));

  if (detectedCulture) {
    additions.push({
      id: `culture-${detectedCulture}`,
      kind: "Culture/style",
      label: capitalize(detectedCulture),
    });
  }

  addServiceMatch(additions, text, ["dj", "disc jockey"], detectedCulture ? `${capitalize(detectedCulture)} DJ` : "DJ", "DJ");
  addServiceMatch(additions, text, ["catering", "caterer", "food"], detectedCulture ? `${capitalize(detectedCulture)} catering` : "Catering", "Catering");
  addServiceMatch(additions, text, ["security", "guard"], "Security", "Security");
  addServiceMatch(additions, text, ["porta potties", "portable restroom", "restrooms", "bathrooms"], "Portable restrooms", "Portable Restrooms");
  addServiceMatch(additions, text, ["photographer", "photography", "photo coverage"], "Photography", "Photography");
  addServiceMatch(additions, text, ["live band", "live music", "band"], "Live Music", "Live Music");
  addServiceMatch(additions, text, ["photo booth", "photobooth"], "Photo Booth", "Photo Booth");
  addServiceMatch(additions, text, ["flowers", "florals"], "Florals", "Florals");
  addServiceMatch(additions, text, ["cake", "dessert"], "Cake & Desserts", "Cake & Desserts");
  addServiceMatch(additions, text, ["bounce house", "bounce houses", "inflatable"], "Bounce houses", "Bounce Houses");
  addServiceMatch(additions, text, ["party bus", "limo", "transportation", "shuttle"], "Transportation", "Transportation");
  addServiceMatch(additions, text, ["tables", "chairs", "tent", "shade", "rentals"], "Rentals", "Rentals");
  addServiceMatch(additions, text, ["cleanup", "cleaning"], "Cleaning", "Cleaning");

  getContextServices(context).forEach((service) => {
    additions.push({
      id: `service-${normalizeId(service)}`,
      kind: "Service",
      label: service,
      service,
    });
  });

  if (text.includes("banquet hall")) {
    additions.push({
      id: "venue-style-banquet-hall",
      kind: "Venue style",
      label: "Banquet Hall",
    });
    additions.push({
      id: "service-venue",
      kind: "Service",
      label: "Venue",
      service: "Venue",
    });
  } else if (text.includes("venue") || text.includes("hall")) {
    additions.push({
      id: "service-venue",
      kind: "Service",
      label: "Venue",
      service: "Venue",
    });
  }

  return mergeAdditions([], additions);
}

function addServiceMatch(
  additions: PlanAddition[],
  text: string,
  terms: string[],
  label: string,
  service: ServiceName,
) {
  if (terms.some((term) => text.includes(term))) {
    additions.push({
      id: `service-${normalizeId(label)}`,
      kind: "Service",
      label,
      service,
    });
  }
}

function mergeAdditions(current: PlanAddition[], incoming: PlanAddition[]) {
  const additions = [...current];

  incoming.forEach((addition) => {
    if (!additions.some((item) => item.id === addition.id)) {
      additions.push(addition);
    }
  });

  return additions;
}

function mergeServices(
  current: ServiceName[],
  incoming: ServiceName[],
) {
  return Array.from(new Set([...current, ...incoming]));
}

function getDefaultPlannerZones(): MapZone[] {
  return [
    {
      center: { x: 50, y: 50 },
      id: `search-zone-${Date.now()}`,
      label: "Venue search area",
      radiusPct: 26,
      type: "radius",
    },
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

function getConfirmationTitle(recognition: ReturnType<typeof recognizeEventIntent>) {
  const label =
    recognition.preservedSubtype ??
    recognition.profile.subtype ??
    recognition.profile.primaryType.toLowerCase();

  return `Looks like ${startsWithVowel(label) ? "an" : "a"} ${label}.`;
}

function getConfirmationBody(recognition: ReturnType<typeof recognizeEventIntent>) {
  const profile = recognition.profile;
  const services = toFriendlyNeeds(profile.likelyNeeds ?? recognition.recommendedServices);

  if (profile.id === "pool-party") {
    return "We will start with food, rentals, drinks, shade, lighting, cleanup, and optional lifeguards.";
  }

  if (profile.id === "bachelor-party") {
    return "We will start with venues, transportation, food and drinks, entertainment, and late-night options.";
  }

  if (profile.id === "funeral") {
    return "We will focus on venues, catering, flowers, printed programs, transportation, and livestreaming.";
  }

  if (
    (recognition.preservedSubtype ?? profile.subtype ?? "")
      .toLowerCase()
      .includes("sweet")
  ) {
    return "We will start with DJ, cake, decor, photo booth, photographer, and rentals.";
  }

  return `We will help you find ${services}.`;
}

function toFriendlyNeeds(needs: string[]) {
  const visibleNeeds = needs.slice(0, 7).map((need) => need.toLowerCase());

  if (visibleNeeds.length <= 1) {
    return visibleNeeds[0] ?? "the right vendors";
  }

  return `${visibleNeeds.slice(0, -1).join(", ")}, and ${visibleNeeds.at(-1)}`;
}

function startsWithVowel(value: string) {
  return /^[aeiou]/i.test(value.trim());
}

function normalizeId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
