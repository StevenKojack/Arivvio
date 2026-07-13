"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  estimateDriveMinutes,
  eventPlanPresets,
  eventTypes,
  getDistanceMiles,
  getEndTime,
  getHoursBetween,
  homeAreas,
  isAvailableAt,
  allServices,
  marketplaceItems,
  marketplaceTypes,
  quoteItem,
  type Coordinates,
  type EventType,
  type MarketplaceItem,
  type MarketplaceServiceOption,
  type QuoteContext,
  type ServiceName,
} from "../data/marketplace";
import { createBrowserSupabaseClient, hasSupabaseConfig } from "@/lib/supabase/client";
import type { PublicTableRow } from "@/lib/supabase/database.types";
import {
  getEventById,
  getMarketplaceProviders,
} from "@/lib/repositories/marketplaceRepository";
import { getProfileByMarketplaceType } from "@/lib/event-intelligence/taxonomy";
import { recognizeEventIntent } from "@/lib/event-intelligence/search";
import { rankMarketplaceItems } from "@/lib/event-intelligence/recommendations";
import {
  derivePlanningContext,
  isMarketplaceItemCompatible,
  scoreMarketplaceContext,
  type EventPlanningContext,
} from "@/lib/event-intelligence/context";
import {
  createCartItem,
  updateCartItemTime,
} from "@/lib/repositories/cartRepository";
import { ensureCurrentProfile } from "@/lib/repositories/profilesRepository";
import { requestQuotesFromCart } from "@/lib/services/quoteService";
import {
  searchAddressSuggestions,
  type AddressSuggestion,
} from "@/lib/maps/geocoding";
import {
  formatZoneSummary,
  getZoneCenter,
  loadLocationProfile,
  saveLocationProfile,
  type LocationProfile,
  type PlanningZone,
  zoneContainsPoint,
} from "@/lib/maps/zones";
import { formatTime } from "@/lib/utils/format";
import { ZoneMapEditor } from "@/app/components/maps/ZoneMapEditor";
import { FilterDrawer } from "./components/FilterDrawer";
import { MarketplaceMap, type MarketplaceMapPin } from "./components/MarketplaceMap";
import { MemoizedMarketplaceRow as MarketplaceRow } from "./components/MarketplaceRow";
import { QuoteCartDrawer } from "./components/QuoteCartDrawer";

type MarketplaceFilter = (typeof marketplaceTypes)[number];
type EventRow = PublicTableRow<"events">;
type ProfileRow = PublicTableRow<"profiles">;
type CartLine = {
  cartItemId?: string;
  id: number;
  item: MarketplaceItem;
  persisted: boolean;
  priceAdjustment: number;
  serviceEnd: string;
  serviceId?: string | null;
  serviceName: ServiceName;
  serviceStart: string;
  serviceTitle: string;
};

type MarketplaceEntryMode = "browse" | "category" | "event" | "service";

function demoItems() {
  return marketplaceItems.map((item) => ({
    ...item,
    databaseSource: false,
  }));
}

function isEventType(value: string | null): value is EventType {
  return eventTypes.includes(value as EventType);
}

function isServiceName(value: string): value is ServiceName {
  return marketplaceTypes.includes(value as MarketplaceFilter) && value !== "All";
}

function getEntryMode(value: string | null): MarketplaceEntryMode {
  if (value === "service" || value === "browse" || value === "category") {
    return value;
  }

  return "event";
}

