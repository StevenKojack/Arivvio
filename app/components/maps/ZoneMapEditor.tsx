"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import mapboxgl, {
  type LngLatBoundsLike,
  type Map as MapboxMap,
} from "mapbox-gl";
import type { Coordinates } from "@/app/data/marketplace";
import { MAPBOX_ACCESS_TOKEN, MAPBOX_STYLE_ID, hasMapboxConfig } from "@/lib/maps/config";
import {
  createPolygonZone,
  createRadiusZone,
  formatZoneSummary,
  getCirclePolygon,
  getZoneBounds,
  getZoneCenter,
  metersToMiles,
  milesToMeters,
  type PlanningZone,
  validatePlanningZone,
} from "@/lib/maps/zones";

export type MapZone = PlanningZone;

type ZoneMapEditorProps = {
  children?: ReactNode;
  compact?: boolean;
  defaultLabel: string;
  heightClassName?: string;
  mapCenter?: Coordinates;
  mapZoom?: number;
  onZonesChange: (zones: MapZone[]) => void;
  singleZone?: boolean;
  subtitle?: string;
  title: string;
  zones: MapZone[];
};

type DrawMode = "idle" | "radius" | "polygon";
type MapState = "fallback" | "loading" | "ready" | "error";
type GeoJsonData = Parameters<mapboxgl.GeoJSONSource["setData"]>[0];

const zoneSourceId = "arivvio-zone-source";
const zoneFillLayerId = "arivvio-zone-fill";
const zoneLineLayerId = "arivvio-zone-line";

