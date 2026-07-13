"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl, { type Map as MapboxMap } from "mapbox-gl";
import type { Coordinates } from "@/app/data/marketplace";
import { MAPBOX_ACCESS_TOKEN, MAPBOX_STYLE_ID, hasMapboxConfig } from "@/lib/maps/config";

type LocationPreviewMapProps = {
  coordinates?: Coordinates;
  label: string;
};

export function LocationPreviewMap({ coordinates, label }: LocationPreviewMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const center = coordinates ?? { lat: 34.0522, lng: -118.2437 };
  const canShowMap = hasMapboxConfig() && !hasFailed;

  useEffect(() => {
    if (!canShowMap || !containerRef.current || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
    const map = new mapboxgl.Map({
      attributionControl: false,
      center: [center.lng, center.lat],
      container: containerRef.current,
      dragRotate: false,
      interactive: true,
      pitchWithRotate: false,
      scrollZoom: true,
      style: getMapboxStyleUrl(),
      zoom: 13,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");
    map.on("error", () => setHasFailed(true));
    mapRef.current = map;

    const resizeTimeoutId = window.setTimeout(() => {
      try {
        map.resize();
      } catch {
        setHasFailed(true);
      }
    }, 0);

    return () => {
      window.clearTimeout(resizeTimeoutId);
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      if (mapRef.current === map) {
        mapRef.current = null;
      }
    };
    // Keep the map instance stable after initial mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canShowMap]);

  useEffect(() => {
    if (!mapRef.current || !canShowMap) {
      return;
    }

    mapRef.current.easeTo({
      center: [center.lng, center.lat],
      duration: 260,
      zoom: 13,
    });

    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ element: createMarker() })
        .setLngLat([center.lng, center.lat])
        .addTo(mapRef.current);
    } else {
      markerRef.current.setLngLat([center.lng, center.lat]);
    }
  }, [canShowMap, center.lat, center.lng]);

  if (!canShowMap) {
    return <FallbackLocationPreview label={label} />;
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-3 top-3 max-w-[80%] rounded-full bg-white/92 px-3 py-2 text-xs font-semibold text-neutral-800 shadow-[0_12px_28px_rgba(13,19,33,0.12)] backdrop-blur">
        {label}
      </div>
    </div>
  );
}

function FallbackLocationPreview({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 bg-[linear-gradient(135deg,#e9eee8,#f7f3ed)]">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.45)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.45)_1px,transparent_1px)] bg-[size:30px_30px]" />
      <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full bg-[#0D1321] text-sm font-semibold text-[#D4AF37] shadow-[0_18px_42px_rgba(13,19,33,0.28)]">
        A
      </div>
      <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-neutral-700">
        {label}
      </div>
    </div>
  );
}

function createMarker() {
  const element = document.createElement("div");
  element.className =
    "flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-white bg-[#0D1321] text-sm font-semibold text-[#D4AF37] shadow-[0_18px_42px_rgba(13,19,33,0.28)]";
  element.textContent = "A";

  return element;
}

function getMapboxStyleUrl() {
  if (MAPBOX_STYLE_ID.startsWith("mapbox://")) {
    return MAPBOX_STYLE_ID;
  }

  return `mapbox://styles/${MAPBOX_STYLE_ID}`;
}
