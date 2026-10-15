import Image from "next/image";
import Link from "next/link";
import { eventAtmospheres, atmosphereImage } from "@/lib/event-intelligence/atmosphere";
import { defaultDiscoveryEvents } from "@/lib/event-intelligence/taxonomy";
import { discoveryCategories } from "@/lib/planning-taxonomy/discovery";
import { marketplaceItems } from "@/app/data/marketplace";
import { getVendorImage } from "@/lib/marketplace/vendorImages";
const featured = [eventAtmospheres[1], eventAtmospheres[2], eventAtmospheres[0], eventAtmospheres[5]];
const services = [{id:"venues", service:"Venue"},{id:"food",service:"Catering"},{id:"music",service:"DJ"},{id:"photo-video",service:"Photography"},{id:"rentals",service:"Rentals"},{id:"decor",service:"Florals"},{id:"transportation",service:"Transportation"},{id:"entertainment",service:"Magic"}];
export function OccasionDiscovery() {
  return <section id="categories" className="customer-editorial occasion-discovery">
    <div className="section-heading"><div><p className="eyebrow">Big days. Small gatherings. Everything between.</p><h2>What brings <em>you</em> together?</h2></div><Link className="text-link" href="/discover">Something else in mind? ↗</Link></div>
    <div className="occasion-photo-grid">{featured.map((scene, i) => <Link href={`/discover?query=${encodeURIComponent(scene.query)}`} className={`occasion-photo occasion-photo-${i}`} key={scene.id}><div className="occasion-photo-frame"><Image src={atmosphereImage(scene, 750)} alt={scene.alt} fill unoptimized sizes="(max-width: 640px) 78vw, 30vw" className="object-cover" /></div><div className="occasion-photo-label"><h3>{scene.query}</h3><span aria-hidden="true">↗</span></div><p>{scene.phrase}</p></Link>)}</div>
    <div className="more-occasions"><span>And so much more</span>{defaultDiscoveryEvents.filter(query => !featured.some(s => s.query === query)).slice(0, 6).map(query=><Link key={query} href={`/discover?query=${encodeURIComponent(query)}`}>{query}</Link>)}<Link href="/discover?query=Memorial">Memorial</Link></div>
  </section>;
}
export function ServicesDiscovery() {
  return <section className="customer-editorial services-discovery"><div className="services-intro"><p className="eyebrow">The people who make it happen</p><h2>A place.<br/>A menu.<br/><em>Your kind of music.</em></h2><p>Find the people who understand what you have in mind.</p><Link href="/marketplace?entryMode=browse" className="text-link">Meet your event team ↗</Link></div><div className="service-discovery-list">{services.map(({id,service})=>{const category=discoveryCategories.find(c=>c.id===id)!;const item=marketplaceItems.find(i=>i.type===service)!;return <Link key={id} href={`/marketplace?entryMode=service&services=${encodeURIComponent(service)}`}><div className="service-photo"><Image src={getVendorImage(item)} alt="" fill unoptimized sizes="96px" className="object-cover" /></div><div><h3>{category.label}</h3><p>{category.description}</p></div><span aria-hidden="true">↗</span></Link>;})}</div></section>;
}
