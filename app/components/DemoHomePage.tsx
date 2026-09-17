import Link from "next/link";
import Image from "next/image";
import { Footer } from "./Footer";
import { EventDiscoverySearch } from "./EventDiscoverySearch";
import { HowItWorks } from "./HowItWorks";
import { Navigation } from "./Navigation";

export function DemoHomePage() {
  return (
    <main className="min-h-screen ui-soft ui-text">
      <Navigation />
      <section className="relative isolate overflow-hidden px-6 py-20 sm:px-8 sm:py-28 lg:px-12">
        <Image
          src="/event-planning-hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(247,244,236,0.97),rgba(247,244,236,0.84)_45%,rgba(247,244,236,0.42)),linear-gradient(180deg,rgba(255,252,247,0.4),rgba(247,244,236,0.96))]" />
        <div className="absolute bottom-0 left-0 right-0 -z-10 h-28 bg-[linear-gradient(180deg,transparent,#F7F4EC)]" />
        <div className="relative mx-auto flex max-w-7xl flex-col justify-center">
          <p className="w-fit rounded-full border border-[#D4AF37]/20 ui-surface px-4 py-2 text-sm font-semibold ui-text shadow-[0_12px_30px_rgba(13,19,33,0.08)] backdrop-blur">
            Elevate every event
          </p>
          <h1 className="mt-8 max-w-4xl text-4xl font-semibold tracking-tight ui-text sm:text-6xl">
            Your occasion. Everything it needs.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 ui-muted sm:text-xl">
            Find the place, discover your team, and keep the details together.
            Start with an idea. Build an event that feels like you.
          </p>
          <div className="mt-10 w-full max-w-3xl animate-[fadeUp_360ms_ease-out]">
            <EventDiscoverySearch />
          </div>
          <div className="mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
            {[
              "Understands the event",
              "Finds the right places",
              "Builds the vendor stack",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-[#D4AF37]/16 ui-surface px-4 py-3 text-sm font-semibold ui-muted shadow-[0_14px_38px_rgba(13,19,33,0.07)] backdrop-blur"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section id="categories" className="mx-auto max-w-7xl px-6 py-12 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#8A6A16]">Find your starting point</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">Every kind of together.</h2>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Birthdays", "Birthday", "Make their next chapter memorable", "bg-[#EDE7DA]"],
            ["Weddings", "Wedding", "Your people. Your day. Your way.", "bg-[#E5ECE4]"],
            ["Gatherings", "Private party", "Good company deserves a great setting", "bg-[#E6EAF0]"],
            ["Company events", "Corporate dinner", "Bring the team together", "bg-[#EFE3DD]"],
          ].map(([name, query, note, color], index) => <Link key={name} href={`/discover?query=${encodeURIComponent(query)}`} className={`${color} rounded-2xl p-6 transition hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4`}><span className="text-sm ui-muted">0{index + 1}</span><h3 className="mt-8 text-xl font-semibold">{name} ↗</h3><p className="mt-2 text-sm leading-6 ui-muted">{note}</p></Link>)}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-12 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4"><h2 className="text-3xl font-semibold tracking-tight">Build your event team.</h2><Link href="/marketplace?entryMode=browse" className="text-sm font-semibold underline underline-offset-4">Explore the marketplace →</Link></div>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">{["Venue", "Catering", "DJ", "Photography", "Rentals", "Transportation", "Florals", "Magic"].map((service) => <Link key={service} href={`/marketplace?entryMode=service&services=${encodeURIComponent(service)}`} className="rounded-2xl border ui-border ui-surface p-5 font-semibold transition hover:border-[#B88A1D]">{service}<span className="float-right text-[#8A6A16]">↗</span></Link>)}</div>
        <p className="mt-4 text-xs ui-muted">Pre-beta preview. Listings and estimates are demonstration data, not confirmed offers or availability.</p>
      </section>
      <HowItWorks />
      <section className="ui-surface px-6 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-[30px] border border-[#D4AF37]/16 bg-[linear-gradient(135deg,#FFFCF7,#F6F3EA)] p-8 shadow-[0_22px_70px_rgba(13,19,33,0.06)] sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B88A1D]">
              Providers
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight ui-text sm:text-4xl">
              Find new clients. Keep every event organized.
            </h2>
            <p className="mt-3 max-w-xl text-base leading-7 ui-muted">
              Manage your calendar, services and outside bookings in one vendor workspace. Explore a fictional business account before signing up.
            </p>
          </div>
          <Link
            href="/vendor/demo"
            className="inline-flex h-12 w-fit items-center justify-center rounded-full ui-primary px-6 text-sm font-semibold shadow-[0_16px_34px_rgba(13,19,33,0.2)] transition hover:-translate-y-0.5 hover:opacity-90"
          >
            Explore Vendor Demo
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
