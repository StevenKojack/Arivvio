"use client";
import Link from "next/link";
import { useState } from "react";
import { EventAtmosphere } from "./EventAtmosphere";
import { EventDiscoverySearch } from "./EventDiscoverySearch";
import { Navigation } from "./Navigation";
import { HowItWorks } from "./HowItWorks";
import { SupportProjectForm } from "./SupportProjectForm";
import { CustomerDialog } from "./CustomerDialog";
export function PreBetaGateway() {
 const [showSupport,setShowSupport]=useState(false);
 return <main className="customer-experience ui-page min-h-screen"><Navigation />
 <section className="planning-hero mx-auto max-w-7xl px-6 py-12 sm:px-8 sm:py-20"><div className="planning-hero-copy"><p className="eyebrow">Arivvio / Pre-beta preview</p><h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">Bring your people together.</h1><p className="mt-6 max-w-lg text-lg leading-8 ui-muted">Find venues and vendors, compare estimates, and keep every part of your event in one plan.</p><div className="mt-8"><EventDiscoverySearch /></div><p className="mt-6 max-w-lg text-xs leading-5 ui-muted">Explore without an account. Demo requests stay on this device. No real vendors are contacted or bookings made.</p></div><figure className="planning-hero-image"><EventAtmosphere priority /><figcaption>The occasion is yours. Start with a plan.</figcaption></figure></section>
 <HowItWorks />
 <section className="px-6 py-16 sm:px-8"><div className="vendor-intro mx-auto max-w-7xl"><div><p className="eyebrow">For event businesses</p><h2 className="mt-4 text-3xl font-semibold tracking-tight">More than a listing.</h2><p className="mt-5 max-w-lg leading-7 ui-muted">Keep your calendar, services and client inquiries together, including events booked outside Arivvio.</p><Link href="/vendor/demo" className="hub-primary mt-6">Explore Vendor Demo</Link></div><div><h3 className="text-xl font-semibold">Help shape Arivvio.</h3><p className="mt-4 max-w-md leading-7 ui-muted">We’re working with early vendors, planners and partners. Tell us what would make your next event easier.</p><button className="hub-button mt-6" onClick={()=>setShowSupport(true)}>Contact the team</button></div></div></section>
 <section className="mx-auto w-full max-w-7xl px-6 pb-16 sm:px-8"><details className="demo-disclosure"><summary>About this preview</summary><p className="mt-4 max-w-3xl text-sm leading-7 ui-muted">Listings, prices, availability and responses may be examples. This preview does not provide real bookings, payments, vendor messaging or service fulfillment. Demo plans stay on this device and do not sync between devices. Accounts and demo content may be reset during development.</p><Link href="/legal" className="text-link mt-4">Read the demo terms</Link></details></section>
 {showSupport&&<CustomerDialog title="Contact Arivvio" onClose={()=>setShowSupport(false)}><div className="p-6"><SupportProjectForm /></div></CustomerDialog>}</main>;
}
