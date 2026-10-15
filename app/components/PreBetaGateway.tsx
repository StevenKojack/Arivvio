"use client";
import Link from "next/link";
import { useState } from "react";
import { OccasionHero } from "./OccasionHero";
import { OccasionDiscovery, ServicesDiscovery } from "./OccasionDiscovery";
import { Navigation } from "./Navigation";
import { HowItWorks } from "./HowItWorks";
import { SupportProjectForm } from "./SupportProjectForm";
import { CustomerDialog } from "./CustomerDialog";
export function PreBetaGateway() {
  const [showSupport, setShowSupport] = useState(false);
  return <main className="customer-experience customer-home ui-page min-h-screen"><Navigation />
    <OccasionHero />
    <OccasionDiscovery />
    <HowItWorks />
    <ServicesDiscovery />
    <section className="customer-editorial vendor-invitation"><div><p className="eyebrow">For the people behind the occasion</p><h2>You make the day.<br/>We help with the details.</h2><p>Keep your calendar, services and inquiries together, including events booked outside Arivvio.</p><Link href="/vendor/demo" className="hub-primary mt-6">Explore the vendor calendar ↗</Link></div><div className="vendor-invitation-aside"><span className="brand-angle" aria-hidden="true" /><h3>Built with event people.</h3><p>What would make your next event easier? We’d love to hear.</p><button className="text-link mt-4" onClick={()=>setShowSupport(true)}>Talk to the team ↗</button></div></section>
    <section className="customer-editorial preview-disclosure"><details className="demo-disclosure"><summary>About this pre-beta preview</summary><p className="mt-4 max-w-3xl text-sm leading-7 ui-muted">Listings, prices, availability and responses may be examples. This preview does not provide real bookings, payments, vendor messaging or service fulfillment. Demo plans stay on this device and do not sync between devices. Accounts and demo content may be reset during development.</p><Link href="/legal" className="text-link mt-4">Read the demo terms</Link></details></section>
    {showSupport && <CustomerDialog title="Contact Arivvio" onClose={()=>setShowSupport(false)}><div className="p-6"><SupportProjectForm /></div></CustomerDialog>}
  </main>;
}
