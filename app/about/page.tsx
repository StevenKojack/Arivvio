import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "../components/Navigation";
import { PlatformStatus } from "../components/PlatformStatus";
export const metadata: Metadata = {
  title: "About ARIVVIO | Event Planning & Vendor Platform",
  description:
    "Bring event planning, providers and event management together. Learn how ARIVVIO works for planners and event businesses.",
};
export default function AboutPage() {
  return (
    <main className="customer-experience min-h-screen ui-page ui-text">
      <Navigation />
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-20">
        <header className="max-w-3xl">
          <p className="eyebrow">About ARIVVIO</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
            Your occasion.
            <br />
            Your people. One place.
          </h1>
          <p className="mt-6 text-lg leading-8 ui-muted">
            ARIVVIO brings planning, a vendor marketplace and event management
            together, from the first idea to the details of the day.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="hub-primary" href="/plan">
              Plan an event
            </Link>
            <Link className="hub-button" href="/marketplace?entryMode=browse">
              Explore Marketplace
            </Link>
          </div>
        </header>
        <div className="my-12 grid gap-6 md:grid-cols-2">
          <section className="hub-card p-6 sm:p-8">
            <p className="eyebrow">For planners</p>
            <h2 className="mt-3 text-2xl font-semibold">
              Turn an idea into an event.
            </h2>
            <p className="mt-4 leading-7 ui-muted">
              Build your plan, discover providers, request quotes and keep
              conversations and bookings with your event. Sign in to save your
              event and return to it across devices.
            </p>
            <Link className="text-link mt-5" href="/account">
              Open My Events ↗
            </Link>
          </section>
          <section className="hub-card p-6 sm:p-8">
            <p className="eyebrow">For event businesses</p>
            <h2 className="mt-3 text-2xl font-semibold">
              Keep the business of events together.
            </h2>
            <p className="mt-4 leading-7 ui-muted">
              Bring your services to the Marketplace. Manage inquiries, quotes,
              bookings, your calendar and event operations from your vendor
              workspace.
            </p>
            <div className="mt-5 flex flex-wrap gap-5">
              <Link className="text-link" href="/vendor/login">
                For Vendors ↗
              </Link>
              <Link className="text-link" href="/claim-business">
                Claim your business ↗
              </Link>
            </div>
          </section>
        </div>
        <section className="border-t ui-border pt-10">
          <p className="eyebrow">Where we are today</p>
          <h2 className="mt-3 text-3xl font-semibold">
            Early stage. Clear about what works.
          </h2>
          <p className="mt-4 max-w-3xl leading-7 ui-muted">
            ARIVVIO is in pre-beta. Real account features sit alongside clearly
            labeled demos and public business listings. Features and saved data
            may change during development.
          </p>
          <PlatformStatus />
          <Link href="/legal" className="text-link mt-7">
            Marketplace & Pre-Beta Information ↗
          </Link>
        </section>
      </div>
    </main>
  );
}
