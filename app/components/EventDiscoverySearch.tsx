"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { eventExamples, defaultDiscoveryEvents } from "@/lib/event-intelligence/taxonomy";
import { getDiscoveryFamily, searchEventIntents } from "@/lib/event-intelligence/search";
import { SearchLogoMark } from "./SearchLogoMark";

const loopExamples = [...defaultDiscoveryEvents, ...defaultDiscoveryEvents];

export function EventDiscoverySearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = useId();
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const suggestions = useMemo(() => {
    const seen = new Set<string>();
    return searchEventIntents(query, getDiscoveryFamily(query) ? eventExamples.length : 8).filter((suggestion) => {
      const key = suggestion.label.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [query]);
  const placeholder = eventExamples[0];

  useEffect(() => {
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [activeIndex]);

  function submitSearch(nextQuery = query, complete = false) {
    let cleanQuery = nextQuery.trim() || placeholder;
    if (complete && cleanQuery.split(/\s+/).length <= 2 && suggestions[0] && suggestions[0].label.toLowerCase().startsWith(cleanQuery.toLowerCase())) cleanQuery = suggestions[0].label;
    if (getDiscoveryFamily(cleanQuery)) { setFocused(true); return; }
    const params = new URLSearchParams({ query: cleanQuery });

    router.push(`/discover?${params.toString()}`);
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitSearch(query, true);
        }}
        className="relative"
      >
        <div className="event-search-bar flex min-h-[72px] items-center gap-3 rounded-full border border-[#D4AF37]/20 bg-white/94 px-4 py-3 shadow-[0_24px_80px_rgba(13,19,33,0.13)] transition focus-within:border-[#D4AF37]/55 focus-within:shadow-[0_28px_90px_rgba(13,19,33,0.17)] sm:px-5">
          <SearchLogoMark />
          <input
            role="combobox"
            aria-label="What are you planning?"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={focused}
            aria-activedescendant={focused && activeIndex >= 0 && suggestions[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
            value={query}
            onBlur={(event) => { if (!event.currentTarget.form?.contains(event.relatedTarget)) { setFocused(false); setActiveIndex(-1); } }}
            onChange={(event) => { setQuery(event.target.value); setActiveIndex(-1); }}
            onFocus={() => setFocused(true)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" && suggestions.length) {
                event.preventDefault();
                setFocused(true);
                setActiveIndex((current) => (current + 1 + suggestions.length) % suggestions.length);
              } else if (event.key === "ArrowUp" && suggestions.length) {
                event.preventDefault();
                setFocused(true);
                setActiveIndex((current) => current < 0 ? suggestions.length - 1 : (current - 1 + suggestions.length) % suggestions.length);
              } else if (event.key === "Enter" && activeIndex >= 0 && suggestions[activeIndex]) {
                event.preventDefault();
                submitSearch(suggestions[activeIndex].label);
              } else if (event.key === "Escape") {
                setFocused(false);
                setActiveIndex(-1);
              }
            }}
            placeholder={placeholder}
            className="h-12 min-w-0 flex-1 bg-transparent text-lg font-semibold text-neutral-950 outline-none placeholder:text-neutral-400 sm:text-xl"
          />
          <button
            type="submit"
            className="h-12 rounded-full bg-[#0D1321] px-5 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(13,19,33,0.2)] transition hover:-translate-y-0.5 hover:bg-[#111A2E] sm:px-7"
          >
            Plan my event
          </button>
        </div>

        {focused ? (
          <div id={listboxId} role="listbox" className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-[min(420px,56vh)] touch-pan-y scroll-py-2 overflow-y-auto overscroll-contain scroll-smooth rounded-[28px] border border-[#D4AF37]/18 bg-white p-2 shadow-[0_28px_90px_rgba(13,19,33,0.16)]">
            {getDiscoveryFamily(query) && <p className="px-4 py-2 text-xs ui-muted">Choose the occasion you have in mind.</p>}
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.label}-${suggestion.recognition.profile.id}`}
                id={`${listboxId}-${index}`}
                ref={(element) => { optionRefs.current[index] = element; }}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => submitSearch(suggestion.label)}
                className={`flex w-full items-center justify-between gap-4 rounded-[22px] px-4 py-3 text-left transition ${index === activeIndex ? "bg-[#FFF8E1]" : "hover:bg-[#FFF8E1]"}`}
              >
                <span>
                  <span className="block text-sm font-semibold text-neutral-950">
                    {suggestion.label}
                  </span>
                  <span className="mt-1 block text-xs font-medium text-neutral-500">
                    {suggestion.recognition.profile.venueStyle}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-[#FFF8E1] px-3 py-1 text-xs font-semibold text-[#8A6A16]">
                  Event
                </span>
              </button>
            ))}
            {query.trim() && !getDiscoveryFamily(query) && <button type="button" className="w-full rounded-xl p-4 text-left text-sm ui-muted" onMouseDown={(event) => event.preventDefault()} onClick={() => submitSearch()}>Plan “{query.trim()}” as my own event →</button>}
          </div>
        ) : null}
      </form>

      <div className="mt-6 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <div className="flex w-max animate-[eventLoop_34s_linear_infinite] gap-2">
          {loopExamples.map((example, index) => (
            <button
              key={`${example}-${index}`}
              type="button"
              onClick={() => submitSearch(example)}
              className="rounded-full border border-[#D4AF37]/16 bg-white/72 px-4 py-2 text-sm font-semibold text-neutral-700 backdrop-blur transition hover:-translate-y-0.5 hover:border-[#D4AF37]/50 hover:text-[#0D1321]"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
