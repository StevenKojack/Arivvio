"use client";

import { useEffect, useMemo, useRef } from "react";
import mapboxgl, {
  type LngLatBoundsLike,
  type Map as MapboxMap,
} from "mapbox-gl";
import type { Coordinates, MarketplaceItem, ServiceName } from "@/app/data/marketplace";
import { getVendorImage } from "@/lib/marketplace/vendorImages";
import { MAPBOX_ACCESS_TOKEN, MAPBOX_STYLE_ID, hasMapboxConfig } from "@/lib/maps/config";

export type MarketplaceMapPin = {
  isActiveRowMatch: boolean;
  isCarted: boolean;
  isCompletedCategory?: boolean;
  item: MarketplaceItem;
};

type MarketplaceMapProps = {
  activeCategory: string;
  cartedIds: number[];
  eventCoordinates?: Coordinates;
  hoveredItemId: number | null;
  layout?: "panel" | "sheet" | "sticky";
  pins: MarketplaceMapPin[];
  selectedItemId: number | null;
  onAddItem: (item: MarketplaceItem) => void;
  onHoverItem: (itemId: number | null) => void;
  onSelectItem: (item: MarketplaceItem) => void;
};

const categoryColors: Partial<Record<ServiceName, string>> = {
  Venue: "#111111",
  Catering: "#7a4f2b",
  "Cake & Desserts": "#be123c",
  DJ: "#4f46e5",
  "Live Music": "#4f46e5",
  Balloons: "#be185d",
  "Bounce Houses": "#db2777",
  Rentals: "#0f766e",
  Photography: "#7c3aed",
  "Photo Booth": "#7c3aed",
  Florals: "#be185d",
  Magic: "#6d28d9",
  "Character Performers": "#db2777",
  Security: "#b45309",
  Staffing: "#b45309",
  Bartending: "#7a4f2b",
  Transportation: "#0369a1",
  "Party Bus": "#0369a1",
  Valet: "#0369a1",
  Cleaning: "#475569",
  "Portable Restrooms": "#475569",
  "AV Production": "#334155",
  "Booth Rentals": "#0f766e",
  Registration: "#334155",
  Invitations: "#be185d",
  "Printed Materials": "#475569",
  "Printed Programs": "#475569",
  "Live Streaming": "#334155",
};

const fallbackBounds = {
  maxLat: 34.32,
  maxLng: -118.05,
  minLat: 33.88,
  minLng: -118.55,
};

type MarkerEntry = {
  marker: mapboxgl.Marker;
  signature: string;
};

