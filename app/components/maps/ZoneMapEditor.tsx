"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";

export type MapPoint = {
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
  onZonesChange: (zones: MapZone[]) => void;
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
  onZonesChange,
  subtitle,
  title,
  zones,
}: ZoneMapEditorProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [activeTool, setActiveTool] = useState<MapZone["type"]>("radius");
  const [selectedZoneId, setSelectedZoneId] = useState(zones[0]?.id ?? "");
  const [dragState, setDragState] = useState<DragState | null>(null);
  const selectedZone = zones.find((zone) => zone.id === selectedZoneId) ?? zones[0];
  const polygonPoints = useMemo(
    () =>
      zones.flatMap((zone) =>
        zone.type === "polygon"
          ? (zone.points ?? []).map((point, index) => ({ index, point, zone }))
          : [],
      ),
    [zones],
  );

  function addZone(type = activeTool) {
    const nextZone: MapZone =
      type === "radius"
        ? {
            center: { x: 50, y: 50 },
            id: `zone-${Date.now()}`,
            label: `${defaultLabel} ${zones.length + 1}`,
            radiusPct: 24,
            type,
          }
        : {
            id: `zone-${Date.now()}`,
            label: `${defaultLabel} ${zones.length + 1}`,
            points: [
              { x: 35, y: 36 },
              { x: 64, y: 42 },
              { x: 56, y: 68 },
              { x: 31, y: 61 },
            ],
            type,
          };

    onZonesChange([...zones, nextZone]);
    setSelectedZoneId(nextZone.id);
  }

  function saveSelectedZone() {
    if (!selectedZone) {
      return;
    }

    onZonesChange(
      zones.map((zone) =>
        zone.id === selectedZone.id ? { ...zone, saved: true } : zone,
      ),
    );
  }

  function updateZone(zoneId: string, updater: (zone: MapZone) => MapZone) {
    onZonesChange(zones.map((zone) => (zone.id === zoneId ? updater(zone) : zone)));
  }

  function getPointFromEvent(event: React.PointerEvent<HTMLDivElement>) {
    const rect = mapRef.current?.getBoundingClientRect();

    if (!rect) {
      return { x: 50, y: 50 };
    }

    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100),
    };
  }

  function handleMapPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("[data-zone-control]")) {
      return;
    }

    const point = getPointFromEvent(event);

    if (!selectedZone) {
      addZone(activeTool);
      return;
    }

    if (activeTool === "radius" && selectedZone.type === "radius") {
      updateZone(selectedZone.id, (zone) => ({
        ...zone,
        center: point,
        saved: false,
      }));
      setDragState({ zoneId: selectedZone.id });
      return;
    }

    if (activeTool === "polygon" && selectedZone.type === "polygon") {
      updateZone(selectedZone.id, (zone) => ({
        ...zone,
        points: [...(zone.points ?? []), point],
        saved: false,
      }));
    }
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

  return (
    <div className="overflow-hidden rounded-[30px] border border-neutral-200 bg-white shadow-[0_22px_70px_rgba(20,20,20,0.08)]">
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
              onClick={() => setActiveTool(tool)}
              className={`rounded-full px-3 py-2 text-xs font-semibold transition hover:-translate-y-0.5 ${
                activeTool === tool
                  ? "bg-neutral-950 text-white"
                  : "border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-950"
              }`}
            >
              {tool === "radius" ? "Circle" : "Polygon"}
            </button>
          ))}
          <button
            type="button"
            onClick={() => addZone()}
            className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:-translate-y-0.5 hover:border-neutral-950"
          >
            Add zone
          </button>
          <button
            type="button"
            onClick={saveSelectedZone}
            disabled={!selectedZone}
            className="rounded-full bg-neutral-950 px-3 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          >
            Save zone
          </button>
        </div>
      </div>

      <div
        ref={mapRef}
        className={`relative touch-none overflow-hidden bg-[linear-gradient(135deg,#e6ece6,#f4efe8)] ${
          compact ? "h-72" : "min-h-[430px]"
        }`}
        onPointerDown={handleMapPointerDown}
        onPointerLeave={() => setDragState(null)}
        onPointerMove={handlePointerMove}
        onPointerUp={() => setDragState(null)}
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:38px_38px]" />
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          {zones.map((zone) =>
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
                points={zone.points.map((point) => `${point.x},${point.y}`).join(" ")}
                className={`fill-sky-500/12 stroke-sky-700/60 transition ${
                  zone.saved ? "stroke-sky-900" : ""
                }`}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            ) : null,
          )}
        </svg>

        {zones.map((zone) =>
          zone.type === "radius" && zone.center ? (
            <button
              key={`${zone.id}-center`}
              type="button"
              data-zone-control
              onClick={() => setSelectedZoneId(zone.id)}
              onPointerDown={(event) => {
                event.stopPropagation();
                setSelectedZoneId(zone.id);
                setDragState({ zoneId: zone.id });
              }}
              className={`absolute z-20 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-700 shadow-[0_16px_40px_rgba(20,20,20,0.18)] transition hover:scale-110 ${
                selectedZone?.id === zone.id ? "ring-4 ring-emerald-700/20" : ""
              }`}
              style={{ left: `${zone.center.x}%`, top: `${zone.center.y}%` }}
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
              setSelectedZoneId(zone.id);
              setDragState({ pointIndex: index, zoneId: zone.id });
            }}
            className={`absolute z-20 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-sky-700 shadow-[0_14px_34px_rgba(20,20,20,0.18)] transition hover:scale-110 ${
              selectedZone?.id === zone.id ? "ring-4 ring-sky-700/20" : ""
            }`}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            aria-label={`Move ${zone.label} point ${index + 1}`}
          />
        ))}

        {children}

        {selectedZone?.type === "radius" ? (
          <label
            data-zone-control
            className="absolute bottom-4 left-4 right-4 z-30 rounded-3xl bg-white/92 p-4 text-xs font-semibold text-neutral-700 shadow-[0_18px_50px_rgba(20,20,20,0.12)] backdrop-blur"
          >
            Search radius
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
              className="mt-2 w-full accent-neutral-950"
            />
          </label>
        ) : null}
      </div>

      <div className="flex min-w-0 gap-2 overflow-x-auto border-t border-neutral-200 bg-[#fbfbfa] p-3 [scrollbar-width:none]">
        {zones.length ? (
          zones.map((zone) => (
            <button
              key={zone.id}
              type="button"
              onClick={() => setSelectedZoneId(zone.id)}
              className={`min-w-fit rounded-full border px-3 py-2 text-xs font-semibold transition hover:-translate-y-0.5 ${
                selectedZone?.id === zone.id
                  ? "border-neutral-950 bg-neutral-950 text-white"
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
            className="rounded-full bg-neutral-950 px-4 py-2 text-xs font-semibold text-white"
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

function clamp(value: number) {
  return Math.min(96, Math.max(4, value));
}
