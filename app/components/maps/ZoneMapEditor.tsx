"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import mapboxgl, { type Map as MapboxMap } from "mapbox-gl";
import type { Coordinates } from "@/app/data/marketplace";
import { MAPBOX_ACCESS_TOKEN, MAPBOX_STYLE_ID, hasMapboxConfig } from "@/lib/maps/config";

export type MapPoint = {
  lat?: number;
  lng?: number;
  x: number;
  y: number;
};

export type MapZone = {
  center?: MapPoint;
  id: string;
  label: string;
  points?: MapPoint[];
  radiusPct?: number;
  saved?: boolean;
  type: "polygon" | "radius";
};

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

type DragState = {
  pointIndex?: number;
  zoneId: string;
};

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
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapboxRef = useRef<MapboxMap | null>(null);
  const drawingPointerIdRef = useRef<number | null>(null);
  const drawingPointsRef = useRef<MapPoint[]>([]);
  const [activeTool, setActiveTool] = useState<MapZone["type"]>(zones[0]?.type ?? "radius");
  const [selectedZoneId, setSelectedZoneId] = useState(zones[0]?.id ?? "");
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  const visibleZones = useMemo(
    () => (singleZone ? zones.slice(0, 1) : zones),
    [singleZone, zones],
  );
  const selectedZone =
    visibleZones.find((zone) => zone.id === selectedZoneId) ?? visibleZones[0];
  const hasInteractiveMap = hasMapboxConfig();
  const mapAnchor = mapCenter ?? { lat: 34.0522, lng: -118.2437 };
  const initialMapAnchorRef = useRef(mapAnchor);
  const initialMapZoomRef = useRef(mapZoom);
  const polygonPoints = useMemo(
    () =>
      visibleZones.flatMap((zone) =>
        zone.type === "polygon"
          ? (zone.points ?? []).map((point, index) => ({ index, point, zone }))
          : [],
      ),
    [visibleZones],
  );

  useEffect(() => {
    if (!singleZone) {
      return;
    }

    const firstZone = zones[0];

    if (!firstZone) {
      const nextZone = createZone(activeTool, defaultLabel, 1, true);
      onZonesChange([nextZone]);
      return;
    }

    if (zones.length > 1 || firstZone.label !== defaultLabel) {
      const normalizedZone = {
        ...firstZone,
        label: defaultLabel,
      };

      onZonesChange([normalizedZone]);
    }
  }, [activeTool, defaultLabel, onZonesChange, singleZone, zones]);

  useEffect(() => {
    if (!hasInteractiveMap || !mapContainerRef.current || mapboxRef.current) {
      return;
    }

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
    const map = new mapboxgl.Map({
      attributionControl: false,
      center: [
        initialMapAnchorRef.current.lng,
        initialMapAnchorRef.current.lat,
      ],
      container: mapContainerRef.current,
      cooperativeGestures: false,
      dragRotate: false,
      pitchWithRotate: false,
      scrollZoom: true,
      style: getMapboxStyleUrl(),
      zoom: initialMapZoomRef.current,
    });
    const handleMapLoad = () => resizeMapSafely(map);
    const resizeTimeoutId = window.setTimeout(() => resizeMapSafely(map), 0);

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    map.on("load", handleMapLoad);
    mapboxRef.current = map;

    return () => {
      window.clearTimeout(resizeTimeoutId);
      map.off("load", handleMapLoad);
      map.remove();

      if (mapboxRef.current === map) {
        mapboxRef.current = null;
      }
    };
  }, [hasInteractiveMap]);

  useEffect(() => {
    if (!mapboxRef.current || !hasInteractiveMap) {
      return;
    }

    mapboxRef.current.easeTo({
      center: [mapAnchor.lng, mapAnchor.lat],
      duration: 360,
      zoom: mapZoom,
    });
  }, [hasInteractiveMap, mapAnchor.lat, mapAnchor.lng, mapZoom]);

  function selectTool(tool: MapZone["type"]) {
    setActiveTool(tool);

    if (!singleZone) {
      return;
    }

    const currentZone = visibleZones[0];

    if (currentZone?.type === tool) {
      setSelectedZoneId(currentZone.id);
      return;
    }

    const nextZone =
      tool === "polygon"
        ? createEmptyPolygonZone(defaultLabel)
        : createZone(tool, defaultLabel, 1, true);
    onZonesChange([nextZone]);
    setSelectedZoneId(nextZone.id);
  }

  function addZone(type = activeTool) {
    const nextZone = createZone(type, defaultLabel, zones.length + 1, singleZone);

    onZonesChange(singleZone ? [nextZone] : [...zones, nextZone]);
    setSelectedZoneId(nextZone.id);
  }

  function saveSelectedZone() {
    if (!selectedZone) {
      return;
    }

    onZonesChange(
      visibleZones.map((zone) =>
        zone.id === selectedZone.id ? { ...zone, saved: true } : zone,
      ),
    );
  }

  function updateZone(zoneId: string, updater: (zone: MapZone) => MapZone) {
    const nextZones = visibleZones.map((zone) =>
      zone.id === zoneId ? updater(zone) : zone,
    );

    onZonesChange(singleZone ? nextZones.slice(0, 1) : nextZones);
  }

  function getPointFromEvent(event: React.PointerEvent<HTMLDivElement>) {
    const rect = surfaceRef.current?.getBoundingClientRect();

    if (!rect) {
      return { x: 50, y: 50 };
    }

    const point: MapPoint = {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100),
    };

    if (mapboxRef.current) {
      const lngLat = mapboxRef.current.unproject([
        event.clientX - rect.left,
        event.clientY - rect.top,
      ]);

      point.lat = lngLat.lat;
      point.lng = lngLat.lng;
    }

    return point;
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragState) {
      return;
    }

    const point = getPointFromEvent(event);

    updateZone(dragState.zoneId, (zone) => {
      if (zone.type === "polygon" && dragState.pointIndex !== undefined) {
        const points = [...(zone.points ?? [])];
        points[dragState.pointIndex] = point;
        return { ...zone, points, saved: false };
      }

      return { ...zone, center: point, saved: false };
    });
  }

  function startFreeformDrawing() {
    const currentZone = visibleZones[0];
    const nextZone =
      currentZone?.type === "polygon"
        ? { ...currentZone, points: [], saved: false }
        : createEmptyPolygonZone(defaultLabel);

    drawingPointsRef.current = [];
    drawingPointerIdRef.current = null;
    setActiveTool("polygon");
    setSelectedZoneId(nextZone.id);
    setIsDrawingPolygon(true);
    onZonesChange(singleZone ? [nextZone] : [nextZone, ...visibleZones.slice(1)]);
  }

  function handleDrawingPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDrawingPolygon || selectedZone?.type !== "polygon") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingPointerIdRef.current = event.pointerId;
    const firstPoint = getPointFromEvent(event);
    drawingPointsRef.current = [firstPoint];
    updatePolygonZone([firstPoint]);
  }

  function handleDrawingPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (
      !isDrawingPolygon ||
      drawingPointerIdRef.current !== event.pointerId ||
      selectedZone?.type !== "polygon"
    ) {
      return;
    }

    event.preventDefault();
    const nextPoint = getPointFromEvent(event);
    const lastPoint = drawingPointsRef.current[drawingPointsRef.current.length - 1];

    if (lastPoint && getPointDistance(lastPoint, nextPoint) < 1.2) {
      return;
    }

    const nextPoints = [...drawingPointsRef.current, nextPoint];
    drawingPointsRef.current = nextPoints;
    updatePolygonZone(nextPoints);
  }

  function finishFreeformDrawing() {
    if (!isDrawingPolygon) {
      return;
    }

    const points = drawingPointsRef.current;

    if (points.length > 0 && points.length < 3 && selectedZone?.type === "polygon") {
      updatePolygonZone([]);
    }

    drawingPointerIdRef.current = null;
    drawingPointsRef.current = [];
    setIsDrawingPolygon(false);
  }

  function updatePolygonZone(points: MapPoint[]) {
    if (!selectedZone || selectedZone.type !== "polygon") {
      return;
    }

    updateZone(selectedZone.id, (zone) => ({
      ...zone,
      points,
      saved: false,
    }));
  }

  return (
    <div className="overflow-hidden rounded-[30px] border border-neutral-200 bg-white shadow-[0_22px_70px_rgba(13,19,33,0.08)]">
      <div className="flex flex-col gap-3 border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            {title}
          </p>
          {subtitle ? (
            <p className="mt-1 truncate text-sm font-semibold text-neutral-700">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {(["radius", "polygon"] as const).map((tool) => (
            <button
              key={tool}
              type="button"
              onClick={() => selectTool(tool)}
              className={`rounded-full px-3 py-2 text-xs font-semibold transition hover:-translate-y-0.5 ${
                activeTool === tool
                  ? "bg-[#0D1321] text-white"
                  : "border border-neutral-200 bg-white text-neutral-700 hover:border-[#0D1321]"
              }`}
            >
              {tool === "radius" ? "Circle" : "Freeform"}
            </button>
          ))}
          {!singleZone ? (
            <button
              type="button"
              onClick={() => addZone()}
              className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:-translate-y-0.5 hover:border-[#0D1321]"
            >
              Add zone
            </button>
          ) : null}
          <button
            type="button"
            onClick={saveSelectedZone}
            disabled={!selectedZone}
            className="rounded-full bg-[#0D1321] px-3 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#111A2E] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          >
            {singleZone ? "Save area" : "Save zone"}
          </button>
        </div>
      </div>

      <div
        ref={surfaceRef}
        className={`relative overflow-hidden bg-[linear-gradient(135deg,#e6ece6,#f4efe8)] ${
          heightClassName ?? (compact ? "h-72" : "min-h-[430px]")
        }`}
        onPointerLeave={() => setDragState(null)}
        onPointerMove={handlePointerMove}
        onPointerUp={() => setDragState(null)}
        onPointerCancel={() => {
          setDragState(null);
          finishFreeformDrawing();
        }}
      >
        {hasInteractiveMap ? (
          <div className="absolute inset-0">
            <div ref={mapContainerRef} className="h-full w-full" />
          </div>
        ) : (
          <FallbackMapSurface />
        )}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.28),transparent_24%,transparent_74%,rgba(255,255,255,0.22))]" />
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          {visibleZones.map((zone) =>
            zone.type === "radius" && zone.center ? (
              <circle
                key={zone.id}
                cx={zone.center.x}
                cy={zone.center.y}
                r={zone.radiusPct ?? 24}
                className={`fill-emerald-500/12 stroke-emerald-700/55 transition ${
                  zone.saved ? "stroke-emerald-800" : ""
                }`}
                strokeWidth="2"
              />
            ) : zone.type === "polygon" && zone.points?.length ? (
              <polygon
                key={zone.id}
                points={zone.points
                  .map((point) => `${point.x},${point.y}`)
                  .join(" ")}
                className={`fill-sky-500/12 stroke-sky-700/60 transition ${
                  zone.saved ? "stroke-sky-900" : ""
                }`}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            ) : null,
          )}
        </svg>

        {visibleZones.map((zone) =>
          zone.type === "radius" && zone.center ? (
            <button
              key={`${zone.id}-center`}
              type="button"
              data-zone-control
              onClick={() => setSelectedZoneId(zone.id)}
              onPointerDown={(event) => {
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
                setSelectedZoneId(zone.id);
                setDragState({ zoneId: zone.id });
              }}
              className={`absolute z-20 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#D4AF37] shadow-[0_16px_40px_rgba(13,19,33,0.18)] transition hover:scale-110 ${
                selectedZone?.id === zone.id ? "ring-4 ring-[#D4AF37]/28" : ""
              }`}
              style={{
                left: `${zone.center.x}%`,
                top: `${zone.center.y}%`,
              }}
              aria-label={`Move ${zone.label}`}
            />
          ) : null,
        )}

        {polygonPoints.map(({ index, point, zone }) => (
          <button
            key={`${zone.id}-${index}`}
            type="button"
            data-zone-control
            onClick={() => setSelectedZoneId(zone.id)}
            onPointerDown={(event) => {
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              setSelectedZoneId(zone.id);
              setDragState({ pointIndex: index, zoneId: zone.id });
            }}
            className={`absolute z-20 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#16233B] shadow-[0_14px_34px_rgba(13,19,33,0.18)] transition hover:scale-110 ${
              selectedZone?.id === zone.id ? "ring-4 ring-[#D4AF37]/24" : ""
            }`}
            style={{
              left: `${point.x}%`,
              top: `${point.y}%`,
            }}
            aria-label={`Move ${zone.label} point ${index + 1}`}
          />
        ))}

        {children}

        {isDrawingPolygon ? (
          <div
            className="absolute inset-0 z-[25] cursor-crosshair bg-sky-950/5"
            onPointerDown={handleDrawingPointerDown}
            onPointerMove={handleDrawingPointerMove}
            onPointerUp={finishFreeformDrawing}
            onPointerCancel={finishFreeformDrawing}
          >
            <div className="pointer-events-none absolute left-1/2 top-5 -translate-x-1/2 rounded-full bg-white/94 px-4 py-2 text-xs font-semibold text-neutral-800 shadow-[0_14px_34px_rgba(13,19,33,0.14)] backdrop-blur">
              Drag to draw the venue area. Release to finish.
            </div>
          </div>
        ) : null}

        <div
          data-zone-control
          className="absolute bottom-4 left-4 right-4 z-30 rounded-3xl bg-white/92 p-4 text-xs font-semibold text-neutral-700 shadow-[0_18px_50px_rgba(13,19,33,0.12)] backdrop-blur"
        >
          {selectedZone?.type === "radius" ? (
            <div className="grid gap-2">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span>Search radius</span>
                <span className="text-neutral-500">
                  Drag the map to move around. Drag the gold point to move the circle.
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="42"
                value={selectedZone.radiusPct ?? 24}
                onChange={(event) =>
                  updateZone(selectedZone.id, (zone) => ({
                    ...zone,
                    radiusPct: Number(event.target.value),
                    saved: false,
                  }))
                }
                className="w-full accent-[#D4AF37]"
              />
            </div>
          ) : selectedZone?.type === "polygon" ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Pan or zoom the map first, then draw one continuous boundary.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={startFreeformDrawing}
                  className="h-10 rounded-full bg-[#0D1321] px-4 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#111A2E]"
                >
                  {selectedZone.points?.length ? "Redraw area" : "Draw area"}
                </button>
                {selectedZone.points?.length ? (
                  <button
                    type="button"
                    onClick={() =>
                      updateZone(selectedZone.id, (zone) => ({
                        ...zone,
                        points: [],
                        saved: false,
                      }))
                    }
                    className="h-10 rounded-full border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-800 transition hover:-translate-y-0.5 hover:border-[#0D1321]"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <p>Select a shape to define the search area.</p>
          )}
        </div>
      </div>

      <div className="flex min-w-0 gap-2 overflow-x-auto border-t border-neutral-200 bg-[#FFFCF7] p-3 [scrollbar-width:none]">
        {visibleZones.length ? (
          visibleZones.map((zone) => (
            <button
              key={zone.id}
              type="button"
              onClick={() => setSelectedZoneId(zone.id)}
              className={`min-w-fit rounded-full border px-3 py-2 text-xs font-semibold transition hover:-translate-y-0.5 ${
                selectedZone?.id === zone.id
                  ? "border-[#0D1321] bg-[#0D1321] text-white"
                  : "border-neutral-200 bg-white text-neutral-700"
              }`}
            >
              {zone.label}
              {zone.saved ? " saved" : ""}
            </button>
          ))
        ) : (
          <button
            type="button"
            onClick={() => addZone("radius")}
            className="rounded-full bg-[#0D1321] px-4 py-2 text-xs font-semibold text-white"
          >
            Create first zone
          </button>
        )}
      </div>
    </div>
  );
}

