"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { canRotateAtmosphere, eventAtmospheres } from "@/lib/event-intelligence/atmosphere";
import { EventAtmosphere } from "./EventAtmosphere";
import { EventDiscoverySearch } from "./EventDiscoverySearch";

function subscribeMotion(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function reducedMotion() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
function subscribeVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}
// Respectful occasions are available in discovery but never used as a promotional slideshow.
const scenes = eventAtmospheres.slice(0, 6);
export function OccasionHero() {
  const [scene, setScene] = useState(0);
  const reduced = useSyncExternalStore(subscribeMotion, reducedMotion, () => true);
  const hidden = useSyncExternalStore(subscribeVisibility, () => document.hidden, () => false);
  const stopped = !canRotateAtmosphere({ reduced, hidden });
  useEffect(() => {
    if (stopped) return;
    const timer = window.setInterval(() => setScene(value => (value + 1) % scenes.length), 8000);
    return () => clearInterval(timer);
  }, [stopped]);
  return <section className="occasion-hero" data-motion-paused={stopped} aria-label="Start planning your event">
    <div className="atmosphere-layers" aria-hidden="true">{scenes.map((atmosphere, index) => <div className="atmosphere-layer" data-active={scene === index} key={atmosphere.id}>
      {(index === scene || index === (scene + 1) % scenes.length || index === (scene + scenes.length - 1) % scenes.length) && <EventAtmosphere atmosphere={atmosphere} priority={index === 0} />}
    </div>)}</div>
    <div className="occasion-hero-shade" />
    <div className="occasion-hero-content">
      <p className="hero-kicker"><span className="brand-angle" aria-hidden="true" /> A reason to get together</p>
      <h1>It starts with<br /><em>your occasion.</em></h1>
      <p className="hero-intro">Tell us what you have in mind. Find your people, your place, and a plan for it all.</p>
      <EventDiscoverySearch pageHidden={hidden} />
      <p className="hero-disclosure">Pre-beta · Plan, find providers and keep it together. Payments are not connected.</p>
    </div>
    <div className="atmosphere-caption">
      <div key={scenes[scene].id}><p>{scenes[scene].label}</p><span>{scenes[scene].phrase}</span></div>

    </div>
  </section>;
}