export function MarketplaceMap({
  activeCategory,
  cartedIds,
  eventCoordinates,
  hoveredItemId,
  layout = "sticky",
  pins,
  selectedItemId,
  onAddItem,
  onHoverItem,
  onSelectItem,
}: MarketplaceMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRefs = useRef<Map<number, MarkerEntry>>(new Map());
  const eventMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const pinsRef = useRef<MarketplaceMapPin[]>(pins);
  const viewportSignatureRef = useRef("");
  const isSheet = layout === "sheet";
  const isSticky = layout === "sticky";
  const pinsWithCoordinates = useMemo(
    () => pins.filter((pin) => isValidCoordinates(pin.item.coordinates)),
    [pins],
  );
  const eventPoint = isValidCoordinates(eventCoordinates) ? eventCoordinates : undefined;
  const visiblePoints = useMemo(() => {
    const points = pinsWithCoordinates.map((pin) => pin.item.coordinates);
    return eventPoint ? [eventPoint, ...points] : points;
  }, [eventPoint, pinsWithCoordinates]);
  const bounds = useMemo(() => getBounds(visiblePoints), [visiblePoints]);
  const center = eventPoint ?? getCenter(visiblePoints);
  const initialCenterRef = useRef(center);
  const initialZoomRef = useRef(eventPoint ? 10 : 9);
  const hasInteractiveMap = hasMapboxConfig();

  useEffect(() => {
    pinsRef.current = pinsWithCoordinates;
  }, [pinsWithCoordinates]);

  useEffect(() => {
    if (!hasInteractiveMap || !mapContainerRef.current || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
    const map = new mapboxgl.Map({
      attributionControl: false,
      center: [initialCenterRef.current.lng, initialCenterRef.current.lat],
      container: mapContainerRef.current,
      cooperativeGestures: false,
      dragRotate: false,
      pitchWithRotate: false,
      scrollZoom: true,
      style: getMapboxStyleUrl(),
      zoom: initialZoomRef.current,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");
    const handleMapLoad = () => resizeMapSafely(map);
    const resizeTimeoutId = window.setTimeout(() => resizeMapSafely(map), 0);
    map.on("load", handleMapLoad);
    mapRef.current = map;
    const markerStore = markerRefs.current;

    return () => {
      window.clearTimeout(resizeTimeoutId);
      map.off("load", handleMapLoad);
      markerStore.forEach(({ marker }) => marker.remove());
      markerStore.clear();
      eventMarkerRef.current?.remove();
      eventMarkerRef.current = null;
      popupRef.current?.remove();
      popupRef.current = null;
      map.remove();
      if (mapRef.current === map) {
        mapRef.current = null;
      }
    };
  }, [hasInteractiveMap]);

  useEffect(() => {
    if (!mapRef.current || !hasInteractiveMap) {
      return;
    }

    const map = mapRef.current;
    const resizeTimeoutId = window.setTimeout(() => {
      if (mapRef.current === map) {
        resizeMapSafely(map);
      }
    }, 0);

    return () => window.clearTimeout(resizeTimeoutId);
  }, [hasInteractiveMap, layout]);

  useEffect(() => {
    if (!mapRef.current || !hasInteractiveMap) {
      return;
    }

    const map = mapRef.current;

    if (!popupRef.current) {
      popupRef.current = new mapboxgl.Popup({
        className: "arivio-map-popup",
        closeButton: true,
        closeOnClick: false,
        maxWidth: "320px",
        offset: 22,
      });
    }

    if (eventPoint) {
      if (!eventMarkerRef.current) {
        eventMarkerRef.current = new mapboxgl.Marker({
          element: createEventMarker(),
        })
          .setLngLat([eventPoint.lng, eventPoint.lat])
          .addTo(map);
      } else {
        eventMarkerRef.current.setLngLat([eventPoint.lng, eventPoint.lat]);
      }
    } else if (eventMarkerRef.current) {
      eventMarkerRef.current.remove();
      eventMarkerRef.current = null;
    }

    const closePopup = () => {
      popupRef.current?.remove();
    };

    map.on("click", closePopup);

    const nextIds = new Set(pinsWithCoordinates.map((pin) => pin.item.id));

    markerRefs.current.forEach((entry, itemId) => {
      if (!nextIds.has(itemId)) {
        entry.marker.remove();
        markerRefs.current.delete(itemId);
      }
    });

    pinsWithCoordinates.forEach((pin) => {
      const isCarted = cartedIds.includes(pin.item.id) || pin.isCarted;
      const signature = `${pin.item.type}:${pin.isActiveRowMatch}:${isCarted}:${Boolean(pin.isCompletedCategory)}`;
      const existingEntry = markerRefs.current.get(pin.item.id);

      if (existingEntry?.signature === signature) {
        existingEntry.marker.setLngLat([pin.item.coordinates.lng, pin.item.coordinates.lat]);
        return;
      }

      existingEntry?.marker.remove();
      const markerElement = createProviderMarker({
        color: categoryColors[pin.item.type] ?? "#111111",
        isActive: pin.isActiveRowMatch,
        isCarted,
        isCompleted: Boolean(pin.isCompletedCategory),
        item: pin.item,
      });

      markerElement.addEventListener("mouseenter", () => {
        onHoverItem(pin.item.id);
      });
      markerElement.addEventListener("mouseleave", () => {
        onHoverItem(null);
      });
      markerElement.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelectItem(pin.item);
        popupRef.current
          ?.setLngLat([pin.item.coordinates.lng, pin.item.coordinates.lat])
          .setHTML(getPopupHtml(pin.item))
          .addTo(map);
      });

      const marker = new mapboxgl.Marker({ element: markerElement })
        .setLngLat([pin.item.coordinates.lng, pin.item.coordinates.lat])
        .addTo(map);
      markerRefs.current.set(pin.item.id, { marker, signature });
    });
    return () => {
      map.off("click", closePopup);
    };
  }, [
    cartedIds,
    eventPoint,
    hasInteractiveMap,
    onHoverItem,
    onSelectItem,
    pinsWithCoordinates,
  ]);

  useEffect(() => {
    if (!hasInteractiveMap) {
      return;
    }

    markerRefs.current.forEach(({ marker }) => {
      const element = marker.getElement();
      const itemId = Number(element.dataset.arivioItemId);
      const isFocused = itemId === hoveredItemId || itemId === selectedItemId;

      element.classList.toggle("scale-110", isFocused);
      element.classList.toggle("ring-4", isFocused);
      element.classList.toggle("ring-neutral-950/10", isFocused);
      element.classList.toggle("shadow-[0_24px_56px_rgba(20,20,20,0.28)]", isFocused);
    });
  }, [hasInteractiveMap, hoveredItemId, selectedItemId]);

  useEffect(() => {
    if (!mapRef.current || !hasInteractiveMap || !selectedItemId) {
      return;
    }

    const selectedPin = pinsWithCoordinates.find((pin) => pin.item.id === selectedItemId);

    if (!selectedPin || !isValidCoordinates(selectedPin.item.coordinates)) {
      return;
    }

    popupRef.current
      ?.setLngLat([selectedPin.item.coordinates.lng, selectedPin.item.coordinates.lat])
      .setHTML(getPopupHtml(selectedPin.item))
      .addTo(mapRef.current);
  }, [hasInteractiveMap, pinsWithCoordinates, selectedItemId]);

  useEffect(() => {
    function handlePopupAction(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("[data-arivio-add-quote]");
      const itemId = Number(button?.getAttribute("data-arivio-add-quote"));

      if (!itemId) {
        if (
          target &&
          !target.closest(".mapboxgl-popup") &&
          !target.closest(".mapboxgl-marker")
        ) {
          popupRef.current?.remove();
        }
        return;
      }

      const pin = pinsRef.current.find((candidate) => candidate.item.id === itemId);

      if (pin) {
        onAddItem(pin.item);
      }
    }

    document.addEventListener("click", handlePopupAction);

    return () => document.removeEventListener("click", handlePopupAction);
  }, [onAddItem]);

  useEffect(() => {
    if (!mapRef.current || !hasInteractiveMap) {
      return;
    }

    const map = mapRef.current;
    const nextBounds = toLngLatBounds(bounds);
    const viewportSignature = `${bounds.minLat.toFixed(4)}:${bounds.maxLat.toFixed(4)}:${bounds.minLng.toFixed(4)}:${bounds.maxLng.toFixed(4)}:${visiblePoints.length}`;

    if (viewportSignatureRef.current === viewportSignature) {
      return;
    }

    viewportSignatureRef.current = viewportSignature;

    if (!visiblePoints.length) {
      map.easeTo({
        center: [center.lng, center.lat],
        duration: 0,
        zoom: 9,
      });
      return;
    }

    map.fitBounds(nextBounds, {
      duration: 120,
      maxZoom: eventPoint ? 12 : 10.5,
      padding: isSheet
        ? { bottom: 86, left: 36, right: 36, top: 82 }
        : { bottom: 96, left: 56, right: 56, top: 92 },
    });
  }, [bounds, center.lat, center.lng, eventPoint, hasInteractiveMap, isSheet, visiblePoints.length]);

  return (
    <section
      className={`overflow-hidden rounded-[34px] border border-neutral-200 bg-[#e9eee8] shadow-[0_28px_90px_rgba(20,20,20,0.14)] ${
        isSticky ? "" : "relative"
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/70 bg-white/85 px-5 py-4 backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Interactive marketplace map
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-neutral-950">
            {activeCategory}
          </h2>
        </div>
        <span className="rounded-full bg-neutral-950 px-3 py-1 text-xs font-semibold text-white">
          {pinsWithCoordinates.length} pins
        </span>
      </div>
      <div
        className={`relative overflow-hidden ${
          isSheet
            ? "h-[68vh] min-h-[420px]"
            : "h-[calc(100vh-8.25rem)] min-h-[560px]"
        }`}
      >
        {hasInteractiveMap ? (
          <div className="absolute inset-0">
            <div ref={mapContainerRef} style={{ height: "100%", width: "100%" }} />
          </div>
        ) : (
          <FallbackMap
            bounds={bounds}
            cartedIds={cartedIds}
            eventCoordinates={eventPoint}
            hoveredItemId={hoveredItemId}
            pins={pinsWithCoordinates}
            selectedItemId={selectedItemId}
            onHoverItem={onHoverItem}
            onSelectItem={onSelectItem}
          />
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.38),transparent)]" />

        <div className="absolute bottom-5 left-5 right-5 rounded-3xl bg-white/90 p-4 shadow-[0_18px_50px_rgba(20,20,20,0.12)] backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-neutral-950">
              {hasInteractiveMap
                ? "Drag, pan, and zoom around nearby providers"
                : "Map preview with provider locations"}
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <LegendDot color="#111111" label="active row" />
              <LegendDot color="#256f4a" label="selected" />
              <LegendDot color="#2563eb" label="event" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FallbackMap({
  bounds,
  cartedIds,
  eventCoordinates,
  hoveredItemId,
  pins,
  selectedItemId,
  onHoverItem,
  onSelectItem,
}: {
  bounds: ReturnType<typeof getBounds>;
  cartedIds: number[];
  eventCoordinates?: Coordinates;
  hoveredItemId: number | null;
  pins: MarketplaceMapPin[];
  selectedItemId: number | null;
  onHoverItem: (itemId: number | null) => void;
  onSelectItem: (item: MarketplaceItem) => void;
}) {
  return (
    <div className="absolute inset-0 bg-[linear-gradient(135deg,#e6ece6,#f4efe8)]">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:40px_40px]" />
      <div className="absolute left-[12%] top-[24%] h-24 w-[70%] -rotate-6 rounded-full border border-white/70" />
      <div className="absolute left-[18%] top-[54%] h-28 w-[64%] rotate-12 rounded-full border border-white/70" />

      {eventCoordinates ? (
        <MapMarker label="Event" position={toPosition(eventCoordinates, bounds)} />
      ) : null}

      {pins.map((pin) => {
        const isHovered = hoveredItemId === pin.item.id;
        const isSelected = selectedItemId === pin.item.id;
        const isCarted = cartedIds.includes(pin.item.id) || pin.isCarted;
        const isCompleted = Boolean(pin.isCompletedCategory);
        const color = categoryColors[pin.item.type] ?? "#111111";

        return (
          <button
            key={pin.item.id}
            type="button"
            onClick={() => onSelectItem(pin.item)}
            onMouseEnter={() => onHoverItem(pin.item.id)}
            onMouseLeave={() => onHoverItem(null)}
            className={`absolute z-20 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-white shadow-[0_18px_44px_rgba(20,20,20,0.25)] transition duration-200 hover:-translate-y-[58%] ${
              isSelected || isHovered
                ? "scale-110 ring-4 ring-neutral-950/10"
                : isCarted
                  ? "ring-4 ring-emerald-600/25"
                  : isCompleted
                    ? "opacity-45 grayscale"
                  : pin.isActiveRowMatch
                    ? ""
                    : "opacity-80"
            }`}
            style={{
              backgroundColor: isCarted ? "#256f4a" : color,
              left: `${toPosition(pin.item.coordinates, bounds).x}%`,
              top: `${toPosition(pin.item.coordinates, bounds).y}%`,
            }}
          >
            <span dangerouslySetInnerHTML={{ __html: getServiceIcon(pin.item.type, 18) }} />
          </button>
        );
      })}
    </div>
  );
}

function createProviderMarker({
  color,
  isActive,
  isCarted,
  isCompleted,
  item,
}: {
  color: string;
  isActive: boolean;
  isCarted: boolean;
  isCompleted: boolean;
  item: MarketplaceItem;
}) {
  const marker = document.createElement("button");
  marker.type = "button";
  marker.dataset.arivioItemId = String(item.id);
  marker.dataset.arivioCarted = String(isCarted);
  marker.innerHTML = `
    <span class="relative z-10">${getServiceIcon(item.type, 18)}</span>
    ${isCarted ? '<span class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-white"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4 10-10"/></svg></span>' : ""}
    <span class="absolute -bottom-1.5 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rotate-45 rounded-[3px] border-b-2 border-r-2 border-white" style="background:${isCarted ? "#256f4a" : color};"></span>
  `;
  marker.style.backgroundColor = isCarted ? "#256f4a" : color;
  marker.className = [
    "relative",
    "flex",
    "h-11",
    "w-11",
    "items-center",
    "justify-center",
    "rounded-full",
    "border-2",
    "border-white",
    "text-white",
    "shadow-[0_18px_44px_rgba(20,20,20,0.25)]",
    "transition",
    "duration-200",
    "ease-out",
    "hover:scale-110",
    "hover:ring-4",
    "hover:ring-neutral-950/10",
    "hover:shadow-[0_24px_56px_rgba(20,20,20,0.28)]",
    isCarted ? "ring-4 ring-emerald-600/30" : "",
    isCompleted && !isCarted ? "opacity-45 grayscale" : "",
    isActive || isCarted || isCompleted ? "" : "opacity-80",
  ]
    .filter(Boolean)
    .join(" ");

  return marker;
}

function createEventMarker() {
  const marker = document.createElement("div");
  marker.textContent = "Event";
  marker.className =
    "rounded-full border-2 border-white bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-[0_18px_44px_rgba(20,20,20,0.25)]";

  return marker;
}

function getPopupHtml(item: MarketplaceItem) {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; width: 292px; overflow: hidden; border-radius: 22px; background: #fff;">
      <div style="height: 156px; background-image: linear-gradient(180deg, transparent 45%, rgba(0,0,0,.48)), url('${escapeHtml(
        getVendorImage(item),
      )}'); background-size: cover; background-position: center; position: relative;">
        <div style="position: absolute; left: 12px; bottom: 12px; display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; background: rgba(255,255,255,.92); padding: 6px 10px; color: #111; font-size: 12px; font-weight: 700;">
          ${getServiceIcon(item.type, 14)}
          ${escapeHtml(item.type)}
        </div>
      </div>
      <div style="padding: 14px 14px 16px;">
        <div style="display: flex; align-items: start; justify-content: space-between; gap: 12px;">
          <p style="margin: 0; font-size: 15px; line-height: 1.25; font-weight: 800; color: #111;">${escapeHtml(
            item.name,
          )}</p>
          <p style="margin: 1px 0 0; white-space: nowrap; font-size: 13px; font-weight: 700; color: #111;">${item.rating.toFixed(
            1,
          )}</p>
        </div>
        <p style="margin: 7px 0 0; font-size: 13px; line-height: 1.45; color: #666;">${escapeHtml(
          item.location,
        )}</p>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 12px;">
          <p style="margin: 0; font-size: 13px; font-weight: 800; color: #111;">${escapeHtml(
            item.price,
          )}</p>
          <div style="display: flex; align-items: center; gap: 6px;">
            <a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer" style="border-radius: 999px; border: 1px solid #e5e5e5; color: #333; padding: 8px 10px; font-size: 12px; font-weight: 800; text-decoration: none;">Details</a>
            <button type="button" data-arivio-add-quote="${item.id}" style="border: 0; border-radius: 999px; background: #111; color: #fff; cursor: pointer; padding: 8px 12px; font-size: 12px; font-weight: 800;">Add</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function MapMarker({
  label,
  position,
}: {
  label: string;
  position: { x: number; y: number };
}) {
  return (
    <div
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-[0_18px_44px_rgba(20,20,20,0.25)]"
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
    >
      {label}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-neutral-600">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function getServiceIcon(service: ServiceName, size = 14) {
  const icons = serviceIcons(serviceIconBase(size));

  return icons[service] ?? icons.Venue ?? "";
}

function serviceIconBase(size: number) {
  return `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
}

function serviceIcons(svgBase: string): Partial<Record<ServiceName, string>> {
  return {
  Venue: `<svg ${svgBase}><path d="M3 21h18"/><path d="M5 21V9l7-5 7 5v12"/><path d="M9 21v-7h6v7"/></svg>`,
  Catering: `<svg ${svgBase}><path d="M4 11a8 8 0 0 0 16 0"/><path d="M3 11h18"/><path d="M12 3v4"/><path d="M8 5v2"/><path d="M16 5v2"/></svg>`,
  "Cake & Desserts": `<svg ${svgBase}><path d="M4 21h16"/><path d="M5 21v-7h14v7"/><path d="M7 14V9h10v5"/><path d="M9 9V5"/><path d="M15 9V5"/></svg>`,
  DJ: `<svg ${svgBase}><path d="M9 18V5l10-2v13"/><circle cx="7" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>`,
  "Live Music": `<svg ${svgBase}><path d="M12 14a4 4 0 0 0 4-4V5a4 4 0 0 0-8 0v5a4 4 0 0 0 4 4Z"/><path d="M19 10a7 7 0 0 1-14 0"/><path d="M12 17v4"/></svg>`,
  Magic: `<svg ${svgBase}><path d="m4 20 10-10"/><path d="m14 10 6-6"/><path d="m12 4 2 2 2-2"/><path d="m18 10 2 2 2-2"/><path d="M4 8l2 2 2-2"/></svg>`,
  "Character Performers": `<svg ${svgBase}><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/><path d="M12 22a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"/></svg>`,
  Balloons: `<svg ${svgBase}><path d="M12 14c3 0 5-2.5 5-5.5S14.8 3 12 3 7 5.5 7 8.5 9 14 12 14Z"/><path d="m10 14 2 2 2-2"/><path d="M12 16v6"/></svg>`,
  "Bounce Houses": `<svg ${svgBase}><path d="M4 20V9l4-4 4 4 4-4 4 4v11"/><path d="M8 20v-6h8v6"/><path d="M4 9h16"/></svg>`,
  "Photo Booth": `<svg ${svgBase}><path d="M4 8h4l2-3h4l2 3h4v11H4z"/><circle cx="12" cy="13" r="3"/></svg>`,
  Photography: `<svg ${svgBase}><path d="M4 8h4l2-3h4l2 3h4v11H4z"/><circle cx="12" cy="13" r="3"/></svg>`,
  Rentals: `<svg ${svgBase}><path d="M7 21v-7"/><path d="M17 21v-7"/><path d="M5 14h14"/><path d="M8 14V5h8v9"/></svg>`,
  Florals: `<svg ${svgBase}><path d="M12 22V12"/><path d="M12 12c-4-1-5-4-3-7 3 1 5 3 3 7Z"/><path d="M12 12c4-1 5-4 3-7-3 1-5 3-3 7Z"/><path d="M12 12c-3 2-6 1-8-2 3-2 6-1 8 2Z"/></svg>`,
  Invitations: `<svg ${svgBase}><path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/></svg>`,
  "AV Production": `<svg ${svgBase}><path d="M4 7h16v10H4z"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>`,
  Registration: `<svg ${svgBase}><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>`,
  "Printed Materials": `<svg ${svgBase}><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/><path d="M9 14h6"/><path d="M9 18h6"/></svg>`,
  "Printed Programs": `<svg ${svgBase}><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/><path d="M9 14h6"/><path d="M9 18h6"/></svg>`,
  "Live Streaming": `<svg ${svgBase}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3Z"/></svg>`,
  Transportation: `<svg ${svgBase}><path d="M5 17h14l-1.5-6h-11Z"/><path d="M7 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/><path d="M17 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/><path d="M8 11V6h8v5"/></svg>`,
  "Party Bus": `<svg ${svgBase}><path d="M4 16V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9"/><path d="M4 12h16"/><path d="M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M8 5v7"/><path d="M16 5v7"/></svg>`,
  Valet: `<svg ${svgBase}><path d="M5 17h14l-2-6H7Z"/><path d="M7 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/><path d="M17 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/><path d="M12 3v5"/><path d="m9 6 3-3 3 3"/></svg>`,
  Security: `<svg ${svgBase}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/></svg>`,
  Staffing: `<svg ${svgBase}><path d="M16 21v-2a4 4 0 0 0-8 0v2"/><circle cx="12" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M2 21v-2a4 4 0 0 1 3-3.87"/></svg>`,
  Bartending: `<svg ${svgBase}><path d="M6 3h12l-6 8v7"/><path d="M9 21h6"/><path d="M8 7h8"/></svg>`,
  Cleaning: `<svg ${svgBase}><path d="m3 21 6-6"/><path d="m14 4 6 6"/><path d="m7 17 10-10"/><path d="M16 8l-2-2 2-2 4 4-2 2Z"/></svg>`,
  "Booth Rentals": `<svg ${svgBase}><path d="M4 21V8l8-5 8 5v13"/><path d="M8 21v-8h8v8"/><path d="M8 13h8"/></svg>`,
  "Portable Restrooms": `<svg ${svgBase}><path d="M7 21V5a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v16"/><path d="M9 9h6"/><path d="M12 9v12"/></svg>`,
  };
}

function getMapboxStyleUrl() {
  if (MAPBOX_STYLE_ID.startsWith("mapbox://")) {
    return MAPBOX_STYLE_ID;
  }

  return `mapbox://styles/${MAPBOX_STYLE_ID}`;
}

function getBounds(points: Coordinates[]) {
  if (!points.length) {
    return fallbackBounds;
  }

  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latPadding = Math.max((maxLat - minLat) * 0.2, 0.025);
  const lngPadding = Math.max((maxLng - minLng) * 0.2, 0.025);

  return {
    maxLat: maxLat + latPadding,
    maxLng: maxLng + lngPadding,
    minLat: minLat - latPadding,
    minLng: minLng - lngPadding,
  };
}

function getCenter(points: Coordinates[]) {
  const bounds = getBounds(points);

  return {
    lat: (bounds.minLat + bounds.maxLat) / 2,
    lng: (bounds.minLng + bounds.maxLng) / 2,
  };
}

function isValidCoordinates(value?: Coordinates | null): value is Coordinates {
  return Boolean(
    value &&
      Number.isFinite(value.lat) &&
      Number.isFinite(value.lng) &&
      Math.abs(value.lat) <= 90 &&
      Math.abs(value.lng) <= 180,
  );
}

function resizeMapSafely(map: MapboxMap | null) {
  if (!map) {
    return;
  }

  try {
    map.resize();
  } catch {
    // Mapbox can throw if a resize races with React unmounting or rerendering the container.
  }
}

function toLngLatBounds(bounds: ReturnType<typeof getBounds>): LngLatBoundsLike {
  return [
    [bounds.minLng, bounds.minLat],
    [bounds.maxLng, bounds.maxLat],
  ];
}

function toPosition(point: Coordinates, bounds: ReturnType<typeof getBounds>) {
  const x =
    ((point.lng - bounds.minLng) / Math.max(bounds.maxLng - bounds.minLng, 0.01)) *
      82 +
    9;
  const y =
    91 -
    ((point.lat - bounds.minLat) / Math.max(bounds.maxLat - bounds.minLat, 0.01)) *
      82;

  return { x, y };
}
