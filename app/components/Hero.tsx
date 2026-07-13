import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <section className="bg-[#F6F3EA] px-6 pb-[72px] pt-10 sm:px-8 sm:pb-24 lg:px-12">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B88A1D]">
            Events, beautifully coordinated
          </p>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight text-neutral-950 sm:text-6xl lg:text-7xl">
            Plan any event in one place.
          </h1>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-neutral-700">
            Find venues, vendors, entertainment, rentals, invitations, and more.
          </p>
          <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              id="start"
              href="/discover"
              className="inline-flex h-[52px] items-center justify-center rounded-full bg-[#0D1321] px-7 text-base font-semibold text-white shadow-[0_16px_32px_rgba(13,19,33,0.20)] transition hover:bg-[#111A2E] focus:outline-none focus:ring-4 focus:ring-[#D4AF37]/30"
            >
              Start Planning
            </Link>
            <span className="text-sm font-medium text-neutral-500">
              Venues, teams, details, done.
            </span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-4 top-8 hidden rounded-lg bg-white px-5 py-4 shadow-[0_20px_48px_rgba(13,19,33,0.12)] md:block">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Available
            </p>
            <p className="mt-1 text-2xl font-semibold text-neutral-950">1,240+</p>
          </div>
          <div className="overflow-hidden rounded-lg border border-white bg-white shadow-[0_32px_80px_rgba(13,19,33,0.16)]">
            <Image
              src="/event-planning-hero.png"
              alt="Premium event planning table with invitations, venue cards, floral samples, and rental swatches"
              width={1536}
              height={1024}
              priority
              className="aspect-[4/3] h-full w-full object-cover"
            />
          </div>
          <div className="absolute -bottom-5 right-4 rounded-lg bg-[#0D1321] px-5 py-4 text-white shadow-[0_20px_48px_rgba(13,19,33,0.22)] sm:right-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
              One plan
            </p>
            <p className="mt-1 text-lg font-semibold">Every vendor</p>
          </div>
        </div>
      </div>
    </section>
  );
}
