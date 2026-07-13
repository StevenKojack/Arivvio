"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { eventExamples } from "@/lib/event-intelligence/taxonomy";
import { searchEventIntents } from "@/lib/event-intelligence/search";

const loopExamples = [...eventExamples.slice(0, 18), ...eventExamples.slice(0, 18)];

export function EventDiscoverySearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const suggestions = useMemo(() => searchEventIntents(query, 6), [query]);
  const placeholder = eventExamples[0];

  function submitSearch(nextQuery = query) {
    const cleanQuery = nextQuery.trim() || placeholder;
    const params = new URLSearchParams({ query: cleanQuery });

    router.push(`/discover?${params.toString()}`);
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitSearch();
        }}
        className="relative"
      >
        <div className="flex min-h-[72px] items-center gap-3 rounded-full border border-[#D4AF37]/20 bg-white/94 px-4 py-3 shadow-[0_24px_80px_rgba(13,19,33,0.13)] transition focus-within:border-[#D4AF37]/55 focus-within:shadow-[0_28px_90px_rgba(13,19,33,0.17)] sm:px-5">
          <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0D1321] text-[#D4AF37] shadow-[0_12px_28px_rgba(13,19,33,0.2)] sm:flex">
            <svg aria-hidden="true" className="h-7 w-7" viewBox="0 0 48 48" fill="none">
              <path d="M8 35 21 10c1.4-2.7 4.6-2.7 6 0l13 25" stroke="currentColor" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 35 17.5 29M38 35 30.5 29" stroke="currentColor" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="m18 21 6 8 6-8M19 30l5 6.4 5-6.4" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <input
            value={query}
            onBlur={() => window.setTimeout(() => setFocused(false), 120)}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
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
          <div className="absolute left-0 right-0 top-[84px] z-20 overflow-hidden rounded-[28px] border border-[#D4AF37]/18 bg-white p-2 shadow-[0_28px_90px_rgba(13,19,33,0.16)]">
            {suggestions.map((suggestion) => (
              <button
                key={`${suggestion.label}-${suggestion.recognition.profile.id}`}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => submitSearch(suggestion.label)}
                className="flex w-full items-center justify-between gap-4 rounded-[22px] px-4 py-3 text-left transition hover:bg-[#FFF8E1]"
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
                  {suggestion.recognition.profile.primaryType}
                </span>
              </button>
            ))}
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
