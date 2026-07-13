import type { Coordinates } from "@/app/data/marketplace";

export type ZoneType = "polygon" | "radius";

export type RadiusZone = {
  center: Coordinates;
  id: string;
  label: string;
  radiusMeters: number;
  saved?: boolean;
  type: "radius";
};

export type PolygonZone = {
  center?: Coordinates;
  id: string;
  label: string;
  points: Coordinates[];
  saved?: boolean;
  type: "polygon";
};

export type PlanningZone = RadiusZone | PolygonZone;

export type LocationProfile = {
  coordinates?: Coordinates;
  currentLocationUsed?: boolean;
  formattedAddress?: string;
  inferredLocationType?: string;
  label?: string;
  locationMode?: "has_venue" | "home_private" | "needs_venue";
  mapboxPlaceId?: string;
  searchAreaLabel?: string;
  selectedVenueId?: string;
  zone?: PlanningZone;
};

export const LOCATION_PROFILE_SESSION_KEY = "arivvio.locationProfile.v1";

const earthRadiusMeters = 6371008.8;

export function createRadiusZone({
  center,
  id,
  label,
  radiusMeters = 12000,
  saved = false,
}: {
  center: Coordinates;
  id?: string;
  label: string;
  radiusMeters?: number;
  saved?: boolean;
}): RadiusZone {
  return {
    center: sanitizeCoordinates(center),
    id: id ?? `zone-radius-${Date.now()}`,
    label,
    radiusMeters: clampRadius(radiusMeters),
    saved,
    type: "radius",
  };
}

export function createPolygonZone({
  id,
  label,
  points = [],
  saved = false,
}: {
  id?: string;
  label: string;
  points?: Coordinates[];
  saved?: boolean;
}): PolygonZone {
  const sanitizedPoints = removeDuplicatePoints(
    points.map((point) => sanitizeCoordinates(point)),
  );

  return {
    center: sanitizedPoints.length >= 3 ? getZoneCenter({ id: id ?? "", label, points: sanitizedPoints, type: "polygon" }) : undefined,
    id: id ?? `zone-polygon-${Date.now()}`,
    label,
    points: sanitizedPoints,
    saved,
    type: "polygon",
  };
}

export function normalizePlanningZone(
  zone: PlanningZone | null | undefined,
  fallbackCenter: Coordinates,
  label = "Search area",
): PlanningZone | null {
  if (!zone) {
    return null;
  }

  if (zone.type === "radius") {
    return createRadiusZone({
      center: zone.center ?? fallbackCenter,
      id: zone.id,
      label: zone.label || label,
      radiusMeters: zone.radiusMeters,
      saved: zone.saved,
    });
  }

  return createPolygonZone({
    id: zone.id,
    label: zone.label || label,
    points: zone.points ?? [],
    saved: zone.saved,
  });
}

export function validatePlanningZone(zone: PlanningZone | null | undefined) {
  if (!zone) {
    return "Draw a search area first.";
  }

  if (zone.type === "radius") {
    if (!isValidCoordinates(zone.center)) {
      return "Choose a valid center point.";
    }

    if (!Number.isFinite(zone.radiusMeters) || zone.radiusMeters < 500) {
      return "Make the circle at least 0.3 miles wide.";
    }

    return "";
  }

  const points = removeDuplicatePoints(zone.points ?? []);

  if (points.length < 3) {
    return "Add at least three points to make a freeform area.";
  }

  if (hasSelfIntersection(points)) {
    return "That shape crosses itself. Move a point or redraw the area.";
  }

  return "";
}

export function getZoneCenter(zone: PlanningZone): Coordinates {
  if (zone.type === "radius") {
    return zone.center;
  }

  if (zone.center && isValidCoordinates(zone.center)) {
    return zone.center;
  }

  const points = zone.points.length ? zone.points : [{ lat: 34.0522, lng: -118.2437 }];

  return {
    lat: points.reduce((sum, point) => sum + point.lat, 0) / points.length,
    lng: points.reduce((sum, point) => sum + point.lng, 0) / points.length,
  };
}

export function getZoneBounds(zone: PlanningZone) {
  const points = zone.type === "radius"
    ? getCirclePolygon(zone.center, zone.radiusMeters, 40)
    : zone.points;

  if (!points.length) {
    const center = getZoneCenter(zone);

    return {
      maxLat: center.lat + 0.08,
      maxLng: center.lng + 0.08,
      minLat: center.lat - 0.08,
      minLng: center.lng - 0.08,
    };
  }

  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);

  return {
    maxLat: Math.max(...lats),
    maxLng: Math.max(...lngs),
    minLat: Math.min(...lats),
    minLng: Math.min(...lngs),
  };
}

