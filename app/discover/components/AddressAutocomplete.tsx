"use client";

import { useEffect, useState } from "react";
import {
  searchAddressSuggestions,
  type AddressSuggestion as GeocodingSuggestion,
} from "@/lib/maps/geocoding";
import type { Coordinates } from "@/app/data/marketplace";
import { LocationPreviewMap } from "@/app/components/maps/LocationPreviewMap";

export type AddressSuggestion = GeocodingSuggestion & {
  address: string;
  context:
    | "activity_venue"
    | "banquet_hall"
    | "business"
    | "church"
    | "likely_home"
    | "likely_venue";
  neighborhood: string;
};

type AddressAutocompleteProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  selectedAddress?: string;
  selectedCoordinates?: Coordinates;
};

export function AddressAutocomplete({
  label,
  onChange,
  onSelect,
  selectedAddress,
  selectedCoordinates,
  value,
}: AddressAutocompleteProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);

  useEffect(() => {
    const query = value.trim();

    let isActive = true;
    const debounceId = window.setTimeout(async () => {
      if (query.length < 3) {
        if (isActive) {
          setSuggestions([]);
          setIsSearching(false);
        }
        return;
      }

      setIsSearching(true);
      const nextSuggestions = await searchAddressSuggestions(query);

      if (isActive) {
        setSuggestions(nextSuggestions.map(normalizeSuggestion));
        setIsSearching(false);
      }
    }, query.length < 3 ? 0 : 240);

    return () => {
      isActive = false;
      window.clearTimeout(debounceId);
    };
  }, [value]);

  return (
    <div className="relative">
      <label className="text-sm font-semibold text-neutral-800">
        {label}
        <input
          value={value}
          onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Start typing a venue or address"
          className="mt-2 h-14 w-full rounded-[22px] border border-neutral-200 bg-white px-4 text-sm font-semibold outline-none shadow-[0_12px_34px_rgba(13,19,33,0.05)] transition focus:border-[#0D1321]"
        />
      </label>

      {isFocused && (isSearching || suggestions.length) ? (
        <div className="absolute left-0 right-0 top-[76px] z-30 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 shadow-[0_22px_70px_rgba(13,19,33,0.16)]">
          {isSearching ? (
            <p className="px-3 py-3 text-xs font-semibold text-neutral-500">
              Finding address matches...
            </p>
          ) : null}
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(suggestion)}
              className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition hover:-translate-y-0.5 hover:bg-[#F6F3EA]"
            >
              <span>
                <span className="block text-sm font-semibold text-neutral-950">
                  {suggestion.label}
                </span>
                <span className="mt-1 block text-xs text-neutral-500">
                  {suggestion.address}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-[#0D1321] px-3 py-1 text-xs font-semibold text-white">
                Use
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {selectedAddress ? (
        <div className="mt-4 rounded-[24px] border border-neutral-200 bg-white p-4 shadow-[0_18px_48px_rgba(13,19,33,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">
            Selected address
          </p>
          <p className="mt-1 text-sm font-semibold text-neutral-800">
            {selectedAddress}
          </p>
          <p className="mt-1 text-xs font-semibold text-neutral-500">
            This location is now the event anchor for nearby matching.
          </p>
          <div className="relative mt-3 h-48 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#e9eee8,#f7f3ed)]">
            <LocationPreviewMap
              coordinates={selectedCoordinates}
              label={suggestionLabelForSelected(selectedAddress)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function suggestionLabelForSelected(value: string) {
  return value.split(",")[0] ?? "Selected location";
}

function normalizeSuggestion(suggestion: GeocodingSuggestion): AddressSuggestion {
  return {
    ...suggestion,
    address: suggestion.label,
    context: getAddressContext(suggestion),
    neighborhood: suggestion.label.split(",").at(-2)?.trim() ?? suggestion.label,
  };
}

function getAddressContext(suggestion: GeocodingSuggestion): AddressSuggestion["context"] {
  const label = suggestion.label.toLowerCase();

  if (/\b(church|cathedral|temple|mosque|synagogue|chapel)\b/.test(label)) {
    return "church";
  }

  if (/\b(banquet|ballroom|hall|reception|events?|venue)\b/.test(label)) {
    return "banquet_hall";
  }

  if (/\b(raceway|arcade|bowling|trampoline|laser tag|escape room|play|jungle)\b/.test(label)) {
    return "activity_venue";
  }

  if (suggestion.placeType === "venue") {
    return "business";
  }

  return "likely_home";
}
