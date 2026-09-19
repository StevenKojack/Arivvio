"use client";

import Link from "next/link";
import { EventAtmosphere } from "./EventAtmosphere";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { SupportProjectForm } from "./SupportProjectForm";
import { BrandMark } from "./Logo";

const demoFeatures = [
  "Connected event planning, including multi-part occasions",
  "Marketplace discovery and full vendor listings",
  "Quote review, demo submission, and saved request status",
  "Vendor Demo with calendar, availability, and business tools",
];

const notReadyItems = [
  "Real bookings, payments, or payouts",
  "Confirmed prices or live vendor availability",
  "Real vendor messages, email, or SMS",
];

const supportAudiences = [
  "Investors",
  "Funding partners",
  "Strategic collaborators",
  "Early vendors",
  "Designers and developers",
  "Advisors",
  "Event professionals",
  "Pilot users",
];

export function PreBetaGateway() {
  const router = useRouter();
  const [showSupport, setShowSupport] = useState(false);
  const [entering, setEntering] = useState(false);
  useEffect(() => { router.prefetch("/demo"); }, [router]);
  useEffect(() => {
    if (!showSupport) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowSupport(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showSupport]);

  function enterDemo() {
    if (entering) return;
    try { window.sessionStorage.setItem("arivvio-demo-entered", "true"); } catch { /* The demo still opens if storage is unavailable. */ }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { router.push("/demo"); return; }
    setEntering(true);
    window.setTimeout(() => router.push("/demo"), 220);
  }

  return (
    <main className={`customer-experience ui-page min-h-screen overflow-x-hidden ${entering ? "lobby-entering" : ""}`}>
      {entering && <div className="demo-entry" role="status" aria-label="Entering Arivvio demo"><p className="text-sm font-medium">Your occasion. Everything it needs.</p></div>}
      <section className="relative isolate min-h-screen overflow-hidden px-5 pb-16 pt-5 sm:px-8 lg:px-12">
        <div className="lobby-backdrop absolute inset-0 -z-20" />
        <div className="absolute left-1/2 top-24 -z-10 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full border border-[#D4AF37]/16 ui-surface blur-3xl" />

        <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center" aria-label="Arivvio">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/vendor/login" className="hidden rounded-full border px-4 py-2 text-sm font-semibold sm:block">Become a vendor</Link>
            <Link
              href="/support-project"
              className="hidden rounded-full border border-[#D4AF37]/18 ui-surface px-4 py-2 text-sm font-semibold ui-text shadow-[0_12px_30px_rgba(13,19,33,0.06)] transition hover:-translate-y-0.5 hover:border-[#D4AF37]/45 sm:inline-flex"
            >
              Contact
            </Link>
            <button
              type="button"
              onClick={enterDemo}
              className="rounded-full ui-primary px-5 py-2.5 text-sm font-semibold shadow-[0_16px_34px_rgba(13,19,33,0.18)] transition hover:-translate-y-0.5 hover:opacity-90"
            >
              Enter Demo
            </button>
          </div>
        </nav>

        <div className="mx-auto grid min-h-[calc(100vh-96px)] max-w-7xl gap-10 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] lg:items-center lg:py-8">
          <div>
            <p className="w-fit rounded-full border border-[#D4AF37]/22 ui-surface px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#8A6A16] shadow-[0_12px_30px_rgba(13,19,33,0.07)] backdrop-blur">
              Pre-Beta Demo
            </p>
            <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-tight ui-text sm:text-6xl lg:text-7xl">
              Bring your people together.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 ui-muted sm:text-xl">
              From an intimate dinner to a once-in-a-lifetime day. Find the setting, meet your event team, and bring every part of your occasion into one plan.
            </p>
            <p className="mt-5 max-w-2xl rounded-[24px] border border-[#D4AF37]/18 ui-surface px-5 py-4 text-base font-semibold leading-7 ui-text shadow-[0_18px_50px_rgba(13,19,33,0.07)] backdrop-blur">
              Explore connected planning, vendor discovery, and demo quote requests. Try the Vendor Demo for calendars and business tools. No account needed to explore.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={enterDemo}
                className="inline-flex min-h-12 items-center justify-center rounded-full ui-primary px-7 py-4 text-sm font-semibold shadow-[0_18px_40px_rgba(13,19,33,0.2)] transition hover:-translate-y-0.5 hover:opacity-90"
              >
                Enter Demo
              </button>
              <button
                type="button"
                onClick={() => setShowSupport(true)}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#D4AF37]/24 ui-surface px-7 py-4 text-sm font-semibold ui-text shadow-[0_14px_34px_rgba(13,19,33,0.08)] transition hover:-translate-y-0.5 hover:border-[#D4AF37]/60"
              >
                Help Out
              </button>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 ui-muted">
              Have something to bring to the table? Invest, collaborate, or contact the team.
            </p>
            <p className="mt-4 max-w-2xl text-xs font-semibold leading-5 ui-muted">
              Pre-beta demo. Requests stay in your browser; no vendors are contacted and no bookings are made.
            </p>
          </div>

          <figure className="event-photo-frame relative self-center overflow-hidden rounded-[32px]">
            <EventAtmosphere priority />
            <figcaption className="event-photo-caption"><p className="text-xs uppercase tracking-[.2em]">Make room for the moments</p><p className="mt-3 text-3xl font-medium">Big occasions.<br />Small details. All together.</p></figcaption>
          </figure>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl rounded-[30px] border border-[#D4AF37]/18 ui-surface p-6 shadow-[0_22px_70px_rgba(13,19,33,0.06)] sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8A6A16]">
            Important demo disclosure
          </p>
          <p className="mt-4 max-w-5xl text-lg leading-8 ui-muted">
            Arivvio is currently a Pre-Beta demonstration. Features may be
            incomplete, simulated, or unavailable. Vendor listings and prices
            may be examples. No real booking, payment, availability, quote,
            communication, or service fulfillment is guaranteed. Creating an
            account currently provides demo access only.
          </p>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-3">
          <InfoPanel title="What Arivvio is">
            Arivvio aims to become a unified marketplace and planning workspace
            for events, helping planners move from idea to discovery, quotes,
            organization, and coordination in one calmer place.
          </InfoPanel>
          <ChecklistPanel title="What the demo includes" items={demoFeatures} />
          <ChecklistPanel title="What is not ready" items={notReadyItems} />
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[30px] border border-[#D4AF37]/16 ui-brand-panel p-7 shadow-[0_24px_80px_rgba(13,19,33,0.14)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
              Current account behavior
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">
              Demo access only.
            </h2>
            <p className="mt-4 leading-7 text-neutral-300">
              Visitors may create an account for demonstration purposes.
              Creating an account currently does not activate a complete
              planning or vendor service. Accounts, data, and demo content may
              be modified, reset, or removed during development.
            </p>
            <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white">
              Do not enter sensitive information or rely on this demo for a real
              event.
            </p>
          </div>

          <div className="rounded-[30px] border border-[#D4AF37]/16 ui-surface p-7 shadow-[0_22px_70px_rgba(13,19,33,0.06)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8A6A16]">
              Support the project
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight ui-text">
              Help bring Arivvio to life.
            </h2>
            <p className="mt-4 leading-7 ui-muted">
              Arivvio is looking for thoughtful support from people who
              understand events, marketplaces, hospitality, design, technology,
              and early-stage company building.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {supportAudiences.map((audience) => (
                <span
                  key={audience}
                  className="rounded-full border border-[#D4AF37]/16 ui-soft px-3 py-1 text-xs font-semibold ui-muted"
                >
                  {audience}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowSupport(true)}
              className="mt-7 inline-flex h-12 items-center justify-center rounded-full ui-primary px-6 text-sm font-semibold shadow-[0_14px_30px_rgba(13,19,33,0.18)] transition hover:-translate-y-0.5 hover:opacity-90"
            >
              Contact Arivvio
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#D4AF37]/16 px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm ui-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold ui-text">Arivvio Pre-Beta Demo</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/demo" className="font-semibold hover:text-[#8A6A16]">
              Demo homepage
            </Link>
            <Link
              href="/support-project"
              className="font-semibold hover:text-[#8A6A16]"
            >
              Contact
            </Link>
          </div>
        </div>
      </footer>

      {showSupport ? (
        <SupportModal onClose={() => setShowSupport(false)} />
      ) : null}
    </main>
  );
}

function InfoPanel({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <article className="rounded-[30px] border border-[#D4AF37]/16 ui-surface p-7 shadow-[0_22px_70px_rgba(13,19,33,0.06)]">
      <h2 className="text-2xl font-semibold tracking-tight ui-text">
        {title}
      </h2>
      <p className="mt-4 leading-7 ui-muted">{children}</p>
    </article>
  );
}

function ChecklistPanel({ items, title }: { items: string[]; title: string }) {
  return (
    <article className="rounded-[30px] border border-[#D4AF37]/16 ui-surface p-7 shadow-[0_22px_70px_rgba(13,19,33,0.06)]">
      <h2 className="text-2xl font-semibold tracking-tight ui-text">
        {title}
      </h2>
      <ul className="mt-5 grid gap-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6 ui-muted">
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#D4AF37]" />
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}

function SupportModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#0D1321]/45 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-project-title"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[30px] ui-soft p-5 shadow-[0_34px_120px_rgba(13,19,33,0.28)] sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8A6A16]">
              Help out
            </p>
            <h2
              id="support-project-title"
              className="mt-2 text-3xl font-semibold tracking-tight ui-text"
            >
              Contact the Arivvio team.
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#D4AF37]/20 ui-surface px-4 py-2 text-sm font-semibold ui-text transition hover:-translate-y-0.5 hover:border-[#D4AF37]/50"
          >
            Close
          </button>
        </div>
        <SupportProjectForm />
      </div>
    </div>
  );
}