export function ZoneMapEditor({
  children,
  compact = false,
  defaultLabel,
  heightClassName,
  mapCenter,
  mapZoom = 10,
  onZonesChange,
  singleZone = false,
  subtitle,
  title,
  zones,
}: ZoneMapEditorProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const centerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const vertexMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const mapLoadedRef = useRef(false);
  const clickHandlerRef = useRef<((event: mapboxgl.MapMouseEvent) => void) | null>(null);
  const [activeTool, setActiveTool] = useState<MapZone["type"]>(zones[0]?.type ?? "radius");
  const [selectedZoneId, setSelectedZoneId] = useState(zones[0]?.id ?? "");
  const [drawMode, setDrawMode] = useState<DrawMode>("idle");
  const [mapState, setMapState] = useState<MapState>(hasMapboxConfig() ? "loading" : "fallback");
  const [statusMessage, setStatusMessage] = useState("");
  const [draftPoints, setDraftPoints] = useState<Coordinates[]>([]);
  const anchor = mapCenter ?? (zones[0] ? getZoneCenter(zones[0]) : getDefaultCenter());
  const hasInteractiveMap = hasMapboxConfig();
  const visibleZones = useMemo(
    () => (singleZone ? zones.slice(0, 1) : zones),
    [singleZone, zones],
  );
  const selectedZone =
    visibleZones.find((zone) => zone.id === selectedZoneId) ?? visibleZones[0] ?? null;
  const effectiveTool = selectedZone?.type ?? activeTool;
  const validatedMessage = validatePlanningZone(selectedZone);

  const updateZones = useCallback(
    (nextZones: MapZone[]) => {
      onZonesChange(singleZone ? nextZones.slice(0, 1) : nextZones);
    },
    [onZonesChange, singleZone],
  );

  const updateSelectedZone = useCallback(
    (updater: (zone: MapZone) => MapZone) => {
      if (!selectedZone) {
        return;
      }

      updateZones(
        visibleZones.map((zone) => (zone.id === selectedZone.id ? updater(zone) : zone)),
      );
    },
    [selectedZone, updateZones, visibleZones],
  );

  useEffect(() => {
    if (!hasInteractiveMap || !mapContainerRef.current || mapRef.current) {
      return;
    }

    setMapState("loading");
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    const map = new mapboxgl.Map({
      attributionControl: false,
      center: [anchor.lng, anchor.lat],
      container: mapContainerRef.current,
      cooperativeGestures: false,
      dragRotate: false,
      pitchWithRotate: false,
      scrollZoom: true,
      style: getMapboxStyleUrl(),
      zoom: mapZoom,
    });

    const handleLoad = () => {
      mapLoadedRef.current = true;
      ensureZoneLayers(map);
      updateZoneSource(map, selectedZone);
      resizeMapSafely(map);
      setMapState("ready");
      setStatusMessage(selectedZone?.saved ? "Saved area restored." : "");
    };

    const handleError = () => {
      setMapState("error");
      setStatusMessage("The map could not finish loading. You can retry or use the fallback area.");
    };

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");
    map.on("load", handleLoad);
    map.on("error", handleError);
    mapRef.current = map;

    const resizeTimeoutId = window.setTimeout(() => resizeMapSafely(map), 0);

    return () => {
      window.clearTimeout(resizeTimeoutId);
      map.off("load", handleLoad);
      map.off("error", handleError);
      clearMarker(centerMarkerRef);
      clearVertexMarkers(vertexMarkersRef);
      map.remove();
      mapLoadedRef.current = false;
      if (mapRef.current === map) {
        mapRef.current = null;
      }
    };
    // The map instance should stay stable after initial mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInteractiveMap]);

  useEffect(() => {
    if (!mapRef.current || !hasInteractiveMap || !mapLoadedRef.current) {
      return;
    }

    updateZoneSource(mapRef.current, selectedZone);
    updateZoneMarkers({
      map: mapRef.current,
      selectedZone,
      centerMarkerRef,
      vertexMarkersRef,
      onCenterChange: (center) => {
        updateSelectedZone((zone) =>
          zone.type === "radius" ? { ...zone, center, saved: false } : zone,
        );
        setStatusMessage("Area moved. Confirm when it looks right.");
      },
      onVertexChange: (index, point) => {
        updateSelectedZone((zone) =>
          zone.type === "polygon"
            ? {
                ...zone,
                center: getZoneCenter({ ...zone, points: replaceAt(zone.points, index, point) }),
                points: replaceAt(zone.points, index, point),
                saved: false,
              }
            : zone,
        );
        setStatusMessage("Freeform point moved. Confirm when it looks right.");
      },
    });
  }, [hasInteractiveMap, selectedZone, updateSelectedZone]);

  useEffect(() => {
    if (!mapRef.current || !hasInteractiveMap || !mapLoadedRef.current || selectedZone) {
      return;
    }

    mapRef.current.easeTo({
      center: [anchor.lng, anchor.lat],
      duration: 260,
      zoom: mapZoom,
    });
  }, [anchor.lat, anchor.lng, hasInteractiveMap, mapZoom, selectedZone]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !hasInteractiveMap || !mapLoadedRef.current) {
      return;
    }

    if (clickHandlerRef.current) {
      map.off("click", clickHandlerRef.current);
      clickHandlerRef.current = null;
    }

    if (drawMode === "idle") {
      return;
    }

    const handler = (event: mapboxgl.MapMouseEvent) => {
      const point = { lat: event.lngLat.lat, lng: event.lngLat.lng };

      if (drawMode === "radius") {
        const nextZone = createRadiusZone({
          center: point,
          id: selectedZone?.type === "radius" ? selectedZone.id : undefined,
          label: defaultLabel,
          radiusMeters: selectedZone?.type === "radius" ? selectedZone.radiusMeters : milesToMeters(7.5),
        });

        updateZones(singleZone ? [nextZone] : upsertZone(visibleZones, nextZone));
        setSelectedZoneId(nextZone.id);
        setDrawMode("idle");
        setStatusMessage("Circle placed. Adjust the radius or drag the center point.");
        return;
      }

      const nextPoints = [...draftPoints, point];
      const nextZone = createPolygonZone({
        id: selectedZone?.type === "polygon" ? selectedZone.id : undefined,
        label: defaultLabel,
        points: nextPoints,
      });

      setDraftPoints(nextPoints);
      updateZones(singleZone ? [nextZone] : upsertZone(visibleZones, nextZone));
      setSelectedZoneId(nextZone.id);
      setStatusMessage(
        nextPoints.length < 3
          ? "Add at least three points, then confirm the area."
          : "Freeform area preview ready. Add more points or confirm.",
      );
    };

    clickHandlerRef.current = handler;
    map.on("click", handler);

    return () => {
      map.off("click", handler);
      if (clickHandlerRef.current === handler) {
        clickHandlerRef.current = null;
      }
    };
  }, [
    defaultLabel,
    draftPoints,
    drawMode,
    hasInteractiveMap,
    selectedZone,
    singleZone,
    updateZones,
    visibleZones,
  ]);

  function selectTool(tool: MapZone["type"]) {
    setActiveTool(tool);
    setDrawMode("idle");
    setDraftPoints([]);

    if (selectedZone?.type === tool) {
      return;
    }

    const nextZone =
      tool === "radius"
        ? createRadiusZone({ center: anchor, label: defaultLabel })
        : createPolygonZone({ label: defaultLabel });

    updateZones(singleZone ? [nextZone] : [nextZone, ...visibleZones]);
    setSelectedZoneId(nextZone.id);
    setStatusMessage(
      tool === "radius"
        ? "Circle mode ready. Press Draw area, then click the map."
        : "Freeform mode ready. Press Draw area, then click map points.",
    );
  }

  function addZone(type = activeTool) {
    const nextZone =
      type === "radius"
        ? createRadiusZone({
            center: anchor,
            label: `${defaultLabel} ${visibleZones.length + 1}`,
          })
        : createPolygonZone({
            label: `${defaultLabel} ${visibleZones.length + 1}`,
          });

    updateZones([...visibleZones, nextZone]);
    setSelectedZoneId(nextZone.id);
    setStatusMessage("New zone ready.");
  }

  function startDrawing() {
    if (!hasInteractiveMap) {
      const nextZone = createRadiusZone({
        center: anchor,
        id: selectedZone?.type === "radius" ? selectedZone.id : undefined,
        label: defaultLabel,
        radiusMeters: selectedZone?.type === "radius" ? selectedZone.radiusMeters : milesToMeters(7.5),
      });

      updateZones(singleZone ? [nextZone] : upsertZone(visibleZones, nextZone));
      setSelectedZoneId(nextZone.id);
      setStatusMessage("Fallback area created from the selected location.");
      return;
    }

    const drawingTool = effectiveTool;

    if (drawingTool === "polygon") {
      setDraftPoints([]);
      const nextZone = createPolygonZone({
        id: selectedZone?.type === "polygon" ? selectedZone.id : undefined,
        label: defaultLabel,
      });

      updateZones(singleZone ? [nextZone] : upsertZone(visibleZones, nextZone));
      setSelectedZoneId(nextZone.id);
    }

    setDrawMode(drawingTool);
    setStatusMessage(
      drawingTool === "radius"
        ? "Click the map to place one circle."
        : "Click points on the map. Pan and zoom still work normally.",
    );
  }

  function confirmSelectedZone() {
    if (!selectedZone) {
      setStatusMessage("Draw an area first.");
      return;
    }

    const validation = validatePlanningZone(selectedZone);

    if (validation) {
      setStatusMessage(validation);
      return;
    }

    const confirmedZone = { ...selectedZone, saved: true } as MapZone;

    updateZones(
      visibleZones.map((zone) => (zone.id === confirmedZone.id ? confirmedZone : zone)),
    );
    setDrawMode("idle");
    setDraftPoints([]);
    setStatusMessage("Search area saved.");
    fitZone(mapRef.current, confirmedZone);
  }

  function clearSelectedZone() {
    if (!selectedZone) {
      return;
    }

    const nextZones = visibleZones.filter((zone) => zone.id !== selectedZone.id);

    updateZones(nextZones);
    setSelectedZoneId(nextZones[0]?.id ?? "");
    setDraftPoints([]);
    setDrawMode("idle");
    setStatusMessage("Area cleared. Draw a new one when ready.");
  }

  function updateRadius(value: string) {
    const radiusMeters = milesToMeters(Number(value));

    updateSelectedZone((zone) =>
      zone.type === "radius" ? { ...zone, radiusMeters, saved: false } : zone,
    );
    setStatusMessage("Radius changed. Confirm when it looks right.");
  }

  return (
    <div className="overflow-hidden rounded-[30px] border border-[#D4AF37]/16 bg-white shadow-[0_22px_70px_rgba(13,19,33,0.08)]">
      <div className="flex flex-col gap-4 border-b border-[#D4AF37]/14 bg-white/92 px-5 py-4 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            {title}
          </p>
          {subtitle ? (
            <p className="mt-1 text-sm font-semibold text-neutral-700">
              {subtitle}
            </p>
          ) : null}
          <p className="mt-2 text-xs font-semibold text-[#8A6A16]">
            {formatZoneSummary(selectedZone)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {(["radius", "polygon"] as const).map((tool) => (
            <button
              key={tool}
              type="button"
              onClick={() => selectTool(tool)}
              aria-pressed={effectiveTool === tool}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition hover:-translate-y-0.5 ${
                effectiveTool === tool
                  ? "bg-[#0D1321] text-white"
                  : "border border-[#D4AF37]/18 bg-white text-neutral-700 hover:border-[#D4AF37]/60"
              }`}
            >
              {tool === "radius" ? "Circle" : "Freeform"}
            </button>
          ))}
          {!singleZone ? (
            <button
              type="button"
              onClick={() => addZone()}
              className="rounded-full border border-[#D4AF37]/18 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 transition hover:-translate-y-0.5 hover:border-[#D4AF37]/60"
            >
              Add zone
            </button>
          ) : null}
          <button
            type="button"
          onClick={startDrawing}
            className="rounded-full border border-[#0D1321]/10 bg-[#FFFCF7] px-4 py-2 text-xs font-semibold text-[#0D1321] transition hover:-translate-y-0.5 hover:border-[#0D1321]/40"
          >
            Draw area
          </button>
          <button
            type="button"
            onClick={confirmSelectedZone}
            disabled={!selectedZone || Boolean(validatedMessage)}
            className="rounded-full bg-[#0D1321] px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#111A2E] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          >
            Confirm area
          </button>
        </div>
      </div>

      <div
        className={`relative overflow-hidden bg-[#F6F3EA] ${
          heightClassName ?? (compact ? "h-80" : "min-h-[520px]")
        }`}
      >
        {hasInteractiveMap ? (
          <div className="absolute inset-0">
            <div ref={mapContainerRef} className="h-full w-full" />
          </div>
        ) : (
          <FallbackMapSurface />
        )}

        {children}

        {mapState !== "ready" ? (
          <MapStateBanner
            state={mapState}
            message={
              mapState === "fallback"
                ? "Mapbox is not configured, so Arivvio is showing a fallback area from the selected location."
                : statusMessage
            }
            onRetry={() => window.location.reload()}
          />
        ) : null}

        {drawMode !== "idle" ? (
          <div className="pointer-events-none absolute left-1/2 top-5 z-20 -translate-x-1/2 rounded-full bg-white/94 px-4 py-2 text-xs font-semibold text-neutral-800 shadow-[0_14px_34px_rgba(13,19,33,0.14)] backdrop-blur">
            {drawMode === "radius"
              ? "Click once to place the circle."
              : "Click map points. Drag markers afterward to edit."}
          </div>
        ) : null}

        <div className="absolute bottom-4 left-4 right-4 z-20 rounded-[28px] border border-[#D4AF37]/14 bg-white/94 p-4 shadow-[0_18px_50px_rgba(13,19,33,0.12)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-950">
                {selectedZone?.type === "polygon"
                  ? "Freeform search area"
                  : "Circle search area"}
              </p>
              <p className="mt-1 text-xs font-semibold text-neutral-500">
                {statusMessage || (selectedZone?.saved ? "Saved area restored." : "Pan, zoom, draw, then confirm one area.")}
              </p>
            </div>

            {selectedZone?.type === "radius" ? (
              <label className="min-w-[240px] text-xs font-semibold text-neutral-700">
                Radius: {metersToMiles(selectedZone.radiusMeters).toFixed(1)} mi
                <input
                  type="range"
                  min="1"
                  max="35"
                  step="0.5"
                  value={metersToMiles(selectedZone.radiusMeters)}
                  onChange={(event) => updateRadius(event.target.value)}
                  className="mt-2 w-full accent-[#D4AF37]"
                />
              </label>
            ) : (
              <div className="flex flex-wrap gap-2 text-xs font-semibold text-neutral-600">
                <span className="rounded-full bg-[#F6F3EA] px-3 py-2">
                  {selectedZone?.type === "polygon" ? selectedZone.points.length : 0} points
                </span>
                {drawMode === "polygon" ? (
                  <button
                    type="button"
                    onClick={() => setDrawMode("idle")}
                    className="rounded-full border border-[#D4AF37]/18 bg-white px-3 py-2 text-neutral-800 transition hover:-translate-y-0.5"
                  >
                    Stop adding points
                  </button>
                ) : null}
              </div>
            )}

            {selectedZone ? (
              <button
                type="button"
                onClick={clearSelectedZone}
                className="rounded-full border border-[#D4AF37]/18 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 transition hover:-translate-y-0.5 hover:border-[#D4AF37]/60"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex min-w-0 gap-2 overflow-x-auto border-t border-[#D4AF37]/14 bg-[#FFFCF7] p-3 [scrollbar-width:none]">
        {visibleZones.length ? (
          visibleZones.map((zone) => (
            <button
              key={zone.id}
              type="button"
              onClick={() => {
                setSelectedZoneId(zone.id);
                fitZone(mapRef.current, zone);
              }}
              className={`min-w-fit rounded-full border px-3 py-2 text-xs font-semibold transition hover:-translate-y-0.5 ${
                selectedZone?.id === zone.id
                  ? "border-[#0D1321] bg-[#0D1321] text-white"
                  : "border-[#D4AF37]/18 bg-white text-neutral-700"
              }`}
            >
              {zone.label}
              {zone.saved ? " saved" : ""}
            </button>
          ))
        ) : (
          <button
            type="button"
            onClick={startDrawing}
            className="rounded-full bg-[#0D1321] px-4 py-2 text-xs font-semibold text-white"
          >
            Draw first area
          </button>
        )}
      </div>
    </div>
  );
}

export function summarizeMapZones(zones: MapZone[]) {
  if (!zones.length) {
    return "No area saved";
  }

  return zones.map((zone) => formatZoneSummary(zone)).join("; ");
}

function ensureZoneLayers(map: MapboxMap) {
  if (!map.getSource(zoneSourceId)) {
    map.addSource(zoneSourceId, {
      data: emptyFeatureCollection(),
      type: "geojson",
    });
  }

  if (!map.getLayer(zoneFillLayerId)) {
    map.addLayer({
      id: zoneFillLayerId,
      paint: {
        "fill-color": "#0E8F72",
        "fill-opacity": 0.18,
      },
      source: zoneSourceId,
      type: "fill",
    });
  }

  if (!map.getLayer(zoneLineLayerId)) {
    map.addLayer({
      id: zoneLineLayerId,
      paint: {
        "line-color": "#0E8F72",
        "line-opacity": 0.82,
        "line-width": 4,
      },
      source: zoneSourceId,
      type: "line",
    });
  }
}

function updateZoneSource(map: MapboxMap, zone: MapZone | null) {
  if (!map.getSource(zoneSourceId)) {
    ensureZoneLayers(map);
  }

  const source = map.getSource(zoneSourceId) as mapboxgl.GeoJSONSource | undefined;

  source?.setData(zoneToFeatureCollection(zone));
}

function updateZoneMarkers({
  centerMarkerRef,
  map,
  onCenterChange,
  onVertexChange,
  selectedZone,
  vertexMarkersRef,
}: {
  centerMarkerRef: MutableRefObject<mapboxgl.Marker | null>;
  map: MapboxMap;
  onCenterChange: (center: Coordinates) => void;
  onVertexChange: (index: number, point: Coordinates) => void;
  selectedZone: MapZone | null;
  vertexMarkersRef: MutableRefObject<mapboxgl.Marker[]>;
}) {
  clearMarker(centerMarkerRef);
  clearVertexMarkers(vertexMarkersRef);

  if (!selectedZone) {
    return;
  }

  if (selectedZone.type === "radius") {
    const marker = new mapboxgl.Marker({
      draggable: true,
      element: createCenterMarkerElement(),
    })
      .setLngLat([selectedZone.center.lng, selectedZone.center.lat])
      .addTo(map);

    marker.on("dragend", () => {
      const lngLat = marker.getLngLat();
      onCenterChange({ lat: lngLat.lat, lng: lngLat.lng });
    });
    centerMarkerRef.current = marker;
    return;
  }

  selectedZone.points.forEach((point, index) => {
    const marker = new mapboxgl.Marker({
      draggable: true,
      element: createVertexMarkerElement(index),
    })
      .setLngLat([point.lng, point.lat])
      .addTo(map);

    marker.on("dragend", () => {
      const lngLat = marker.getLngLat();
      onVertexChange(index, { lat: lngLat.lat, lng: lngLat.lng });
    });
    vertexMarkersRef.current.push(marker);
  });
}

function zoneToFeatureCollection(zone: MapZone | null): GeoJsonData {
  if (!zone) {
    return emptyFeatureCollection();
  }

  if (zone.type === "radius") {
    const circle = getCirclePolygon(zone.center, zone.radiusMeters);

    return polygonFeatureCollection(circle);
  }

  if (zone.points.length < 3) {
    return emptyFeatureCollection();
  }

  return polygonFeatureCollection(zone.points);
}

function polygonFeatureCollection(points: Coordinates[]): GeoJsonData {
  const ring = [...points, points[0]].map((point) => [point.lng, point.lat]);

  return {
    features: [
      {
        geometry: {
          coordinates: [ring],
          type: "Polygon",
        },
        properties: {},
        type: "Feature",
      },
    ],
    type: "FeatureCollection",
  } as GeoJsonData;
}

function emptyFeatureCollection(): GeoJsonData {
  return {
    features: [],
    type: "FeatureCollection",
  } as GeoJsonData;
}

function fitZone(map: MapboxMap | null, zone: MapZone | null) {
  if (!map || !zone) {
    return;
  }

  const bounds = getZoneBounds(zone);
  const mapBounds: LngLatBoundsLike = [
    [bounds.minLng, bounds.minLat],
    [bounds.maxLng, bounds.maxLat],
  ];

  map.fitBounds(mapBounds, {
    duration: 360,
    maxZoom: zone.type === "radius" ? 12.5 : 13,
    padding: { bottom: 140, left: 80, right: 80, top: 80 },
  });
}

function upsertZone(zones: MapZone[], zone: MapZone) {
  if (!zones.some((item) => item.id === zone.id)) {
    return [zone, ...zones];
  }

  return zones.map((item) => (item.id === zone.id ? zone : item));
}

function replaceAt<T>(items: T[], index: number, value: T) {
  return items.map((item, itemIndex) => (itemIndex === index ? value : item));
}

function createCenterMarkerElement() {
  const element = document.createElement("button");
  element.type = "button";
  element.className =
    "h-9 w-9 rounded-full border-[3px] border-white bg-[#0E8F72] shadow-[0_18px_44px_rgba(13,19,33,0.26)] ring-4 ring-[#0E8F72]/22 transition hover:scale-110";
  element.setAttribute("aria-label", "Drag to move circle center");

  return element;
}

function createVertexMarkerElement(index: number) {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = String(index + 1);
  element.className =
    "flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-white bg-[#0D1321] text-[11px] font-semibold text-[#D4AF37] shadow-[0_16px_38px_rgba(13,19,33,0.24)] transition hover:scale-110";
  element.setAttribute("aria-label", `Drag freeform point ${index + 1}`);

  return element;
}

function clearMarker(ref: MutableRefObject<mapboxgl.Marker | null>) {
  ref.current?.remove();
  ref.current = null;
}

function clearVertexMarkers(ref: MutableRefObject<mapboxgl.Marker[]>) {
  ref.current.forEach((marker) => marker.remove());
  ref.current = [];
}

function MapStateBanner({
  message,
  onRetry,
  state,
}: {
  message?: string;
  onRetry: () => void;
  state: MapState;
}) {
  if (state === "ready") {
    return null;
  }

  return (
    <div className="absolute left-4 top-4 z-20 max-w-sm rounded-[24px] border border-[#D4AF37]/18 bg-white/94 p-4 text-sm shadow-[0_18px_48px_rgba(13,19,33,0.12)] backdrop-blur">
      <p className="font-semibold text-neutral-950">
        {state === "loading"
          ? "Loading map..."
          : state === "error"
            ? "Map needs attention"
            : "Map fallback active"}
      </p>
      <p className="mt-1 leading-6 text-neutral-600">
        {message || "Arivvio is preparing the map area."}
      </p>
      {state === "error" ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-full bg-[#0D1321] px-4 py-2 text-xs font-semibold text-white"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

function FallbackMapSurface() {
  return (
    <div className="absolute inset-0 bg-[linear-gradient(135deg,#e5ece5,#f5efe7)]">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.52)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.52)_1px,transparent_1px)] bg-[size:42px_42px]" />
      <div className="absolute left-[-8%] top-[19%] h-24 w-[118%] rotate-[-8deg] rounded-full border-[18px] border-white/45" />
      <div className="absolute left-[-14%] top-[58%] h-28 w-[124%] rotate-[12deg] rounded-full border-[18px] border-white/50" />
      <div className="absolute left-[18%] top-[-12%] h-[124%] w-24 rotate-[18deg] rounded-full border-[16px] border-white/36" />
      <div className="absolute left-[11%] top-[24%] h-20 w-32 rounded-full bg-emerald-200/35 blur-sm" />
      <div className="absolute right-[13%] top-[17%] h-24 w-36 rounded-full bg-sky-100/70 blur-sm" />
      <div className="absolute bottom-[14%] left-[36%] h-24 w-44 rounded-full bg-white/42 blur-sm" />
    </div>
  );
}

function getDefaultCenter() {
  return { lat: 34.0522, lng: -118.2437 };
}

function getMapboxStyleUrl() {
  if (MAPBOX_STYLE_ID.startsWith("mapbox://")) {
    return MAPBOX_STYLE_ID;
  }

  return `mapbox://styles/${MAPBOX_STYLE_ID}`;
}

function resizeMapSafely(map: MapboxMap | null) {
  if (!map) {
    return;
  }

  try {
    map.resize();
  } catch {
    // Mapbox can throw if React changes the container during a resize tick.
  }
}
