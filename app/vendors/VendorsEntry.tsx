"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  allServices,
  eventTypes,
  type EventType,
  type ServiceName,
} from "../data/marketplace";
import { SearchLogoMark } from "../components/SearchLogoMark";
import {
  searchAddressSuggestions,
  type AddressSuggestion,
} from "@/lib/maps/geocoding";
import { saveLocationProfile } from "@/lib/maps/zones";

const serviceExamples = [
  "DJs",
  "Armenian DJ",
  "table rentals",
  "taco cart",
  "photographer",
  "banquet hall",
  "security",
  "wedding florist",
  "quinceañera DJ",
  "party bus",
  "bartender",
  "bounce house",
  "magician",
  "valet",
  "event cleaning",
  "portable restrooms",
  "lighting",
  "tables and chairs",
];

const loopExamples = [...serviceExamples, ...serviceExamples];

export function VendorsEntry() {
  const router = useRouter();
  const [serviceQuery, setServiceQuery] = useState("");
  const [date, setDate] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<AddressSuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [eventType, setEventType] = useState<EventType | "">("");
  const [guests, setGuests] = useState("");
  const [budget, setBudget] = useState("");
  const service = useMemo(() => inferService(serviceQuery), [serviceQuery]);

  useEffect(() => {
    const query = locationQuery.trim();
    let isActive = true;
    const debounceId = window.setTimeout(async () => {
      if (query.length < 3) {
        setSuggestions([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      const nextSuggestions = await searchAddressSuggestions(query);

      if (isActive) {
        setSuggestions(nextSuggestions);
        setIsSearching(false);
      }
    }, query.length < 3 ? 0 : 260);

    return () => {
      isActive = false;
      window.clearTimeout(debounceId);
    };
  }, [locationQuery]);

  function openMarketplace({ browseAll = false }: { browseAll?: boolean } = {}) {
    const params = new URLSearchParams({
      entryMode: browseAll ? "browse" : "service",
      locationProfile: selectedLocation ? "session" : "none",
    });

    if (!browseAll && service) {
      params.set("services", service);
    }

    if (date) {
      params.set("date", date);
    }

    if (selectedLocation) {
      params.set("lat", String(selectedLocation.coordinates.lat));
      params.set("lng", String(selectedLocation.coordinates.lng));
      params.set("location", selectedLocation.label);
      saveLocationProfile({
        coordinates: selectedLocation.coordinates,
        formattedAddress: selectedLocation.label,
        inferredLocationType:
          selectedLocation.placeType === "venue" ? "venue" : selectedLocation.placeType,
        label: selectedLocation.label,
        locationMode: selectedLocation.placeType === "venue" ? "has_venue" : "needs_venue",
        mapboxPlaceId: selectedLocation.id,
      });
    } else if (locationQuery.trim()) {
      params.set("location", locationQuery.trim());
    }

    if (eventType) {
      params.set("event", eventType);
    }

    if (guests) {
      params.set("guests", guests);
    }

    if (budget) {
      params.set("budget", budget);
    }

    router.push(`/marketplace?${params.toString()}`);
  }

  return (
    <section className="px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-5xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#8A6A16]">
          Vendors
        </p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight text-[#0D1321] sm:text-6xl">
          Looking for a specific service?
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-neutral-600 sm:text-lg">
          Browse Arivvio vendors without building a full event plan first.
        </p>
      </div>

      <div className="mx-auto mt-9 max-w-4xl rounded-[34px] border border-[#D4AF37]/16 bg-white/92 p-4 shadow-[0_28px_90px_rgba(13,19,33,0.1)] sm:p-5">
        <div className="flex min-h-[72px] items-center gap-3 rounded-[28px] border border-[#D4AF37]/18 bg-[#FFFCF7] px-4 py-3 transition focus-within:border-[#D4AF37]/55">
          <SearchLogoMark />
          <input
            value={serviceQuery}
            onChange={(event) => setServiceQuery(event.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="DJ, taco cart, tables, photographer..."
            className="h-12 min-w-0 flex-1 bg-transparent text-lg font-semibold text-neutral-950 outline-none placeholder:text-neutral-400 sm:text-xl"
          />
          <button
            type="button"
            onClick={() => openMarketplace()}
            disabled={!service}
            className="h-12 rounded-full bg-[#0D1321] px-5 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(13,19,33,0.16)] transition hover:-translate-y-0.5 hover:bg-[#111A2E] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 sm:px-7"
          >
            Find vendors
          </button>
        </div>

        {isFocused ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {allServices
              .filter((option) =>
                option.toLowerCase().includes(serviceQuery.trim().toLowerCase()),
              )
              .slice(0, 8)
              .map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setServiceQuery(option)}
                  className="rounded-full border border-[#D4AF37]/18 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:-translate-y-0.5 hover:border-[#D4AF37]/60"
                >
                  {option}
                </button>
              ))}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-neutral-800">
            Date
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-[#D4AF37]/18 bg-white px-4 text-sm font-semibold outline-none transition focus:border-[#D4AF37]"
            />
          </label>
          <label className="relative text-sm font-semibold text-neutral-800">
            Location or area
            <input
              value={locationQuery}
              onChange={(event) => {
                setLocationQuery(event.target.value);
                setSelectedLocation(null);
              }}
              placeholder="Los Angeles, Pasadena, Glendale..."
              className="mt-2 h-12 w-full rounded-2xl border border-[#D4AF37]/18 bg-white px-4 text-sm font-semibold outline-none transition focus:border-[#D4AF37]"
            />
            {isSearching || suggestions.length ? (
              <div className="absolute left-0 right-0 top-[74px] z-20 overflow-hidden rounded-2xl border border-[#D4AF37]/16 bg-white p-2 shadow-[0_22px_70px_rgba(13,19,33,0.14)]">
                {isSearching ? (
                  <p className="px-3 py-3 text-xs font-semibold text-neutral-500">
                    Finding areas...
                  </p>
                ) : null}
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => {
                      setSelectedLocation(suggestion);
                      setLocationQuery(suggestion.label);
                      setSuggestions([]);
                    }}
                    className="block w-full rounded-xl px-3 py-3 text-left text-sm font-semibold text-neutral-800 transition hover:bg-[#FFF8E1]"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            ) : null}
          </label>
          <label className="text-sm font-semibold text-neutral-800">
            Event type optional
            <select
              value={eventType}
              onChange={(event) => setEventType(event.target.value as EventType | "")}
              className="mt-2 h-12 w-full rounded-2xl border border-[#D4AF37]/18 bg-white px-4 text-sm font-semibold outline-none transition focus:border-[#D4AF37]"
            >
              <option value="">Not sure yet</option>
              {eventTypes.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-neutral-800">
              Guests optional
              <input
                type="number"
                value={guests}
                onChange={(event) => setGuests(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-[#D4AF37]/18 bg-white px-4 text-sm font-semibold outline-none transition focus:border-[#D4AF37]"
              />
            </label>
            <label className="text-sm font-semibold text-neutral-800">
              Budget optional
              <input
                type="number"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-[#D4AF37]/18 bg-white px-4 text-sm font-semibold outline-none transition focus:border-[#D4AF37]"
              />
            </label>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => openMarketplace({ browseAll: true })}
            className="h-12 rounded-full border border-[#D4AF37]/20 bg-white px-5 text-sm font-semibold text-neutral-950 transition hover:-translate-y-0.5 hover:border-[#D4AF37]/60"
          >
            Browse all vendors
          </button>
          <a
            href="/plan"
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#FFF8E1] px-5 text-sm font-semibold text-[#8A6A16] ring-1 ring-[#D4AF37]/18 transition hover:-translate-y-0.5"
          >
            Turn this into an event plan
          </a>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-5xl overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <div className="flex w-max animate-[eventLoop_38s_linear_infinite] gap-2">
          {loopExamples.map((example, index) => (
            <button
              key={`${example}-${index}`}
              type="button"
              onClick={() => setServiceQuery(example)}
              className="rounded-full border border-[#D4AF37]/16 bg-white/72 px-4 py-2 text-sm font-semibold text-neutral-700 backdrop-blur transition hover:-translate-y-0.5 hover:border-[#D4AF37]/50 hover:text-[#0D1321]"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function inferService(value: string): ServiceName | null {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  const aliasMatch = serviceAliases.find((alias) =>
    alias.terms.some((term) => normalized.includes(term)),
  );

  if (aliasMatch) {
    return aliasMatch.service;
  }

  return (
    allServices.find((service) => service.toLowerCase() === normalized) ??
    allServices.find((service) => service.toLowerCase().includes(normalized)) ??
    null
  );
}

const serviceAliases: Array<{ service: ServiceName; terms: string[] }> = [
  { service: "DJ", terms: ["dj", "djs", "disc jockey"] },
  { service: "Catering", terms: ["cater", "food", "taco", "tacos", "cart"] },
  { service: "Rentals", terms: ["table", "tables", "chair", "chairs", "tent", "rental"] },
  { service: "Photography", terms: ["photo", "photographer", "photography"] },
  { service: "Venue", terms: ["venue", "hall", "banquet"] },
  { service: "Security", terms: ["security", "guard"] },
  { service: "Florals", terms: ["florist", "flower", "flowers", "floral"] },
  { service: "Party Bus", terms: ["party bus", "bus"] },
  { service: "Bartending", terms: ["bartender", "bar"] },
  { service: "Bounce Houses", terms: ["bounce", "inflatable"] },
  { service: "Magic", terms: ["magic", "magician"] },
  { service: "Valet", terms: ["valet", "parking"] },
  { service: "Cleaning", terms: ["cleaning", "cleanup"] },
  { service: "Portable Restrooms", terms: ["portable restroom", "restroom", "porta"] },
  { service: "Photo Booth", terms: ["photo booth", "photobooth"] },
];
