"use client";
import Link from "next/link";
import { EventPlanSnapshot } from "./EventPlanSnapshot";
import { VendorCard } from "@/app/marketplace/components/VendorCard";
import { marketplaceItems } from "@/app/data/marketplace";
const sampleVendor = { ...marketplaceItems.find(item => item.type === "Catering")!, databaseSource: false };
export function HowItWorks() {
  return <section className="product-story customer-editorial">
    <div className="story-heading"><p className="eyebrow">From “what if” to a plan</p><h2>Start with an idea.<br/><em>See it come together.</em></h2><p>A date, a few people, a place you love. You don’t need every answer to begin.</p></div>
    <div className="story-layout"><div className="story-copy"><div><span className="story-number">01</span><h3>Tell us about it.</h3><p>Search for your occasion or talk it through with Ask ARIVVIO. Add a ceremony, a reception, or another part of the day.</p><Link href="/discover" className="text-link">Build your plan ↗</Link></div><div><span className="story-number">02</span><h3>Find the right people.</h3><p>Explore venues, food, music and more. Look through specialties and estimates before making your shortlist.</p><Link href="/marketplace?entryMode=browse" className="text-link">Explore the Marketplace ↗</Link></div><div><span className="story-number">03</span><h3>Keep the details together.</h3><p>Come back to your Event Hub for your plan, vendor requests and the next thing to decide.</p><Link href="/account/demo" className="text-link">See your events ↗</Link></div></div>
    <div className="story-previews"><div className="story-plan"><EventPlanSnapshot sample name="An anniversary dinner" date="October · Date to confirm" guests="40 people" budget="$5,000" services={["Venue", "Catering", "Photography"]} /></div><div className="story-vendor"><p className="eyebrow mb-3">From the Marketplace</p><VendorCard item={sampleVendor} preview quote={0} buttonLabel="Meet this vendor" onAdd={()=>{}} /><p className="text-xs ui-muted mt-3">Illustrative photo and demo pricing. Open the profile to explore.</p></div></div></div>
  </section>;
}
