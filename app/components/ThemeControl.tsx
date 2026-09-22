"use client";
import { useEffect, useState } from "react";
type Theme = "system" | "light" | "dark";
export function ThemeControl() {
  const [theme, setTheme] = useState<Theme>("system");
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const sync = () => {
      let selected: Theme = "system";
      try { const saved = localStorage.getItem("arivvio.theme"); if (saved === "light" || saved === "dark") selected = saved; } catch { /* System theme remains usable. */ }
      setTheme(selected);
      document.documentElement.dataset.theme = selected === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : selected;
    };
    const media = matchMedia("(prefers-color-scheme: dark)");
    sync(); media.addEventListener("change", sync); window.addEventListener("arivvio-theme", sync);
    return () => { media.removeEventListener("change", sync); window.removeEventListener("arivvio-theme", sync); };
  }, []);
  return <div className="theme-control"><button type="button" aria-label={expanded ? "Hide theme settings" : "Show theme settings"} aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="min-h-9 px-2">{expanded ? "Close" : "◐"}</button>{expanded && <label>Theme <select aria-label="Color theme" value={theme} onChange={e => { const next = e.target.value as Theme; setTheme(next); document.documentElement.dataset.theme = next === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : next; try { localStorage.setItem("arivvio.theme", next); window.dispatchEvent(new Event("arivvio-theme")); setError(""); } catch { setError("Theme could not be saved in this browser."); } }}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>}{error && <span role="status">{error}</span>}</div>;
}