function getInitialCoordinates(searchParams: ReturnType<typeof useSearchParams>) {
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

export function MarketplaceBrowser() {
  const searchParams = useSearchParams();
  const initialCoordinates = getInitialCoordinates(searchParams);
  const initialEvent = searchParams.get("event");
  const eventId = searchParams.get("eventId");
  const initialServices = searchParams
    .get("services")
    ?.split(",")
    .filter(isServiceName);
  const entryMode = getEntryMode(searchParams.get("entryMode"));
  const initialEventType = isEventType(initialEvent) ? initialEvent : "All";
  const initialGuests = Number(searchParams.get("guests") ?? 40);
  const initialBudget = searchParams.get("budget");
  const initialLocation = searchParams.get("location") ?? "";
  const initialNotes = searchParams.get("notes") ?? "";
  const initialLocationContext = searchParams.get("locationContext") ?? "";
  const initialSearchRadiusMiles = Number(searchParams.get("searchRadiusMiles") ?? 0);
  const initialRecommendedServices =
    initialEventType === "All" ? [] : eventPlanPresets[initialEventType].recommended;
  const [providers, setProviders] = useState<MarketplaceItem[]>(demoItems);
  const [marketplaceMessage, setMarketplaceMessage] = useState(
    "Loading marketplace providers...",
  );
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(hasSupabaseConfig());
  const [savedEvent, setSavedEvent] = useState<EventRow | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventType | "All">(
    initialEventType,
  );
  const [selectedServices, setSelectedServices] = useState<ServiceName[]>(
    initialServices ?? initialRecommendedServices,
  );
  const [excludedServices, setExcludedServices] = useState<ServiceName[]>([]);
  const [query, setQuery] = useState("");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [eventDate, setEventDate] = useState(searchParams.get("date") ?? "");
  const [startTime, setStartTime] = useState(searchParams.get("time") ?? "14:00");
  const [endTime, setEndTime] = useState(
    getEndTime(searchParams.get("time") ?? "14:00", Number(searchParams.get("duration") ?? 3)),
  );
  const [guestCount, setGuestCount] = useState(
    Number.isFinite(initialGuests) ? initialGuests : 40,
  );
  const [useHomeVenue, setUseHomeVenue] = useState(Boolean(initialCoordinates));
  const [homeAddress, setHomeAddress] = useState(initialLocation);
  const [homeAreaName, setHomeAreaName] = useState(homeAreas[0].name);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [liveCoordinates, setLiveCoordinates] = useState<Coordinates | null>(null);
  const [selectedAddressCoordinates, setSelectedAddressCoordinates] =
    useState<Coordinates | null>(initialCoordinates);
  const [locationProfile, setLocationProfile] = useState<LocationProfile | null>(null);
  const [searchZone, setSearchZone] = useState<PlanningZone | null>(null);
  const [isZoneEditorOpen, setIsZoneEditorOpen] = useState(false);
  const [locationStatus, setLocationStatus] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartMessage, setCartMessage] = useState("");
  const [activeRowId, setActiveRowId] = useState("best-matches");
  const [hoveredItemId, setHoveredItemId] = useState<number | null>(null);
  const hoverFrameRef = useRef<number | null>(null);
  const activeRowFrameRef = useRef<number | null>(null);
  const [isMobileMapOpen, setIsMobileMapOpen] = useState(false);
  const [pendingServiceItem, setPendingServiceItem] = useState<MarketplaceItem | null>(null);
  const [selectedMapItemId, setSelectedMapItemId] = useState<number | null>(null);
  const [isRequestingQuotes, setIsRequestingQuotes] = useState(false);
  const durationHours = getHoursBetween(startTime, endTime);
  const globalQuoteContext: QuoteContext = useMemo(
    () => ({
      date: eventDate,
      durationHours,
      endTime,
      guests: guestCount,
      startTime,
    }),
    [durationHours, endTime, eventDate, guestCount, startTime],
  );
  const homeArea = homeAreas.find((area) => area.name === homeAreaName) ?? homeAreas[0];
  const homeCoordinates =
    liveCoordinates ?? selectedAddressCoordinates ?? homeArea.coordinates;
  const eventCoordinates: Coordinates | undefined = useMemo(
    () =>
      useHomeVenue
        ? homeCoordinates
        : locationProfile?.coordinates
          ? locationProfile.coordinates
          : savedEvent?.latitude && savedEvent.longitude
            ? { lat: savedEvent.latitude, lng: savedEvent.longitude }
            : undefined,
    [
      homeCoordinates,
      locationProfile?.coordinates,
      savedEvent?.latitude,
      savedEvent?.longitude,
      useHomeVenue,
    ],
  );
  const providerEstimates = useMemo(
    () =>
      eventCoordinates
        ? providers
            .filter((item) => item.type !== "Venue")
            .map((item) => ({
              driveMinutes: estimateDriveMinutes(eventCoordinates, item.coordinates),
              item,
              miles: getDistanceMiles(eventCoordinates, item.coordinates),
            }))
            .filter((estimate) => {
              const withinRadius = estimate.item.serviceRadiusMiles
                ? estimate.miles <= estimate.item.serviceRadiusMiles
                : true;

              return estimate.driveMinutes <= 60 && withinRadius;
            })
            .sort((a, b) => a.driveMinutes - b.driveMinutes)
        : [],
    [eventCoordinates, providers],
  );
  const visibleMarketplaceTypes = useMemo(
    () =>
      [
        ...(selectedEvent === "All" ? allServices : eventPlanPresets[selectedEvent].recommended),
        ...selectedServices,
        ...excludedServices,
        ...curatedFilterServices,
      ].filter((service, index, services) => services.indexOf(service) === index),
    [excludedServices, selectedEvent, selectedServices],
  );
  const planSummary = [
    isEventType(initialEvent) ? initialEvent : null,
    guestCount ? `${guestCount.toLocaleString()} guests` : null,
    initialBudget ? `$${Number(initialBudget).toLocaleString()} budget` : null,
  ]
    .filter(Boolean)
    .join(" - ");
  const eventLocationLabel = useHomeVenue
    ? homeAddress || homeAreaName
    : locationProfile?.label ||
      locationProfile?.formattedAddress ||
      initialLocation ||
      savedEvent?.city ||
      "Not selected";
  const serviceSummary = selectedServices.length
    ? selectedServices.slice(0, 4).join(", ")
    : "Open to suggestions";
  const searchAreaSummary = searchZone
    ? formatZoneSummary(searchZone)
    : locationProfile?.searchAreaLabel || "No search area saved";
  const normalizedQuery = query.trim().toLowerCase();
  const planningContext = useMemo(
    () =>
      derivePlanningContext({
        budget: initialBudget,
        eventLabel: selectedEvent === "All" ? initialEvent : selectedEvent,
        locationContext: initialLocationContext,
        locationText: `${initialLocation} ${homeAddress}`,
        notes: initialNotes,
      }),
    [
      homeAddress,
      initialBudget,
      initialEvent,
      initialLocation,
      initialLocationContext,
      initialNotes,
      selectedEvent,
    ],
  );
  const filteredItems = useMemo(() => {
    const nextItems = providers.filter((item) => {
      const matchesEvent =
        selectedEvent === "All" || item.events.includes(selectedEvent);
      const matchesServices =
        selectedServices.length === 0 ||
        itemMatchesServices(item, selectedServices);
      const isExcluded = excludedServices.some((service) =>
        itemMatchesServices(item, [service]),
      );
      const searchText = `${item.name} ${item.location} ${item.address} ${item.events.join(
        " ",
      )} ${item.services.join(" ")} ${(item.tags ?? []).join(" ")}`;
      const matchesQuery =
        !normalizedQuery || searchText.toLowerCase().includes(normalizedQuery);
      const driveMinutes = eventCoordinates
        ? estimateDriveMinutes(eventCoordinates, item.coordinates)
        : 0;
      const miles = eventCoordinates
        ? getDistanceMiles(eventCoordinates, item.coordinates)
        : 0;
      const matchesCity =
        !savedEvent?.city ||
        item.type === "Venue" ||
        item.location.toLowerCase().includes(savedEvent.city.toLowerCase()) ||
        item.address.toLowerCase().includes(savedEvent.city.toLowerCase());
      const withinRadius =
        !eventCoordinates ||
        item.type === "Venue" ||
        !item.serviceRadiusMiles ||
        miles <= item.serviceRadiusMiles;
      const withinSavedSearchZone =
        !searchZone ||
        item.type !== "Venue" ||
        zoneContainsPoint(searchZone, item.coordinates);
      const withinPlannerSearchRegion =
        withinSavedSearchZone &&
        (!eventCoordinates ||
          item.type !== "Venue" ||
          !Number.isFinite(initialSearchRadiusMiles) ||
          initialSearchRadiusMiles <= 0 ||
          miles <= initialSearchRadiusMiles);
      const isNearEnough =
        !eventCoordinates || item.type === "Venue" || driveMinutes <= 60;
      const matchesAvailability = isAvailableAt(
        item,
        eventDate,
        startTime,
        endTime,
      );

      return (
        matchesEvent &&
        matchesServices &&
        !isExcluded &&
        matchesQuery &&
        matchesCity &&
        withinRadius &&
        withinPlannerSearchRegion &&
        isNearEnough &&
        matchesAvailability &&
        isMarketplaceItemCompatible(item, planningContext)
      );
    });

    if (selectedEvent === "All") {
      return rankByPlanningContext(nextItems, planningContext);
    }

    const profile = getProfileByMarketplaceType(selectedEvent);
    const rankedItems = rankMarketplaceItems(
      nextItems,
      recognizeEventIntent(profile.subtype ?? profile.primaryType),
      {
        coordinates: eventCoordinates,
        quoteContext: globalQuoteContext,
      },
    );

    return rankByPlanningContext(
      rankedItems.map((rankedItem) => rankedItem.item),
      planningContext,
    );
  }, [
    endTime,
    eventCoordinates,
    eventDate,
    globalQuoteContext,
    normalizedQuery,
    providers,
    initialSearchRadiusMiles,
    planningContext,
    savedEvent?.city,
    searchZone,
    selectedEvent,
    excludedServices,
    selectedServices,
    startTime,
  ]);
  const isLoggedIn = Boolean(sessionUserId || profile);
  const canPersistCart = Boolean(profile && savedEvent);
  const cartedIds = useMemo(
    () => Array.from(new Set(cart.map((line) => line.item.id))),
    [cart],
  );
  const cartedServiceNames = useMemo(
    () => Array.from(new Set(cart.map((line) => line.serviceName))),
    [cart],
  );
  const selectedServiceCountByVendor = useMemo(() => {
    const counts = new Map<number, number>();

    cart.forEach((line) => {
      counts.set(line.item.id, (counts.get(line.item.id) ?? 0) + 1);
    });

    return counts;
  }, [cart]);
  const marketplaceRows = useMemo(
    () => buildMarketplaceRows(filteredItems, entryMode === "service" ? selectedServices : []),
    [entryMode, filteredItems, selectedServices],
  );
  const activeRow = useMemo(
    () => marketplaceRows.find((row) => row.id === activeRowId) ?? marketplaceRows[0],
    [activeRowId, marketplaceRows],
  );
  const mapPins = useMemo<MarketplaceMapPin[]>(() => {
    const activeItems = activeRow?.items ?? [];
    const activeIds = new Set(activeItems.map((item) => item.id));
    const pinMap = new Map<number, MarketplaceMapPin>();

    activeItems.forEach((item) => {
      pinMap.set(item.id, {
        isActiveRowMatch: true,
        isCarted: cartedIds.includes(item.id),
        isCompletedCategory:
          !cartedIds.includes(item.id) &&
          itemMatchesServices(item, cartedServiceNames),
        item,
      });
    });

    cart.forEach((line) => {
      pinMap.set(line.item.id, {
        isActiveRowMatch: activeIds.has(line.item.id),
        isCarted: true,
        isCompletedCategory: false,
        item: line.item,
      });
    });

    if (selectedMapItemId && !pinMap.has(selectedMapItemId)) {
      const selectedItem =
        filteredItems.find((item) => item.id === selectedMapItemId) ??
        providers.find((item) => item.id === selectedMapItemId);

      if (selectedItem) {
        pinMap.set(selectedItem.id, {
          isActiveRowMatch: false,
          isCarted: cartedIds.includes(selectedItem.id),
          isCompletedCategory: false,
          item: selectedItem,
        });
      }
    }

    return Array.from(pinMap.values());
  }, [
    activeRow,
    cart,
    cartedIds,
    cartedServiceNames,
    filteredItems,
    providers,
    selectedMapItemId,
  ]);

  const setMapHoverItem = useCallback((itemId: number | null) => {
    if (hoverFrameRef.current) {
      window.cancelAnimationFrame(hoverFrameRef.current);
    }

    hoverFrameRef.current = window.requestAnimationFrame(() => {
      setHoveredItemId((current) => (current === itemId ? current : itemId));
    });
  }, []);

  useEffect(() => {
    const profile = loadLocationProfile();

    if (profile) {
      applyLocationProfile(profile, "Planning location restored.");
    }
  }, []);

  useEffect(() => {
    async function loadMarketplace() {
      if (!hasSupabaseConfig()) {
        setIsAuthLoading(false);
        setProviders(demoItems());
        setMarketplaceMessage(
          "Supabase needs a real project URL. Showing demo providers until the database is connected.",
        );
        return;
      }

      try {
        const supabase = createBrowserSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        setSessionUserId(user?.id ?? null);

        if (user) {
          const currentProfile = await ensureCurrentProfile(supabase, user);
          setProfile(currentProfile);
        } else {
          setProfile(null);
        }

        if (eventId) {
          const eventRow = await getEventById(supabase, eventId);
          setSavedEvent(eventRow);
          const savedLocationProfile = getLocationProfileFromEvent(eventRow);

          if (savedLocationProfile) {
            applyLocationProfile(savedLocationProfile, "Saved event location restored.");
          }
          setEventDate(eventRow.date ?? eventDate);
          setStartTime(eventRow.start_time?.slice(0, 5) ?? startTime);
          setEndTime(eventRow.end_time?.slice(0, 5) ?? endTime);
          setGuestCount(eventRow.guest_count ?? guestCount);
          if (isEventType(eventRow.event_type)) {
            chooseEventType(eventRow.event_type);
          }
        }

        const databaseProviders = await getMarketplaceProviders(supabase);

        if (databaseProviders.length) {
          setProviders(databaseProviders);
          setMarketplaceMessage(
            "Showing approved database providers from Supabase.",
          );
          return;
        }

        setProviders(demoItems());
        setMarketplaceMessage(
          "No approved database providers were found. Showing demo providers with clear demo labels.",
        );
      } catch (error) {
        setSessionUserId(null);
        setProfile(null);
        setProviders(demoItems());
        setMarketplaceMessage(
          error instanceof Error
            ? `${error.message}. Showing demo providers until Supabase data is ready.`
            : "Unable to load database providers. Showing demo providers.",
        );
      } finally {
        setIsAuthLoading(false);
      }
    }

    loadMarketplace();
    // The initial URL params should seed the browser once when the route loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  function applyLocationProfile(profile: LocationProfile, message?: string) {
    setLocationProfile(profile);
    setSearchZone(profile.zone ?? null);

    if (profile.coordinates) {
      setSelectedAddressCoordinates(profile.coordinates);
      setLiveCoordinates(null);
      const nearestArea = homeAreas
        .map((area) => ({
          area,
          distance: getDistanceMiles(profile.coordinates as Coordinates, area.coordinates),
        }))
        .sort((a, b) => a.distance - b.distance)[0]?.area;

      if (nearestArea) {
        setHomeAreaName(nearestArea.name);
      }

      if (profile.locationMode !== "needs_venue") {
        setUseHomeVenue(true);
        setHomeAddress(profile.formattedAddress || profile.label || "Selected event address");
      }
    }

    if (message) {
      setLocationStatus(message);
    }
  }

  useEffect(() => {
    if (!hasSupabaseConfig()) {
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;

      setSessionUserId(user?.id ?? null);

      if (!user) {
        setProfile(null);
        setIsAuthLoading(false);
        return;
      }

      try {
        const currentProfile = await ensureCurrentProfile(supabase, user);
        setProfile(currentProfile);
      } finally {
        setIsAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!marketplaceRows.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const rowId = visibleEntry?.target.getAttribute("data-marketplace-row");

        if (rowId) {
          if (activeRowFrameRef.current) {
            window.cancelAnimationFrame(activeRowFrameRef.current);
          }

          activeRowFrameRef.current = window.requestAnimationFrame(() => {
            setActiveRowId((current) => (current === rowId ? current : rowId));
          });
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.25, 0.45, 0.65],
      },
    );

    const rowElements = document.querySelectorAll("[data-marketplace-row]");
    rowElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [marketplaceRows]);

  useEffect(
    () => () => {
      if (hoverFrameRef.current) {
        window.cancelAnimationFrame(hoverFrameRef.current);
      }

      if (activeRowFrameRef.current) {
        window.cancelAnimationFrame(activeRowFrameRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!useHomeVenue || homeAddress.trim().length < 3) {
      return;
    }

    let isActive = true;
    const debounceId = window.setTimeout(async () => {
      setIsSearchingAddress(true);
      const suggestions = await searchAddressSuggestions(homeAddress);

      if (isActive) {
        setAddressSuggestions(suggestions);
        setIsSearchingAddress(false);
      }
    }, 260);

    return () => {
      isActive = false;
      window.clearTimeout(debounceId);
    };
  }, [homeAddress, useHomeVenue]);

  function getLineContext(line: CartLine): QuoteContext {
    return {
      date: eventDate,
      durationHours: getHoursBetween(line.serviceStart, line.serviceEnd),
      endTime: line.serviceEnd,
      guests: guestCount,
      startTime: line.serviceStart,
    };
  }

  function getLineQuote(line: CartLine) {
    return Math.max(
      quoteItem(line.item, getLineContext(line)) + line.priceAdjustment,
      0,
    );
  }

  function toggleService(service: ServiceName) {
    setExcludedServices((current) => current.filter((item) => item !== service));
    setSelectedServices((current) =>
      current.includes(service)
        ? current.filter((item) => item !== service)
        : [...current, service],
    );
  }

  function toggleExcludedService(service: ServiceName) {
    setSelectedServices((current) => current.filter((item) => item !== service));
    setExcludedServices((current) =>
      current.includes(service)
        ? current.filter((item) => item !== service)
        : [...current, service],
    );
  }

  function chooseEventType(nextEvent: EventType | "All") {
    setSelectedEvent(nextEvent);
    setQuery("");
    setExcludedServices([]);
    setSelectedServices(
      nextEvent === "All" ? [] : eventPlanPresets[nextEvent].recommended,
    );
  }

  function useCurrentLocation() {
    setLocationStatus("");

    if (!navigator.geolocation) {
      setLocationStatus("Your browser does not support live location.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const nearestArea = homeAreas
          .map((area) => ({
            area,
            distance: getDistanceMiles(nextCoordinates, area.coordinates),
          }))
          .sort((a, b) => a.distance - b.distance)[0]?.area;

        setLiveCoordinates(nextCoordinates);
        setSelectedAddressCoordinates(nextCoordinates);
        setUseHomeVenue(true);
        setHomeAddress("Current live location");
        const nextProfile: LocationProfile = {
          ...(locationProfile ?? {}),
          coordinates: nextCoordinates,
          currentLocationUsed: true,
          formattedAddress: "Current live location",
          label: "Current live location",
          locationMode: "home_private",
        };

        setLocationProfile(nextProfile);
        saveLocationProfile(nextProfile);
        if (nearestArea) {
          setHomeAreaName(nearestArea.name);
        }
        setLocationStatus("Live location applied. Provider estimates updated.");
      },
      () => {
        setLocationStatus("Location permission was blocked or unavailable.");
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 },
    );
  }

  function updateHomeAddress(value: string) {
    setHomeAddress(value);
    setLiveCoordinates(null);
    setSelectedAddressCoordinates(null);
    setLocationStatus("");
    if (value.trim().length < 3) {
      setAddressSuggestions([]);
      setIsSearchingAddress(false);
    }
  }

  function selectAddressSuggestion(suggestion: AddressSuggestion) {
    const nearestArea = homeAreas
      .map((area) => ({
        area,
        distance: getDistanceMiles(suggestion.coordinates, area.coordinates),
      }))
      .sort((a, b) => a.distance - b.distance)[0]?.area;

    setHomeAddress(suggestion.label);
    setSelectedAddressCoordinates(suggestion.coordinates);
    setLiveCoordinates(null);
    setUseHomeVenue(true);
    const nextProfile: LocationProfile = {
      ...(locationProfile ?? {}),
      coordinates: suggestion.coordinates,
      currentLocationUsed: false,
      formattedAddress: suggestion.label,
      inferredLocationType: suggestion.placeType === "venue" ? "venue" : suggestion.placeType,
      label: suggestion.label,
      locationMode: suggestion.placeType === "venue" ? "has_venue" : "home_private",
      mapboxPlaceId: suggestion.id,
    };

    setLocationProfile(nextProfile);
    saveLocationProfile(nextProfile);
    if (nearestArea) {
      setHomeAreaName(nearestArea.name);
    }
    setAddressSuggestions([]);
    setLocationStatus(
      suggestion.isFallback
        ? "Using a demo location match. Provider estimates updated."
        : "Address found. Provider estimates updated.",
    );
  }

  const addCartLine = useCallback(async (
    item: MarketplaceItem,
    serviceOption: MarketplaceServiceOption,
  ) => {
    if (
      cart.some(
        (line) =>
          line.item.id === item.id && line.serviceName === serviceOption.service,
      )
    ) {
      return;
    }

    const lineId = Date.now();
    const line: CartLine = {
      id: lineId,
      item,
      persisted: false,
      priceAdjustment: serviceOption.priceAdjustment ?? 0,
      serviceEnd: endTime,
      serviceId: serviceOption.serviceId ?? item.serviceId ?? null,
      serviceName: serviceOption.service,
      serviceStart: startTime,
      serviceTitle: serviceOption.title,
    };

    setCart((current) => [...current, line]);

    if (!profile || !savedEvent) {
      setCartMessage(getCartAuthMessage(isAuthLoading, isLoggedIn, Boolean(savedEvent)));
      return;
    }

    if (!item.databaseSource) {
      setCartMessage("Demo providers stay local. Add a database provider to save quote cart items.");
      return;
    }

    try {
      const supabase = createBrowserSupabaseClient();
      const estimatedPrice = Math.max(
        quoteItem(item, {
          date: eventDate,
          durationHours,
          endTime,
          guests: guestCount,
          startTime,
        }) + (serviceOption.priceAdjustment ?? 0),
        0,
      );
      const cartItem = await createCartItem(supabase, {
        endTime,
        estimatedPrice,
        eventId: savedEvent.id,
        itemType: serviceOption.service === "Venue" ? "venue" : "vendor_service",
        serviceId: line.serviceId ?? null,
        startTime,
        vendorId: item.vendorId ?? null,
        venueId: item.venueId ?? null,
      });

      setCart((current) =>
        current.map((currentLine) =>
          currentLine.id === lineId
            ? { ...currentLine, cartItemId: cartItem.id, persisted: true }
            : currentLine,
        ),
      );
      setCartMessage("Quote cart item saved to Supabase.");
    } catch (error) {
      setCartMessage(
        error instanceof Error
          ? error.message
          : "Unable to save this cart item yet.",
      );
    }
  }, [
    cart,
    durationHours,
    endTime,
    eventDate,
    guestCount,
    profile,
    savedEvent,
    startTime,
    isAuthLoading,
    isLoggedIn,
  ]);

  const addToCart = useCallback(async (item: MarketplaceItem) => {
    const serviceOptions = getSelectableServiceOptions(item);

    if (serviceOptions.length > 1) {
      setPendingServiceItem(item);
      return;
    }

    await addCartLine(item, serviceOptions[0]);
  }, [addCartLine]);

  const addSelectedServicesToCart = useCallback(async (
    item: MarketplaceItem,
    serviceOptions: MarketplaceServiceOption[],
  ) => {
    for (const serviceOption of serviceOptions) {
      await addCartLine(item, serviceOption);
    }

    setPendingServiceItem(null);
  }, [addCartLine]);

  const removeFromCart = useCallback((lineId: number) => {
    setCart((current) => current.filter((line) => line.id !== lineId));
  }, []);

  const selectMapItem = useCallback((item: MarketplaceItem) => {
    setSelectedMapItemId(item.id);
    setIsMobileMapOpen(false);
    const card = document.querySelector(`[data-vendor-id="${item.id}"]`);

    card?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, []);

  function renderQuoteCart(variant: "panel" | "compact" | "bar" | "workspace" = "panel") {
    return (
      <QuoteCartDrawer
        canPersistCart={canPersistCart}
        cart={cart}
        cartMessage={cartMessage}
        eventSummary={`${eventDate || "Choose a date"} from ${formatTime(startTime)} to ${formatTime(endTime)}`}
        getLineQuote={getLineQuote}
        isAuthLoading={isAuthLoading}
        isLoggedIn={isLoggedIn}
        isRequestingQuotes={isRequestingQuotes}
        variant={variant}
        onRemove={removeFromCart}
        onRequestQuotes={requestQuotes}
        onUpdateTime={updateCartTime}
      />
    );
  }

  async function updateCartTime(
    lineId: number,
    field: "serviceStart" | "serviceEnd",
    value: string,
  ) {
    const existingLine = cart.find((line) => line.id === lineId);
    const nextLine = existingLine
      ? {
          ...existingLine,
          [field]: value,
        }
      : null;

    setCart((current) =>
      current.map((line) =>
        line.id === lineId ? { ...line, [field]: value } : line,
      ),
    );

    if (!nextLine?.cartItemId || !savedEvent || !nextLine.item.databaseSource) {
      return;
    }

    try {
      const supabase = createBrowserSupabaseClient();
      await updateCartItemTime(supabase, {
        cartItemId: nextLine.cartItemId,
        endTime: nextLine.serviceEnd,
        estimatedPrice: quoteItem(nextLine.item, getLineContext(nextLine)),
        eventId: savedEvent.id,
        startTime: nextLine.serviceStart,
      });
    } catch (error) {
      setCartMessage(
        error instanceof Error ? error.message : "Unable to sync cart item time.",
      );
    }
  }

  async function requestQuotes() {
    setCartMessage("");

    if (!cart.length) {
      setCartMessage("Add providers before requesting quotes.");
      return;
    }

    if (!profile || !savedEvent) {
      setCartMessage(getCartAuthMessage(isAuthLoading, isLoggedIn, Boolean(savedEvent)));
      return;
    }

    const persistedDatabaseLines = cart.filter(
      (line) => line.persisted && line.cartItemId && line.item.databaseSource,
    );

    if (!persistedDatabaseLines.length) {
      setCartMessage("Only saved database providers can receive quote requests.");
      return;
    }

    setIsRequestingQuotes(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const requests = await requestQuotesFromCart(supabase, {
        cartItems: persistedDatabaseLines.map((line) => ({
          end_time: line.serviceEnd,
          estimated_price: getLineQuote(line),
          event_id: savedEvent.id,
          id: line.cartItemId ?? String(line.id),
          service_id: line.serviceId ?? line.item.serviceId ?? null,
          start_time: line.serviceStart,
          vendor_id: line.item.vendorId ?? null,
          venue_id: line.item.venueId ?? null,
        })),
        event: savedEvent,
        message: "Quote requested from Arivvio marketplace cart.",
        plannerId: profile.id,
      });

      setCartMessage(
        `${requests.length} quote request${requests.length === 1 ? "" : "s"} sent. Status starts as pending.`,
      );
    } catch (error) {
      setCartMessage(
        error instanceof Error ? error.message : "Unable to request quotes.",
      );
    } finally {
      setIsRequestingQuotes(false);
    }
  }

  return (
    <>
      <div className="relative min-h-[calc(100vh-5rem)] w-full overflow-x-clip">
        <EventContextPanel
          entryMode={entryMode}
          eventDate={eventDate}
          eventLocationLabel={eventLocationLabel}
          guestCount={guestCount}
          initialNotes={initialNotes}
          marketplaceMessage={marketplaceMessage}
          planSummary={planSummary}
          serviceSummary={serviceSummary}
          startTime={startTime}
          endTime={endTime}
          useHomeVenue={useHomeVenue}
          homeAddress={homeAddress}
          addressSuggestions={addressSuggestions}
          isSearchingAddress={isSearchingAddress}
          locationStatus={locationStatus}
          providerCount={providerEstimates.length}
          searchAreaSummary={searchAreaSummary}
          onHomeAddressChange={updateHomeAddress}
          onEditArea={() => setIsZoneEditorOpen((current) => !current)}
          onOpenFilters={() => setIsFilterDrawerOpen(true)}
          onSelectAddressSuggestion={selectAddressSuggestion}
          onToggleHomeVenue={() => setUseHomeVenue((current) => !current)}
          onUseCurrentLocation={useCurrentLocation}
        />

        {isZoneEditorOpen ? (
          <div className="mt-3 rounded-[30px] border border-[#D4AF37]/16 bg-white p-3 shadow-[0_18px_56px_rgba(13,19,33,0.055)]">
            <ZoneMapEditor
              defaultLabel="Marketplace search area"
              heightClassName="h-[52vh] min-h-[480px]"
              mapCenter={searchZone ? getZoneCenter(searchZone) : eventCoordinates}
              mapZoom={10.5}
              onZonesChange={(zones) => {
                const zone = zones[0] ?? null;
                const nextProfile: LocationProfile = {
                  ...(locationProfile ?? {}),
                  coordinates: zone ? getZoneCenter(zone) : eventCoordinates,
                  searchAreaLabel: zone?.label,
                  zone: zone ?? undefined,
                };

                setSearchZone(zone);
                setLocationProfile(nextProfile);
                saveLocationProfile(nextProfile);
              }}
              singleZone
              subtitle="Adjust the one area Arivvio should use for venue discovery."
              title="Marketplace search area"
              zones={searchZone ? [searchZone] : []}
            />
          </div>
        ) : null}

        <div className="mt-3 grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(430px,44vw)_minmax(280px,320px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(560px,46vw)_320px]">
          <section
            className="min-w-0 space-y-4 pb-28 xl:pb-4"
            aria-label="Vendor discovery"
          >
          <div className="xl:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMapOpen(true)}
              className="fixed bottom-5 right-5 z-40 rounded-full bg-[#0D1321] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(13,19,33,0.28)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#111A2E]"
            >
              Map
            </button>
            <div className="fixed bottom-5 left-4 right-24 z-40">
              {renderQuoteCart("bar")}
            </div>
          </div>

          {marketplaceRows.length ? (
            <div className="space-y-6 animate-[fadeUp_280ms_ease-out]">
              {marketplaceRows.map((row) => (
                <div key={row.id} data-marketplace-row={row.id}>
                  <MarketplaceRow
                    activeItemId={selectedMapItemId}
                    cartedIds={cartedIds}
                    selectedServiceCountByVendor={selectedServiceCountByVendor}
                    rowId={row.id}
                    title={row.title}
                    description={row.description}
                    items={row.items}
                    quoteContext={globalQuoteContext}
                    onAdd={addToCart}
                    onHoverItem={setMapHoverItem}
                    onSelectItem={selectMapItem}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-neutral-300 bg-white p-8 text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
                No close matches yet
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-neutral-600">
                Try opening filters or adjusting the location context.
              </p>
            </div>
          )}
        </section>

        <aside
          className="relative hidden min-w-0 self-stretch xl:block"
          aria-label="Interactive map workspace"
        >
          <div className="sticky top-3">
            <MarketplaceMap
              activeCategory={activeRow?.title ?? "Best matches"}
              cartedIds={cartedIds}
              eventCoordinates={eventCoordinates}
              hoveredItemId={hoveredItemId}
              layout="sticky"
              pins={mapPins}
              searchZone={searchZone}
              selectedItemId={selectedMapItemId}
              onAddItem={addToCart}
              onHoverItem={setMapHoverItem}
              onSelectItem={selectMapItem}
            />
          </div>
        </aside>

        <aside
          className="relative hidden min-w-0 self-stretch xl:block"
          aria-label="Quote cart workspace"
        >
          <div className="sticky top-3">{renderQuoteCart("workspace")}</div>
        </aside>
        </div>
      </div>

      {isMobileMapOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-[#0D1321]/35 px-3 py-4 backdrop-blur-sm xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Marketplace map"
          onClick={() => setIsMobileMapOpen(false)}
        >
          <div
            className="mx-auto w-full max-w-2xl animate-[fadeUp_220ms_ease-out]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setIsMobileMapOpen(false)}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-950 shadow-[0_16px_40px_rgba(13,19,33,0.18)] transition hover:-translate-y-0.5"
              >
                Close
              </button>
            </div>
            <MarketplaceMap
              activeCategory={activeRow?.title ?? "Best matches"}
              cartedIds={cartedIds}
              eventCoordinates={eventCoordinates}
              hoveredItemId={hoveredItemId}
              layout="sheet"
              pins={mapPins}
              searchZone={searchZone}
              selectedItemId={selectedMapItemId}
              onAddItem={addToCart}
              onHoverItem={setMapHoverItem}
              onSelectItem={selectMapItem}
            />
          </div>
        </div>
      ) : null}

      <FilterDrawer
        eventTypes={eventTypes}
        isOpen={isFilterDrawerOpen}
        query={query}
        selectedEvent={selectedEvent}
        excludedServices={excludedServices}
        selectedServices={selectedServices}
        serviceOptions={visibleMarketplaceTypes}
        onClose={() => setIsFilterDrawerOpen(false)}
        onEventChange={chooseEventType}
        onQueryChange={setQuery}
        onToggleExcludedService={toggleExcludedService}
        onToggleService={toggleService}
      />

      {pendingServiceItem ? (
        <ServiceSelectionDialog
          item={pendingServiceItem}
          quoteContext={globalQuoteContext}
          selectedServices={cart
            .filter((line) => line.item.id === pendingServiceItem.id)
            .map((line) => line.serviceName)}
          onClose={() => setPendingServiceItem(null)}
          onConfirm={(serviceOptions) =>
            addSelectedServicesToCart(pendingServiceItem, serviceOptions)
          }
        />
      ) : null}
    </>
  );
}

type MarketplaceRowGroup = {
  description: string;
  id: string;
  items: MarketplaceItem[];
  serviceNames: ServiceName[];
  title: string;
};

const curatedFilterServices: ServiceName[] = [
  "Venue",
  "Catering",
  "DJ",
  "Photography",
  "Florals",
  "Rentals",
  "Security",
  "Transportation",
  "Magic",
  "Character Performers",
  "Bounce Houses",
  "Bartending",
  "Cleaning",
];

function ServiceSelectionDialog({
  item,
  onClose,
  onConfirm,
  quoteContext,
  selectedServices,
}: {
  item: MarketplaceItem;
  onClose: () => void;
  onConfirm: (serviceOptions: MarketplaceServiceOption[]) => void;
  quoteContext: QuoteContext;
  selectedServices: ServiceName[];
}) {
  const serviceOptions = getSelectableServiceOptions(item);
  const [selectedOptionIds, setSelectedOptionIds] = useState<ServiceName[]>(
    () =>
      serviceOptions
        .filter((option) => !selectedServices.includes(option.service))
        .slice(0, 1)
        .map((option) => option.service),
  );
  const selectedOptions = serviceOptions.filter((option) =>
    selectedOptionIds.includes(option.service),
  );

  function toggleService(service: ServiceName) {
    setSelectedOptionIds((current) =>
      current.includes(service)
        ? current.filter((item) => item !== service)
        : [...current, service],
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#0D1321]/35 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Select vendor services"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-[30px] bg-white p-5 shadow-[0_34px_120px_rgba(13,19,33,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              {item.name}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              What do you want from this vendor?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 hover:border-[#0D1321]"
          >
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          {serviceOptions.map((option) => {
            const isSelected = selectedOptionIds.includes(option.service);
            const isAlreadyInCart = selectedServices.includes(option.service);

            return (
              <button
                key={option.service}
                type="button"
                disabled={isAlreadyInCart}
                onClick={() => toggleService(option.service)}
                className={`rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 disabled:cursor-default disabled:opacity-60 disabled:hover:translate-y-0 ${
                  isSelected
                    ? "border-[#0D1321] bg-[#0D1321] text-white"
                    : "border-neutral-200 bg-[#FFFCF7] text-neutral-950 hover:border-neutral-400"
                }`}
              >
                <span className="flex items-start justify-between gap-4">
                  <span>
                    <span className="block text-base font-semibold">
                      {option.title}
                    </span>
                    <span
                      className={`mt-1 block text-xs font-semibold ${
                        isSelected ? "text-neutral-300" : "text-neutral-500"
                      }`}
                    >
                      {option.service}
                    </span>
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      isSelected
                        ? "bg-white text-neutral-950"
                        : "bg-white text-neutral-700"
                    }`}
                  >
                    {isAlreadyInCart
                      ? "In cart"
                      : `$${getServiceOptionQuote(item, option, quoteContext).toLocaleString()}`}
                  </span>
                </span>
                <span
                  className={`mt-3 block text-sm leading-6 ${
                    isSelected ? "text-neutral-200" : "text-neutral-600"
                  }`}
                >
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-neutral-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-neutral-600">
            {selectedOptions.length
              ? `${selectedOptions.length} service${selectedOptions.length === 1 ? "" : "s"} selected`
              : "Select at least one service to add."}
          </p>
          <button
            type="button"
            disabled={!selectedOptions.length}
            onClick={() => onConfirm(selectedOptions)}
            className="h-12 rounded-full bg-[#0D1321] px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#111A2E] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          >
            Add selected services
          </button>
        </div>
      </div>
    </div>
  );
}

function getSelectableServiceOptions(item: MarketplaceItem): MarketplaceServiceOption[] {
  if (item.serviceOptions?.length) {
    return item.serviceOptions;
  }

  const services = [item.type, ...item.services].filter(
    (service, index, allServices) => allServices.indexOf(service) === index,
  );

  return services.map((service) => ({
    description: `${service} support from ${item.name}.`,
    estimateLabel: item.price,
    service,
    title: service,
  }));
}

function getServiceOptionQuote(
  item: MarketplaceItem,
  option: MarketplaceServiceOption,
  quoteContext: QuoteContext,
) {
  return Math.max(quoteItem(item, quoteContext) + (option.priceAdjustment ?? 0), 0);
}

function EventContextPanel({
  endTime,
  entryMode,
  eventDate,
  eventLocationLabel,
  guestCount,
  homeAddress,
  addressSuggestions,
  initialNotes,
  isSearchingAddress,
  locationStatus,
  marketplaceMessage,
  planSummary,
  providerCount,
  searchAreaSummary,
  serviceSummary,
  startTime,
  useHomeVenue,
  onEditArea,
  onHomeAddressChange,
  onOpenFilters,
  onSelectAddressSuggestion,
  onToggleHomeVenue,
  onUseCurrentLocation,
}: {
  addressSuggestions: AddressSuggestion[];
  endTime: string;
  entryMode: MarketplaceEntryMode;
  eventDate: string;
  eventLocationLabel: string;
  guestCount: number;
  homeAddress: string;
  initialNotes: string;
  isSearchingAddress: boolean;
  locationStatus: string;
  marketplaceMessage: string;
  planSummary: string;
  providerCount: number;
  searchAreaSummary: string;
  serviceSummary: string;
  startTime: string;
  useHomeVenue: boolean;
  onEditArea: () => void;
  onHomeAddressChange: (value: string) => void;
  onOpenFilters: () => void;
  onSelectAddressSuggestion: (suggestion: AddressSuggestion) => void;
  onToggleHomeVenue: () => void;
  onUseCurrentLocation: () => void;
}) {
  return (
    <section className="rounded-[24px] border border-[#D4AF37]/16 bg-white/92 p-3 shadow-[0_14px_44px_rgba(13,19,33,0.055)] backdrop-blur sm:p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            {getEntryModeLabel(entryMode)}
          </p>
          <h2 className="mt-1 truncate text-xl font-semibold tracking-tight text-neutral-950">
            {entryMode === "service"
              ? serviceSummary
              : planSummary || "Vendor marketplace"}
          </h2>
          <p className="mt-1 line-clamp-1 text-sm text-neutral-600">
            {marketplaceMessage}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="flex min-w-0 max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            <SummaryPill label="Date" value={eventDate || "Choose date"} />
            <SummaryPill label="Time" value={`${formatTime(startTime)} - ${formatTime(endTime)}`} />
            <SummaryPill label="Guests" value={guestCount.toLocaleString()} />
            <SummaryPill label="Location" value={eventLocationLabel} />
            <SummaryPill label="Area" value={searchAreaSummary} />
            <SummaryPill label="Services" value={serviceSummary} />
            <SummaryPill label="Nearby" value={`${providerCount} close`} />
          </div>
          <button
            type="button"
            onClick={onToggleHomeVenue}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 ${
              useHomeVenue
                ? "bg-[#0D1321] text-white shadow-[0_12px_26px_rgba(13,19,33,0.16)]"
                : "border border-[#D4AF37]/20 bg-white text-neutral-800"
            }`}
          >
            {useHomeVenue ? "Using address" : "Use address"}
          </button>
          <button
            type="button"
            onClick={onEditArea}
            className="shrink-0 rounded-full border border-[#D4AF37]/20 bg-white px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:-translate-y-0.5 hover:border-[#D4AF37]/60"
          >
            Edit area
          </button>
          <button
            type="button"
            onClick={onOpenFilters}
            className="shrink-0 rounded-full border border-[#D4AF37]/20 bg-white px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:-translate-y-0.5 hover:border-[#D4AF37]/60"
          >
            Refine
          </button>
        </div>
      </div>

      {initialNotes ? (
        <p className="mt-3 rounded-2xl bg-[#F6F3EA] px-4 py-2 text-sm font-semibold text-neutral-700 ring-1 ring-[#D4AF37]/10">
          Added details: {initialNotes}
        </p>
      ) : null}

      {useHomeVenue ? (
          <div className="mt-3 grid gap-3 rounded-2xl border border-[#D4AF37]/14 bg-[#FFFCF7] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <input
              value={homeAddress}
              onChange={(event) => onHomeAddressChange(event.target.value)}
              placeholder="Home or event address"
              className="h-11 rounded-2xl border border-[#D4AF37]/20 px-3 text-sm font-semibold text-neutral-900 outline-none focus:border-[#D4AF37]"
            />
            <button
              type="button"
              onClick={onUseCurrentLocation}
              className="h-11 rounded-full bg-[#0D1321] px-4 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(13,19,33,0.16)] transition hover:-translate-y-0.5 hover:bg-[#111A2E]"
            >
              Use current location
            </button>
            {isSearchingAddress || addressSuggestions.length ? (
              <div className="overflow-hidden rounded-2xl border border-[#D4AF37]/14 bg-white sm:col-span-2">
                {isSearchingAddress ? (
                  <p className="px-4 py-3 text-xs font-semibold text-neutral-500">
                    Searching nearby matches...
                  </p>
                ) : null}
                {addressSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => onSelectAddressSuggestion(suggestion)}
                    className="flex w-full items-start justify-between gap-3 border-t border-neutral-100 px-4 py-3 text-left transition hover:bg-[#FFF8E1]"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-neutral-900">
                        {suggestion.label}
                      </span>
                      <span className="mt-1 block text-xs font-semibold text-neutral-500">
                        {getSuggestionLabel(suggestion)}
                      </span>
                    </span>
                    <span className="rounded-full bg-[#FFF8E1] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A6A16]">
                      Select
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
            {locationStatus ? (
              <p className="text-xs font-semibold text-neutral-600 sm:col-span-2">
                {locationStatus}
              </p>
            ) : null}
          </div>
        ) : null}
    </section>
  );
}

function getSuggestionLabel(suggestion: AddressSuggestion) {
  const source = suggestion.isFallback ? "Demo match" : "Mapbox match";

  if (suggestion.placeType === "venue") {
    return `${source} - likely venue`;
  }

  if (suggestion.placeType === "city") {
    return `${source} - city or area`;
  }

  return `${source} - likely address`;
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-fit rounded-full bg-[#F6F3EA] px-3 py-2 ring-1 ring-[#D4AF37]/10">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A6A16]/70">
        {label}
      </p>
      <p className="truncate text-xs font-semibold text-neutral-800">{value}</p>
    </div>
  );
}

function buildMarketplaceRows(
  items: MarketplaceItem[],
  priorityServices: ServiceName[] = [],
): MarketplaceRowGroup[] {
  const bestMatchItems = items.slice(0, 10);
  const rowDefinitions: Array<{
    description: string;
    id: string;
    items: MarketplaceItem[];
    serviceNames: ServiceName[];
    title: string;
  }> = [
    {
      description: "The strongest matches based on your event details.",
      id: "best-matches",
      items: bestMatchItems,
      serviceNames: [] as ServiceName[],
      title: "Best matches",
    },
    {
      description: "Spaces and venues for the event itself.",
      id: "venues",
      items: byServices(items, ["Venue"]),
      serviceNames: ["Venue"],
      title: "Venues",
    },
    {
      description: "Food, catering, cake, and dessert options.",
      id: "food-catering",
      items: byServices(items, ["Catering", "Cake & Desserts"]),
      serviceNames: ["Catering", "Cake & Desserts"],
      title: "Food and catering",
    },
    {
      description: "DJs, live music, and sound-forward services.",
      id: "music-djs",
      items: byServices(items, ["DJ", "Live Music"]),
      serviceNames: ["DJ", "Live Music"],
      title: "Music and DJs",
    },
    {
      description: "Tables, chairs, lounge, booths, and event equipment.",
      id: "rentals",
      items: byServices(items, ["Rentals", "Booth Rentals"]),
      serviceNames: ["Rentals", "Booth Rentals"],
      title: "Rentals",
    },
    {
      description: "Photographers, booths, and visual coverage.",
      id: "photo-video",
      items: byServices(items, ["Photography", "Photo Booth"]),
      serviceNames: ["Photography", "Photo Booth"],
      title: "Photo and video",
    },
    {
      description: "Performers and specialty entertainment when appropriate.",
      id: "entertainment",
      items: byServices(items, ["Magic", "Character Performers", "Bounce Houses"]),
      serviceNames: ["Magic", "Character Performers", "Bounce Houses"],
      title: "Entertainment",
    },
    {
      description: "Florals, invitations, programs, and presentation details.",
      id: "decor",
      items: byServices(items, ["Florals", "Balloons", "Invitations", "Printed Programs", "Printed Materials"]),
      serviceNames: ["Florals", "Balloons", "Invitations", "Printed Programs", "Printed Materials"],
      title: "Decor",
    },
    {
      description: "Support teams for guest flow and event operations.",
      id: "security-staffing",
      items: byServices(items, ["Staffing", "Security", "Registration", "Bartending", "Valet"]),
      serviceNames: ["Staffing", "Security", "Registration", "Bartending", "Valet"],
      title: "Security and staffing",
    },
    {
      description: "Restrooms, production, livestreaming, and practical event support.",
      id: "restrooms-logistics",
      items: byServices(items, ["Portable Restrooms", "AV Production", "Live Streaming", "Cleaning"]),
      serviceNames: ["Portable Restrooms", "AV Production", "Live Streaming", "Cleaning"],
      title: "Restrooms and logistics",
    },
    {
      description: "Passenger movement, shuttles, and point-to-point event transport.",
      id: "transportation",
      items: byServices(items, ["Transportation", "Party Bus", "Valet"]),
      serviceNames: ["Transportation", "Party Bus", "Valet"],
      title: "Transportation",
    },
  ];

  const nonEmptyRows = rowDefinitions.filter((row) => row.items.length > 0);

  if (!priorityServices.length) {
    return nonEmptyRows;
  }

  const priorityRows = nonEmptyRows.filter((row) =>
    row.serviceNames.some((service) => priorityServices.includes(service)),
  );
  const remainingRows = nonEmptyRows.filter(
    (row) => !priorityRows.some((priorityRow) => priorityRow.id === row.id),
  );

  return [...priorityRows, ...remainingRows];
}

function byServices(items: MarketplaceItem[], services: ServiceName[]) {
  return items.filter(
    (item) => itemMatchesServices(item, services),
  ).slice(0, 12);
}

function itemMatchesServices(item: MarketplaceItem, services: ServiceName[]) {
  return (
    services.includes(item.type) ||
    item.services.some((service) => services.includes(service)) ||
    Boolean(item.serviceOptions?.some((option) => services.includes(option.service)))
  );
}

function rankByPlanningContext(
  items: MarketplaceItem[],
  context: EventPlanningContext,
) {
  return [...items].sort(
    (left, right) =>
      scoreMarketplaceContext(right, context) -
      scoreMarketplaceContext(left, context),
  );
}

function getCartAuthMessage(
  isAuthLoading: boolean,
  isLoggedIn: boolean,
  hasSavedEvent: boolean,
) {
  if (isAuthLoading) {
    return "Checking your account before syncing this quote cart.";
  }

  if (!isLoggedIn) {
    return "Log in to save your quote cart.";
  }

  if (!hasSavedEvent) {
    return "Save this event before syncing cart items or requesting quotes.";
  }

  return "This quote cart is ready to save.";
}

function getEntryModeLabel(entryMode: MarketplaceEntryMode) {
  if (entryMode === "service") {
    return "Vendor search";
  }

  if (entryMode === "browse") {
    return "Browse vendors";
  }

  if (entryMode === "category") {
    return "Vendor category";
  }

  return "Event marketplace";
}

function getLocationProfileFromEvent(event: EventRow): LocationProfile | null {
  const profile = event.event_profile;

  if (!isRecord(profile)) {
    return null;
  }

  const possibleProfile =
    profile.locationProfile ?? profile.location_profile ?? profile.location;

  if (!isRecord(possibleProfile)) {
    return null;
  }

  return possibleProfile as LocationProfile;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
