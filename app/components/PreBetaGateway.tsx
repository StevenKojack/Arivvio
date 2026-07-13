"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { SupportProjectForm } from "./SupportProjectForm";

const demoFeatures = [
  "Planning intake",
  "Event recommendations",
  "Vendor marketplace",
  "Interactive maps",
  "Quote cart concepts",
  "Vendor onboarding concepts",
  "Account and event dashboards",
];

const notReadyItems = [
  "Real bookings",
  "Live vendor availability",
  "Confirmed vendor pricing",
  "Payments or payouts",
  "Production messaging",
  "Email or SMS notifications",
  "Complete marketplace data",
  "Full support operations",
  "Final security and compliance review",
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
  const searchParams = useSearchParams();
  const [showSupport, setShowSupport] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [hasEnteredSession, setHasEnteredSession] = useState(
    () =>
      typeof window !== "undefined" &&
      window.sessionStorage.getItem("arivvio-demo-entered") === "true",
  );
  const showInfo = searchParams.get("info") === "1";

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);

    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    const entered = window.sessionStorage.getItem("arivvio-demo-entered") === "true";

    if (entered && !showInfo) {
      router.replace("/demo");
    }
  }, [router, showInfo]);

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

  const enterDelay = useMemo(
    () => (prefersReducedMotion ? 260 : 2100),
    [prefersReducedMotion],
  );

  function enterDemo() {
    window.sessionStorage.setItem("arivvio-demo-entered", "true");
    setHasEnteredSession(true);
    setIsEntering(true);
    window.setTimeout(() => router.push("/demo"), enterDelay);
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F7F4EC] text-[#0D1321]">
      <section className="relative isolate min-h-screen overflow-hidden px-5 pb-16 pt-5 sm:px-8 lg:px-12">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_76%_16%,rgba(212,175,55,0.2),transparent_30%),linear-gradient(135deg,#FFFCF7_0%,#F7F4EC_48%,#EEF0F5_100%)]" />
        <div className="absolute left-1/2 top-24 -z-10 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full border border-[#D4AF37]/16 bg-white/35 blur-3xl" />

        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center" aria-label="Arivvio">
            <Image
              src="/logo-assets/web/arivvio-logo-light.png"
              alt="Arivvio"
              width={202}
              height={166}
              priority
              className="h-14 w-auto rounded-[14px] object-contain sm:h-16"
            />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/support-project"
              className="hidden rounded-full border border-[#D4AF37]/18 bg-white/78 px-4 py-2 text-sm font-semibold text-[#0D1321] shadow-[0_12px_30px_rgba(13,19,33,0.06)] transition hover:-translate-y-0.5 hover:border-[#D4AF37]/45 sm:inline-flex"
            >
              Contact
            </Link>
            <button
              type="button"
              onClick={enterDemo}
              className="rounded-full bg-[#0D1321] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(13,19,33,0.18)] transition hover:-translate-y-0.5 hover:bg-[#111A2E]"
            >
              {hasEnteredSession ? "Continue Demo" : "Enter Demo"}
            </button>
          </div>
        </nav>

        <div className="mx-auto grid min-h-[calc(100vh-96px)] max-w-7xl gap-10 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] lg:items-center lg:py-8">
          <div>
            <p className="w-fit rounded-full border border-[#D4AF37]/22 bg-white/82 px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#8A6A16] shadow-[0_12px_30px_rgba(13,19,33,0.07)] backdrop-blur">
              Pre-Beta Demo
            </p>
            <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-tight text-[#0D1321] sm:text-7xl lg:text-8xl">
              Plan an entire event in one place.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-700 sm:text-xl">
              Arivvio is building a smarter way to discover venues and vendors,
              organize every detail, request quotes, and bring an event together
              from one connected workspace.
            </p>
            <p className="mt-5 max-w-2xl rounded-[24px] border border-[#D4AF37]/18 bg-white/82 px-5 py-4 text-base font-semibold leading-7 text-[#0D1321] shadow-[0_18px_50px_rgba(13,19,33,0.07)] backdrop-blur">
              Arivvio is currently under active development. You are viewing an
              early product demonstration, not a finished marketplace.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={enterDemo}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#0D1321] px-7 py-4 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(13,19,33,0.2)] transition hover:-translate-y-0.5 hover:bg-[#111A2E]"
              >
                Enter Demo
              </button>
              <button
                type="button"
                onClick={() => setShowSupport(true)}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#D4AF37]/24 bg-white/82 px-7 py-4 text-sm font-semibold text-[#0D1321] shadow-[0_14px_34px_rgba(13,19,33,0.08)] transition hover:-translate-y-0.5 hover:border-[#D4AF37]/60"
              >
                Help Out
              </button>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
              I would like to invest, fund, collaborate, contribute, or contact
              the Arivvio team.
            </p>
            <p className="mt-4 max-w-2xl text-xs font-semibold leading-5 text-neutral-500">
              By entering, you understand that this is unfinished demonstration
              software.
            </p>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-[34px] border border-[#D4AF37]/16 bg-white/86 p-4 shadow-[0_30px_110px_rgba(13,19,33,0.16)] backdrop-blur">
              <div className="rounded-[28px] bg-[#0D1321] p-5 text-white">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
                    Event workspace
                  </p>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                    Demo only
                  </span>
                </div>
                <Image
                  src="/logo-assets/web/arivvio-full-logo-dark.png"
                  alt=""
                  width={965}
                  height={830}
                  priority
                  className="mx-auto mt-6 h-40 w-auto object-contain opacity-95 sm:h-48"
                />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[24px] border border-[#D4AF37]/14 bg-[#FFFCF7] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8A6A16]">
                    Vendor discovery
                  </p>
                  <div className="mt-4 space-y-3">
                    {["Venues", "Food and catering", "Music and DJs"].map(
                      (item, index) => (
                        <div key={item} className="flex items-center gap-3">
                          <span className="h-14 w-16 rounded-2xl bg-[linear-gradient(135deg,#0D1321,#22324F)]" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-neutral-950">
                              {item}
                            </span>
                            <span className="mt-2 block h-2 rounded-full bg-[#D4AF37]/20" />
                          </span>
                          <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-neutral-500">
                            {index + 3}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
                <div className="rounded-[24px] border border-[#D4AF37]/14 bg-[#F6F3EA] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8A6A16]">
                    Map and quote concepts
                  </p>
                  <div className="mt-4 h-40 rounded-[22px] bg-[radial-gradient(circle_at_38%_44%,rgba(212,175,55,0.38),transparent_8%),radial-gradient(circle_at_68%_30%,rgba(13,19,33,0.2),transparent_7%),linear-gradient(135deg,#FFFFFF,#E9ECF2)] ring-1 ring-[#D4AF37]/10" />
                  <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-neutral-700">
                    Estimated quote cart
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl rounded-[30px] border border-[#D4AF37]/18 bg-white p-6 shadow-[0_22px_70px_rgba(13,19,33,0.06)] sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8A6A16]">
            Important demo disclosure
          </p>
          <p className="mt-4 max-w-5xl text-lg leading-8 text-neutral-700">
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
            maps, organization, and coordination in one calmer place.
          </InfoPanel>
          <ChecklistPanel title="What the demo includes" items={demoFeatures} />
          <ChecklistPanel title="What is not ready" items={notReadyItems} />
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[30px] border border-[#D4AF37]/16 bg-[#0D1321] p-7 text-white shadow-[0_24px_80px_rgba(13,19,33,0.14)]">
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

          <div className="rounded-[30px] border border-[#D4AF37]/16 bg-white p-7 shadow-[0_22px_70px_rgba(13,19,33,0.06)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8A6A16]">
              Support the project
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#0D1321]">
              Help bring Arivvio to life.
            </h2>
            <p className="mt-4 leading-7 text-neutral-600">
              Arivvio is looking for thoughtful support from people who
              understand events, marketplaces, hospitality, design, technology,
              and early-stage company building.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {supportAudiences.map((audience) => (
                <span
                  key={audience}
                  className="rounded-full border border-[#D4AF37]/16 bg-[#FFFCF7] px-3 py-1 text-xs font-semibold text-neutral-700"
                >
                  {audience}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowSupport(true)}
              className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-[#0D1321] px-6 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(13,19,33,0.18)] transition hover:-translate-y-0.5 hover:bg-[#111A2E]"
            >
              Contact Arivvio
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#D4AF37]/16 px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-[#0D1321]">Arivvio Pre-Beta Demo</p>
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
      {isEntering ? <EnterDemoTransition reduced={prefersReducedMotion} /> : null}
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
    <article className="rounded-[30px] border border-[#D4AF37]/16 bg-white p-7 shadow-[0_22px_70px_rgba(13,19,33,0.06)]">
      <h2 className="text-2xl font-semibold tracking-tight text-[#0D1321]">
        {title}
      </h2>
      <p className="mt-4 leading-7 text-neutral-600">{children}</p>
    </article>
  );
}

function ChecklistPanel({ items, title }: { items: string[]; title: string }) {
  return (
    <article className="rounded-[30px] border border-[#D4AF37]/16 bg-white p-7 shadow-[0_22px_70px_rgba(13,19,33,0.06)]">
      <h2 className="text-2xl font-semibold tracking-tight text-[#0D1321]">
        {title}
      </h2>
      <ul className="mt-5 grid gap-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6 text-neutral-700">
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
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[30px] bg-[#FFFCF7] p-5 shadow-[0_34px_120px_rgba(13,19,33,0.28)] sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8A6A16]">
              Help out
            </p>
            <h2
              id="support-project-title"
              className="mt-2 text-3xl font-semibold tracking-tight text-[#0D1321]"
            >
              Contact the Arivvio team.
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#D4AF37]/20 bg-white px-4 py-2 text-sm font-semibold text-[#0D1321] transition hover:-translate-y-0.5 hover:border-[#D4AF37]/50"
          >
            Close
          </button>
        </div>
        <SupportProjectForm />
      </div>
    </div>
  );
}

function EnterDemoTransition({ reduced }: { reduced: boolean }) {
  return (
    <div
      className={`fixed inset-0 z-[70] grid place-items-center bg-[#0D1321] text-white ${
        reduced ? "animate-[gatewayFadeIn_220ms_ease-out]" : "animate-[gatewayFadeIn_280ms_ease-out]"
      }`}
      aria-live="polite"
      aria-label="Entering the Arivvio demo"
    >
      <div className="grid justify-items-center px-6 text-center">
        <Image
          src="/logo-assets/web/arivvio-mark-dark.png"
          alt=""
          width={575}
          height={570}
          priority
          className={`h-28 w-28 object-cover sm:h-36 sm:w-36 ${
            reduced ? "" : "animate-[logoReveal_900ms_ease-out_forwards]"
          }`}
        />
        <p className="mt-8 flex gap-2 text-2xl font-semibold tracking-[0.36em] sm:text-4xl">
          {"ARIVVIO".split("").map((letter, index) => (
            <span
              key={`${letter}-${index}`}
              className={reduced ? "" : "inline-block opacity-0 animate-[letterRise_520ms_ease-out_forwards]"}
              style={{ animationDelay: `${520 + index * 72}ms` }}
            >
              {letter}
            </span>
          ))}
        </p>
        <p
          className={`mt-4 text-sm font-semibold uppercase tracking-[0.32em] text-[#D4AF37] ${
            reduced ? "" : "opacity-0 animate-[gatewayFadeIn_520ms_ease-out_1300ms_forwards]"
          }`}
        >
          Elevate every event
        </p>
      </div>
    </div>
  );
}
