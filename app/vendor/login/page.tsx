import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "../../auth/AuthForm";
import { ThemeControl } from "../../components/ThemeControl";
import { Logo } from "../../components/Logo";
import { EventAtmosphere } from "../../components/EventAtmosphere";

export default function VendorLoginPage() {
  return <main className="customer-experience vendor-entry min-h-screen ui-page ui-text lg:grid lg:grid-cols-2">
    <aside className="vendor-entry-photo relative overflow-hidden">
      <EventAtmosphere priority />
      <div className="event-photo-caption"><p className="text-xs uppercase tracking-[.2em]">For the people behind the occasion</p><h2 className="mt-4 max-w-lg text-3xl font-medium leading-tight sm:text-5xl">You make the moments.<br />We help bring them together.</h2></div>
    </aside>
    <section className="px-6 py-8 sm:px-12 lg:px-16 lg:py-12">
      <div className="flex items-center justify-between gap-3"><Logo /><ThemeControl /></div>
      <div className="mx-auto mt-10 max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#8A6A16]">Arivvio for vendors</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Welcome to your next chapter.</h1>
        <p className="mt-3 text-sm leading-6 ui-muted">Your services, dates, and event opportunities. Together.</p>
        <Suspense fallback={<p className="mt-8">Loading sign in…</p>}><AuthForm mode="login" defaultNext="/vendor/dashboard" /></Suspense>
        <div className="mt-7 border-t ui-border pt-6"><Link href="/vendor/demo" className="hub-button w-full">Explore Vendor Demo</Link><p className="mt-3 text-center text-xs leading-5 ui-muted">Try a fictional business, calendar, and services. No account needed.</p></div>
        <p className="mt-6 text-center text-sm ui-muted">Here to plan an event? <Link href="/demo" className="font-semibold underline">Start here</Link></p>
      </div>
    </section>
  </main>;
}
