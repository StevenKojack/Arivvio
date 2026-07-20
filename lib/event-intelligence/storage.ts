import type { EventIntelligenceProfile } from "./types";

const storageKey = "arivvio:event-intelligence";

export function saveEventIntelligenceProfile(profile: EventIntelligenceProfile) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(storageKey, JSON.stringify(profile));
}

export function loadEventIntelligenceProfile() {
  if (typeof window === "undefined") return null;
  const stored = window.sessionStorage.getItem(storageKey);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as EventIntelligenceProfile;
  } catch {
    return null;
  }
}
