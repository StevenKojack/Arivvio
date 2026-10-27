import { homeAreas, marketplaceItems, type Coordinates } from "@/app/data/marketplace";
import { MAPBOX_ACCESS_TOKEN, hasMapboxConfig } from "./config";

export type AddressSuggestion = {
  coordinates: Coordinates;
  id: string;
  isFallback: boolean;
  label: string;
  placeType: "address" | "city" | "venue";
};

type MapboxFeature = {
  center?: [number, number];
  id: string;
  place_name?: string;
  place_type?: string[];
  text?: string;
};

type MapboxGeocodingResponse = {
  features?: MapboxFeature[];
};

export async function searchAddressSuggestions(query: string) {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 3) {
    return [];
  }

  if (!hasMapboxConfig()) {
    return getFallbackAddressSuggestions(trimmedQuery);
  }

  try {
    const searchParams = new URLSearchParams({
      access_token: MAPBOX_ACCESS_TOKEN,
      country: "us",
      limit: "5",
      proximity: "-118.2437,34.0522",
      types: "address,place,poi",
    });
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        trimmedQuery,
      )}.json?${searchParams.toString()}`,
    );

    if (!response.ok) {
      return getFallbackAddressSuggestions(trimmedQuery);
    }

    const payload = (await response.json()) as MapboxGeocodingResponse;
    const suggestions =
      payload.features
        ?.filter((feature) => feature.center && feature.place_name)
        .map<AddressSuggestion>((feature) => ({
          coordinates: {
            lat: feature.center?.[1] ?? 34.0522,
            lng: feature.center?.[0] ?? -118.2437,
          },
          id: feature.id,
          isFallback: false,
          label: feature.place_name ?? feature.text ?? trimmedQuery,
          placeType: getPlaceType(feature.place_type),
        })) ?? [];

    return suggestions.length ? suggestions : getFallbackAddressSuggestions(trimmedQuery);
  } catch {
    return getFallbackAddressSuggestions(trimmedQuery);
  }
}

function getPlaceType(placeTypes?: string[]): AddressSuggestion["placeType"] {
  if (placeTypes?.includes("poi")) {
    return "venue";
  }

  if (placeTypes?.includes("place")) {
    return "city";
  }

  return "address";
}

function getFallbackAddressSuggestions(query: string): AddressSuggestion[] {
  const normalizedQuery = query.toLowerCase();
  const areaSuggestions = homeAreas
    .filter((area) => area.name.toLowerCase().includes(normalizedQuery))
    .map<AddressSuggestion>((area) => ({
      coordinates: area.coordinates,
      id: `area-${area.name}`,
      isFallback: true,
      label: area.name,
      placeType: "city",
    }));
  const venueSuggestions = marketplaceItems
    .filter(
      (item) =>
        item.type === "Venue" &&
        `${item.name} ${item.address} ${item.location}`
          .toLowerCase()
          .includes(normalizedQuery),
    )
    .slice(0, 4)
    .map<AddressSuggestion>((item) => ({
      coordinates: item.coordinates,
      id: `venue-${item.id}`,
      isFallback: true,
      label: `${item.name}, ${item.location}`,
      placeType: "venue",
    }));

  return [...venueSuggestions, ...areaSuggestions].slice(0, 5);
}

// Stored business pins must use permanent geocoding, never demo/city fallbacks.
export async function searchPermanentAddresses(query: string): Promise<AddressSuggestion[]> {
 if(!hasMapboxConfig()) throw new Error('Mapbox is not configured. Leave the location unknown.');
 if(query.trim().length<5) throw new Error('Enter the full public street address.');
 const params=new URLSearchParams({access_token:MAPBOX_ACCESS_TOKEN,q:query.trim(),country:'us',types:'address',limit:'5',autocomplete:'false',permanent:'true'});
 const response=await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${params}`);
 if(!response.ok) throw new Error('Address lookup unavailable. Check Mapbox permanent-geocoding access. No location was saved.');
 const data=await response.json() as {features?:{id:string;geometry:{coordinates:[number,number]};properties:{feature_type:string;full_address?:string;name:string;place_formatted?:string}}[]};
 return (data.features??[]).filter(f=>f.properties.feature_type==='address' && f.geometry?.coordinates?.length===2).map(f=>({id:f.id,isFallback:false,placeType:'address',label:f.properties.full_address??`${f.properties.name}, ${f.properties.place_formatted??''}`,coordinates:{lat:f.geometry.coordinates[1],lng:f.geometry.coordinates[0]}}));
}
