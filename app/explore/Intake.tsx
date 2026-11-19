"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { buildEventIntelligenceProfile } from "@/lib/event-intelligence/engine";
import { applyPlanActions } from "@/lib/assistant/actions";
import { saveAssistantProfile } from "@/lib/assistant/session";
import { inquiryReturnKey } from "@/lib/acquisition/activation";
import { SaveEventToAccount } from "../components/SaveEventToAccount";
import type { EventIntelligenceProfile } from "@/lib/event-intelligence/types";
import { Frame } from "./Surfaces";
import { demoQuote } from "./Journey";
const questions = [
  ["date", "When are you thinking?", "June, or 2027-06-12"],
  ["location", "Where will it take place?", "City or venue"],
  ["guestCount", "How many guests?", "Estimated guests"],
  ["budget", "What budget feels right?", "Total budget in dollars"],
] as const;
type Draft = {
  idea: string;
  advanced: boolean;
  step: number;
  guidedStep?: number;
  answers: Record<string, string>;
  input: string;
  id: string;
};
export function Intake({
  idea = "",
  advanced = false,
  vendor = "",
  business = "",
  service = "",
}: {
  idea?: string;
  advanced?: boolean;
  vendor?: string;
  business?: string;
  service?: string;
}) {
  const router = useRouter();
  const key =
    "arivvio:intake:v2:" + JSON.stringify([idea, vendor, business, service]);
  const [draft, set] = useState<Draft>({
      idea,
      advanced,
      step: idea && !advanced ? 0 : -1,
      answers: {},
      input: "",
      id: "",
    }),
    [ready, initialized] = useState(false),
    [error, setError] = useState(""),
    [edit, setEdit] = useState(""),
    [value, setValue] = useState(""),
    [saved, setSaved] = useState<EventIntelligenceProfile | null>(null);
  useEffect(() => {
    let stored: Draft | null = null;
    try {
      stored = JSON.parse(sessionStorage.getItem(key) ?? "null");
    } catch {}
    queueMicrotask(() => {
      if (stored && typeof stored.idea === "string" && stored.answers)
        set(stored);
      initialized(true);
    });
  }, [key]);
  useEffect(() => {
    if (ready) sessionStorage.setItem(key, JSON.stringify(draft));
  }, [ready, key, draft]);
  const base = buildEventIntelligenceProfile({ query: draft.idea });
  const profile = applyPlanActions(
    base,
    Object.entries(draft.answers)
      .filter(([, v]) => v)
      .map(([k, v]) => ({
        kind: "planning",
        field: k === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(v) ? "dateHint" : k,
        value: v,
        stageId: "",
      })),
  ).profile;
  if (
    draft.answers.date &&
    !/^\d{4}-\d{2}-\d{2}$/.test(draft.answers.date) &&
    profile.planning
  )
    profile.planning.date = "";
  const step = questions.findIndex(
    ([k], i) =>
      i >= draft.step &&
      !(profile.planning?.[k] || (k === "date" && profile.dateHint)),
  );
  const asking = draft.step >= 0 && !draft.advanced && step >= 0;
  const review = draft.step >= 0 && !asking;
  function correct(k: string, v: string) {
    try {
      const field =
        k === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(v) ? "dateHint" : k;
      applyPlanActions(profile, [
        { kind: "planning", field, value: v, stageId: "" },
      ]);
      set((d) => ({ ...d, answers: { ...d.answers, [k]: v } }));
      setEdit("");
      setError("");
    } catch {
      setError("Enter a valid value.");
    }
  }
  function save() {
    try {
      const p = { ...profile, eventId: draft.id || crypto.randomUUID() };
      saveAssistantProfile(p);
      if (business) set((d) => ({ ...d, id: p.eventId }));
      if (business) {
        sessionStorage.setItem(
          inquiryReturnKey,
          "/business/" + business + "?serviceId=" + encodeURIComponent(service),
        );
        setSaved(p);
      } else {
        sessionStorage.removeItem(key);
        router.push(
          vendor ? demoQuote(vendor, p) : "/account/demo/events/" + p.eventId,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save draft.");
    }
  }
  function next(skip = false) {
    setError("");
    if (draft.step < 0) {
      if (draft.idea.trim()) set((d) => ({ ...d, step: 0 }));
      return;
    }
    if (!asking) return;
    const k = questions[step][0],
      v = draft.input.trim();
    if (!skip && v) {
      try {
        applyPlanActions(profile, [
          {
            kind: "planning",
            field:
              k === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(v) ? "dateHint" : k,
            value: v,
            stageId: "",
          },
        ]);
      } catch {
        setError("Check this value or skip it for now.");
        return;
      }
    }
    set((d) => ({
      ...d,
      step: step + 1,
      input: "",
      answers: skip ? d.answers : { ...d.answers, [k]: v },
    }));
  }
  return (
    <Frame>
      <section className="intake-panel">
        <small>Event planner</small>
        <div className="view-switch">
          {["Guided", "Advanced"].map((mode, i) => (
            <button
              key={mode}
              aria-pressed={draft.advanced === Boolean(i)}
              onClick={() => {
                setError("");
                if (Boolean(i) === draft.advanced) return;
                setEdit("");
                set((d) => ({
                  ...d,
                  advanced: Boolean(i),
                  guidedStep: i ? d.step : d.guidedStep,
                  step: i ? -1 : (d.guidedStep ?? (d.idea.trim() ? 0 : -1)),
                }));
              }}
            >
              {mode}
            </button>
          ))}
        </div>
        {saved ? (
          <>
            <h1>Your draft is ready</h1>
            <p>
              Save it to your account to continue with the selected business.
            </p>
            <SaveEventToAccount profile={saved} />
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (review) save();
              else next();
            }}
          >
            {draft.step < 0 ? (
              <>
                <h1>
                  {draft.advanced
                    ? "Describe your event"
                    : "What’s the occasion?"}
                </h1>
                <textarea
                  required
                  maxLength={2000}
                  aria-label="Event idea"
                  placeholder="A graduation party near Santa Clarita for 80 guests…"
                  value={draft.idea}
                  onChange={(e) => set({ ...draft, idea: e.target.value })}
                />
              </>
            ) : asking ? (
              <>
                <small>
                  Detail {step + 1} of {questions.length}
                </small>
                <h1>{questions[step][1]}</h1>
                <input
                  key={step}
                  autoFocus
                  aria-label={questions[step][1]}
                  placeholder={questions[step][2]}
                  value={draft.input}
                  onChange={(e) => set({ ...draft, input: e.target.value })}
                />
              </>
            ) : (
              <>
                <h1>Review your event</h1>
                <h2>{profile.recognition.identity.selectedDisplayEvent}</h2>
                <p>{draft.idea}</p>
                <dl>
                  {questions.map(([k]) => (
                    <div key={k}>
                      <dt>{k === "guestCount" ? "Guests" : k}</dt>
                      <dd>
                        {edit === k ? (
                          <>
                            <input
                              aria-label={"Correct " + k}
                              value={value}
                              onChange={(e) => setValue(e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => correct(k, value.trim())}
                            >
                              Apply correction
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            aria-label={"Edit " + k}
                            onClick={() => {
                              setEdit(k);
                              setValue(
                                String(
                                  profile.planning?.[k] ||
                                    (k === "date" && profile.dateHint) ||
                                    "",
                                ),
                              );
                            }}
                          >
                            {profile.planning?.[k] ||
                              (k === "date" && profile.dateHint) ||
                              "To confirm"}{" "}
                            ✎
                          </button>
                        )}
                      </dd>
                    </div>
                  ))}
                  <div>
                    <dt>Services</dt>
                    <dd>
                      {profile.requestedServices.join(", ") || "Choose later"}
                    </dd>
                  </div>
                </dl>
              </>
            )}
            <div className="intake-actions">
              <button disabled={!ready || !!edit} className="solid">
                {review
                  ? "Create event draft"
                  : draft.advanced
                    ? "Interpret my event"
                    : "Continue"}
              </button>
              {asking && (
                <button type="button" onClick={() => next(true)}>
                  Skip for now
                </button>
              )}
              {review && (
                <button
                  type="button"
                  onClick={() =>
                    set((d) => ({ ...d, advanced: true, step: -1 }))
                  }
                >
                  Edit description
                </button>
              )}
            </div>
          </form>
        )}
        {error && <p role="alert">{error}</p>}
      </section>
    </Frame>
  );
}
