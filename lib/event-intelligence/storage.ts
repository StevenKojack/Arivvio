import type { EventIntelligenceProfile } from "./types";

const storageKey = "arivvio:event-intelligence";

export function saveEventIntelligenceProfile(profile: EventIntelligenceProfile) {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(profile);
  window.sessionStorage.setItem(storageKey, serialized);
  window.localStorage.setItem(storageKey, serialized);
}

export function loadEventIntelligenceProfile() {
  if (typeof window === "undefined") return null;
  const stored = window.sessionStorage.getItem(storageKey) ?? window.localStorage.getItem(storageKey);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as EventIntelligenceProfile;
  } catch {
    return null;
  }
}
