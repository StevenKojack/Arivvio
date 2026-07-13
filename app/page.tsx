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
    <main className="min-h-screen bg-[#F7F4EC] text-neutral-950">
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
        <div className="relative mx-auto flex min-h-[calc(100vh-170px)] max-w-7xl flex-col justify-center">
          <p className="w-fit rounded-full border border-[#D4AF37]/20 bg-white/82 px-4 py-2 text-sm font-semibold text-[#0D1321] shadow-[0_12px_30px_rgba(13,19,33,0.08)] backdrop-blur">
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
                className="rounded-2xl border border-[#D4AF37]/16 bg-white/78 px-4 py-3 text-sm font-semibold text-neutral-700 shadow-[0_14px_38px_rgba(13,19,33,0.07)] backdrop-blur"
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
        <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-[30px] border border-[#D4AF37]/16 bg-[linear-gradient(135deg,#FFFCF7,#F6F3EA)] p-8 shadow-[0_22px_70px_rgba(13,19,33,0.06)] sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B88A1D]">
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
            className="inline-flex h-12 w-fit items-center justify-center rounded-full bg-[#0D1321] px-6 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(13,19,33,0.2)] transition hover:-translate-y-0.5 hover:bg-[#111A2E]"
          >
            List your service
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