export function summarizeMapZones(zones: MapZone[]) {
  if (!zones.length) {
    return "No zones saved";
  }

  return zones
    .map((zone) =>
      zone.type === "radius"
        ? `${zone.label}: circle radius ${Math.round(zone.radiusPct ?? 0)}`
        : `${zone.label}: polygon with ${zone.points?.length ?? 0} points`,
    )
    .join("; ");
}

function createZone(
  type: MapZone["type"],
  defaultLabel: string,
  index: number,
  singleZone: boolean,
): MapZone {
  const label = singleZone ? defaultLabel : `${defaultLabel} ${index}`;

  if (type === "radius") {
    return {
      center: { x: 50, y: 50 },
      id: `zone-radius-${Date.now()}`,
      label,
      radiusPct: 26,
      type,
    };
  }

  return {
    id: `zone-freeform-${Date.now()}`,
    label,
    points: [
      { x: 34, y: 36 },
      { x: 66, y: 41 },
      { x: 58, y: 68 },
      { x: 30, y: 61 },
    ],
    type,
  };
}

function createEmptyPolygonZone(defaultLabel: string): MapZone {
  return {
    id: `zone-freeform-${Date.now()}`,
    label: defaultLabel,
    points: [],
    type: "polygon",
  };
}

function getPointDistance(start: MapPoint, end: MapPoint) {
  return Math.hypot(end.x - start.x, end.y - start.y);
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

function clamp(value: number) {
  return Math.min(96, Math.max(4, value));
}
