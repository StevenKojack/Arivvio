"use client";
import { useEffect, useRef, useState } from "react";
import { getEventVisualTone } from "@/lib/event-intelligence/visual-tone";
import type { EventRecognition } from "@/lib/event-intelligence/types";

// Stays mounted across steps: only a newly recognized occasion can trigger it.
export function EventMoment({ recognition, active }: { recognition: EventRecognition; active: boolean }) {
  const seen = useRef(new Set<string>());
  const [visible, setVisible] = useState(false);
  const tone = getEventVisualTone(recognition);
  const identity = recognition.normalizedQuery;
  useEffect(() => {
    if (!active || seen.current.has(identity)) return;
    seen.current.add(identity);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches || tone === "neutral") return;
    const start = window.setTimeout(() => setVisible(true), 0);
    const end = window.setTimeout(() => setVisible(false), 2200);
    const stop = () => setVisible(false);
    motion.addEventListener("change", stop);
    return () => { clearTimeout(start); clearTimeout(end); motion.removeEventListener("change", stop); setVisible(false); };
  }, [active, identity, tone]);
  return visible && active && tone !== "neutral" ? <div className={`event-moment event-moment-${tone}`} aria-hidden="true" data-event-tone={tone}>{tone === "celebratory" ? <><i /><i /><i /></> : <i />}</div> : null;
}
