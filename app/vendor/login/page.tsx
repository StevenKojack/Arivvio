import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "../../auth/AuthForm";
import { Logo } from "../../components/Logo";

export default function VendorLoginPage() {
  return <main className="min-h-screen ui-soft ui-text lg:grid lg:grid-cols-2">
    <section className="px-6 py-8 sm:px-12 lg:px-16">
      <Logo />
      <div className="mx-auto mt-12 max-w-xl lg:mt-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A6A16]">Arivvio for vendors</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Your business.<br />Their next great event.</h1>
        <p className="mt-4 text-base leading-7 ui-muted">Find new clients and manage every event in one place.</p>
        <div className="mt-6 rounded-2xl border border-[#D4AF37]/30 ui-surface p-5"><Link href="/vendor/demo" className="inline-flex rounded-full ui-primary px-5 py-3 text-sm font-semibold">Explore Vendor Demo</Link><p className="mt-3 text-sm leading-6 ui-muted">Try events, calendar, availability and business setup. No account needed.</p></div>
        <Suspense fallback={<p className="mt-8">Loading sign in…</p>}><AuthForm mode="login" defaultNext="/vendor/dashboard" /></Suspense>
        <p className="mt-6 text-center text-sm ui-muted">Just looking for a service? <Link href="/vendors" className="font-semibold underline">Find vendors</Link></p>
      </div>
    </section>
    <aside className="flex flex-col justify-center ui-primary px-8 py-12 sm:px-16 lg:min-h-screen">
      <p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">Made for the people behind the occasion</p>
      <h2 className="mt-6 max-w-lg text-3xl font-semibold leading-tight sm:text-5xl">More than a listing.<br />A home for your event business.</h2>
      <div className="mt-10 space-y-7">{[["01", "Tell your story", "Build a profile around your services and specialties."], ["02", "Keep dates organized", "Manage availability through your vendor workspace."], ["03", "Prepare for what is next", "Quotes, bookings and payments are still in development."]].map(([n,title,body]) => <div key={n} className="flex gap-5 border-t border-white/15 pt-6"><span className="text-[#D4AF37]">{n}</span><div><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-neutral-300">{body}</p></div></div>)}</div>
      <Link href="/auth/signup?next=%2Fvendor%2Fonboarding" className="mt-10 w-fit rounded-full ui-surface px-6 py-3 text-sm font-semibold ui-text">Create a vendor account →</Link>
      <p className="mt-4 text-xs text-neutral-400">Pre-beta. No live payments or guaranteed leads.</p>
    </aside>
  </main>;
}
