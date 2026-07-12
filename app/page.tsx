import Link from "next/link";
import Image from "next/image";
import { CategorySection } from "./components/CategorySection";
import { Footer } from "./components/Footer";
import { EventDiscoverySearch } from "./components/EventDiscoverySearch";
import { HowItWorks } from "./components/HowItWorks";
import { MarketplacePreview } from "./components/MarketplacePreview";
import { Navigation } from "./components/Navigation";
import { TrustSection } from "./components/TrustSection";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f4f1ec] text-neutral-950">
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
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(244,241,236,0.96),rgba(244,241,236,0.78)_45%,rgba(244,241,236,0.36)),linear-gradient(180deg,rgba(244,241,236,0.35),rgba(244,241,236,0.92))]" />
        <div className="relative mx-auto flex min-h-[calc(100vh-170px)] max-w-7xl flex-col justify-center">
          <p className="w-fit rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-semibold text-neutral-700 shadow-[0_12px_30px_rgba(20,20,20,0.08)] backdrop-blur">
            Calm event planning starts here
          </p>
          <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-tight text-neutral-950 sm:text-7xl lg:text-8xl">
            What are you planning?
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-700 sm:text-xl">
            Describe the event in your own words. Arivvio turns it into a
            planning profile, smart questions, and the right vendor stack.
          </p>
          <div className="mt-10 w-full max-w-3xl animate-[fadeUp_360ms_ease-out]">
            <EventDiscoverySearch />
          </div>
          <div className="mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
            {["Understands the event", "Finds the right places", "Builds the vendor stack"].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 text-sm font-semibold text-neutral-700 shadow-[0_14px_38px_rgba(20,20,20,0.07)] backdrop-blur"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
      <HowItWorks />
      <CategorySection />
      <MarketplacePreview />
      <TrustSection />
      <section className="bg-white px-6 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-lg border border-neutral-200 bg-[#f7f7f5] p-8 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e24b44]">
              Providers
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
              Bring your service into the Arivvio network.
            </h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-neutral-600">
              Venues, caterers, entertainers, rental teams, florists, and event
              specialists can receive clearer quote requests from real plans.
            </p>
          </div>
          <Link
            href="/vendor/onboarding"
            className="inline-flex h-12 w-fit items-center justify-center rounded-full bg-neutral-950 px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-neutral-800"
          >
            List your service
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