export function zoneContainsPoint(zone: PlanningZone, point: Coordinates) {
  if (zone.type === "radius") {
    return getDistanceMeters(zone.center, point) <= zone.radiusMeters;
  }

  if (zone.points.length < 3) {
    return true;
  }

  return pointInPolygon(point, zone.points);
}

export function getCirclePolygon(center: Coordinates, radiusMeters: number, steps = 80) {
  const coordinates: Coordinates[] = [];
  const angularDistance = radiusMeters / earthRadiusMeters;
  const centerLat = toRadians(center.lat);
  const centerLng = toRadians(center.lng);

  for (let index = 0; index <= steps; index += 1) {
    const bearing = (index / steps) * Math.PI * 2;
    const lat = Math.asin(
      Math.sin(centerLat) * Math.cos(angularDistance) +
        Math.cos(centerLat) * Math.sin(angularDistance) * Math.cos(bearing),
    );
    const lng =
      centerLng +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(centerLat),
        Math.cos(angularDistance) - Math.sin(centerLat) * Math.sin(lat),
      );

    coordinates.push({
      lat: toDegrees(lat),
      lng: normalizeLongitude(toDegrees(lng)),
    });
  }

  return coordinates;
}

export function getDistanceMeters(from: Coordinates, to: Coordinates) {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function formatZoneSummary(zone?: PlanningZone | null) {
  if (!zone) {
    return "No area saved";
  }

  if (zone.type === "radius") {
    return `${zone.label}: ${metersToMiles(zone.radiusMeters).toFixed(1)} mile circle`;
  }

  return `${zone.label}: ${zone.points.length} point area`;
}

export function metersToMiles(meters: number) {
  return meters / 1609.344;
}

export function milesToMeters(miles: number) {
  return miles * 1609.344;
}

export function saveLocationProfile(profile: LocationProfile) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(LOCATION_PROFILE_SESSION_KEY, JSON.stringify(profile));
}

export function loadLocationProfile() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(LOCATION_PROFILE_SESSION_KEY);

    return raw ? (JSON.parse(raw) as LocationProfile) : null;
  } catch {
    return null;
  }
}

export function isValidCoordinates(value?: Coordinates | null): value is Coordinates {
  return Boolean(
    value &&
      Number.isFinite(value.lat) &&
      Number.isFinite(value.lng) &&
      Math.abs(value.lat) <= 90 &&
      Math.abs(value.lng) <= 180,
  );
}

function sanitizeCoordinates(value: Coordinates): Coordinates {
  return {
    lat: Math.min(90, Math.max(-90, value.lat)),
    lng: Math.min(180, Math.max(-180, value.lng)),
  };
}

function clampRadius(radiusMeters: number) {
  if (!Number.isFinite(radiusMeters)) {
    return 12000;
  }

  return Math.min(96560, Math.max(800, radiusMeters));
}

function removeDuplicatePoints(points: Coordinates[]) {
  return points.filter((point, index) => {
    const previous = points[index - 1];

    return !previous || getDistanceMeters(previous, point) > 15;
  });
}

function pointInPolygon(point: Coordinates, polygon: Coordinates[]) {
  let inside = false;

  for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index, index += 1) {
    const current = polygon[index];
    const previous = polygon[previousIndex];
    const intersects =
      current.lat > point.lat !== previous.lat > point.lat &&
      point.lng <
        ((previous.lng - current.lng) * (point.lat - current.lat)) /
          (previous.lat - current.lat || Number.EPSILON) +
          current.lng;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function hasSelfIntersection(points: Coordinates[]) {
  for (let leftIndex = 0; leftIndex < points.length; leftIndex += 1) {
    const leftStart = points[leftIndex];
    const leftEnd = points[(leftIndex + 1) % points.length];

    for (let rightIndex = leftIndex + 1; rightIndex < points.length; rightIndex += 1) {
      const rightStart = points[rightIndex];
      const rightEnd = points[(rightIndex + 1) % points.length];

      if (
        Math.abs(leftIndex - rightIndex) <= 1 ||
        (leftIndex === 0 && rightIndex === points.length - 1)
      ) {
        continue;
      }

      if (segmentsIntersect(leftStart, leftEnd, rightStart, rightEnd)) {
        return true;
      }
    }
  }

  return false;
}

function segmentsIntersect(a: Coordinates, b: Coordinates, c: Coordinates, d: Coordinates) {
  const orientationA = orientation(a, b, c);
  const orientationB = orientation(a, b, d);
  const orientationC = orientation(c, d, a);
  const orientationD = orientation(c, d, b);

  return orientationA !== orientationB && orientationC !== orientationD;
}

function orientation(a: Coordinates, b: Coordinates, c: Coordinates) {
  const value = (b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng);

  return value > 0 ? 1 : value < 0 ? -1 : 0;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number) {
  return (value * 180) / Math.PI;
}

function normalizeLongitude(value: number) {
  return ((((value + 180) % 360) + 360) % 360) - 180;
}
