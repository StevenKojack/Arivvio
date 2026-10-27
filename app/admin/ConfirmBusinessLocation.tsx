"use client";
import { useState } from "react";
import {
  searchPermanentAddresses,
  type AddressSuggestion,
} from "@/lib/maps/geocoding";
import { confirmedMapMatch } from "@/lib/acquisition/activation";
import { activationOperation } from "@/lib/repositories/acquisitionRepository";
import dynamic from "next/dynamic";
const LocationPreviewMap = dynamic(
  () =>
    import("@/app/components/maps/LocationPreviewMap").then(
      (m) => m.LocationPreviewMap,
    ),
  { ssr: false },
);
import type { ListingRecord } from "@/lib/repositories/listingsRepository";
export function ConfirmBusinessLocation({
  business,
  onSaved,
}: {
  business: ListingRecord;
  onSaved: () => void;
}) {
  const [query, setQuery] = useState(
      `${business.base_address ?? ""}, ${business.service_area_city ?? ""}`,
    ),
    [matches, setMatches] = useState<AddressSuggestion[]>([]),
    [selected, setSelected] = useState<AddressSuggestion | null>(null),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function search() {
    setBusy(true);
    setMessage("");
    setSelected(null);
    setConfirmed(false);
    try {
      const rows = await searchPermanentAddresses(query);
      setMatches(rows);
      if (!rows.length)
        setMessage("No exact address candidates. Leave coordinates unknown.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!selected || !confirmedMapMatch(selected, confirmed)) return;
    setBusy(true);
    try {
      await activationOperation("confirm_map", {
        vendor_id: business.id,
        address: business.base_address,
        feature_id: selected.id,
        matched_address: selected.label,
        latitude: selected.coordinates.lat,
        longitude: selected.coordinates.lng,
        confirmed: true,
        fixed_location: true,
        is_fallback: false,
        place_type: selected.placeType,
        permanent: true,
      });
      setMessage("Map location confirmed.");
      setConfirmed(false);
      onSaved();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="my-3 rounded-lg border ui-border p-3">
      <summary>Confirm map location</summary>
      <p className="my-3 text-sm">
        Only confirm a fixed public business location. Traveling providers can
        keep their operating city without a pin. Address searches use Mapbox
        permanent geocoding.
      </p>
      <p className="text-sm">
        Public address:{" "}
        {business.base_address ||
          "Unknown. Add a sourced street address in the listing editor first."}
      </p>
      {business.base_address && (
        <>
          <label className="block mt-3">
            Search public address
            <input
              className="hub-input w-full"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
                setConfirmed(false);
                setMatches([]);
              }}
            />
          </label>
          <button
            disabled={busy}
            className="hub-button mt-3"
            onClick={() => void search()}
          >
            Find address matches
          </button>
          <fieldset className="my-3 space-y-2">
            <legend>Review address matches</legend>
            {matches.map((m) => (
              <label key={m.id} className="block">
                <input
                  type="radio"
                  name={`map-${business.id}`}
                  checked={selected?.id === m.id}
                  onChange={() => {
                    setSelected(m);
                    setConfirmed(false);
                  }}
                />{" "}
                {m.label}
              </label>
            ))}
          </fieldset>
          {selected && (
            <>
              <div className="h-48 overflow-hidden rounded-lg">
                <LocationPreviewMap
                  coordinates={selected.coordinates}
                  label={selected.label}
                />
              </div>
              <p className="my-2 text-sm">
                {selected.coordinates.lat}, {selected.coordinates.lng}
              </p>
              <label className="block my-3">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />{" "}
                I checked this address and pin against the public source. It is
                this business’s fixed location, not a city center or service
                area.
              </label>
              <button
                disabled={busy || !confirmedMapMatch(selected, confirmed)}
                className="hub-button"
                onClick={() => void save()}
              >
                Confirm and save coordinates
              </button>
            </>
          )}
        </>
      )}
      {message && (
        <p role="status" className="mt-3">
          {message}
        </p>
      )}
    </details>
  );
}
