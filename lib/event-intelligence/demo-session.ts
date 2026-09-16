const plannerKey = "arivvio:demo-planner:v1";
const cartKey = "arivvio:demo-cart:v1";

export function loadDemoPlannerSession<T>() {
  return loadStoredValue<T>(plannerKey);
}

export function saveDemoPlannerSession<T>(state: T) {
  saveStoredValue(plannerKey, state);
}

export function loadDemoCart<T>() {
  return loadStoredValue<T>(cartKey);
}

export function saveDemoCart<T>(cart: T) {
  saveStoredValue(cartKey, cart);
}

function loadStoredValue<T>(key: string) {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(key);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as { state?: T; version?: number };
    return parsed.version === 1 && parsed.state ? parsed.state : null;
  } catch {
    return null;
  }
}

function saveStoredValue<T>(key: string, state: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify({ state, version: 1 }));
}
