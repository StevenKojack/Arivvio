"use client";

import type { ServicePackage } from "@/lib/service-catalog/model";
import { PublicServicePackages } from "./ServicePackages";
import { ProfileSections } from "@/app/components/ProfileSections";
import { OfficialBusinessWork } from "@/app/components/OfficialBusinessWork";
import { PricingDisclosure } from "./PricingDisclosure";
import Link from "next/link";
import { listingPresentation } from "@/lib/marketplace/listing-state";
import { useEffect, useRef } from "react";
import { BusinessMark } from "@/app/components/BusinessMark";
import { getAssistantContext, publishAssistantContext } from "@/lib/assistant/session";
import { providerContext } from "@/lib/assistant/context";
import Image from "next/image";
import { ListingImage } from "./ListingImage";
import type { MarketplaceItem } from "@/app/data/marketplace";
import { profileCover } from "@/lib/marketplace/vendorImages";

import { BusinessStatusBadge } from "@/app/components/BusinessStatusBadge";
import { lockDocumentScroll } from "@/lib/ui/scroll-lock";

export function ProviderProfile({ eventId, item, quote, selected, onAdd, onPackage, onClose, preview = false }: { eventId?: string; item: MarketplaceItem; quote: number; matchReason: string; selected: boolean; onAdd: () => void; onPackage?: (item: ServicePackage) => void; onClose: () => void; preview?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const listing = listingPresentation(item);
  const media = profileCover(item);
  const packageAction = listing.canRequest && onPackage
    ? (offer: ServicePackage) => <button type="button" className="hub-button mt-2" onClick={() => onPackage(offer)}>Select {offer.name}</button>
    : undefined;
  const demo = item.databaseSource === false;
  useEffect(() => {
    if(preview)return;
    const previous = getAssistantContext("/marketplace");
    publishAssistantContext({...previous,providers:[providerContext(item)]});
    return ()=>publishAssistantContext(previous);
  }, [item, preview]);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    const unlock = lockDocumentScroll();
    element?.showModal();

    return () => { element?.close(); unlock(); previous?.focus({preventScroll:true}); };
  }, []);
  const logo = item.databaseSource === false ? item.profileImageUrl : item.media?.filter(m=>m.status==="approved" && m.kind==="logo").sort((a,b)=>a.order-b.order)[0]?.url;
  const name=item.businessName||item.name;
  const [summary,...more]=(item.businessSummary||item.description||"").split(/\n\s*\n/);
  const offerings=more.find(p=>p.startsWith("Services:"))?.slice(9);
  const details=more.filter(p=>!p.startsWith("Services:"));
  const gallery=item.media?.filter(m=>m.status==="approved" && m.kind==="business_photo" && m.url!==media.src).sort((a,b)=>a.order-b.order);
  const inquiry=`/business/${item.vendorId}?serviceId=${item.serviceId??""}${eventId ? `&eventId=${encodeURIComponent(eventId)}` : ""}`;
  return <dialog ref={dialog} onCancel={onClose} aria-labelledby={`provider-title-${item.id}`} className="profile-window ui-surface ui-text backdrop:bg-black/55">
    <button type="button" onClick={onClose} aria-label="Close profile" className="profile-dismiss">×</button>
    <div className="provider-profile-scroll">
      <div className="relative aspect-[2.65] overflow-hidden"><ListingImage src={media.src} alt={media.alt} sizes="800px" className={media.label==="Business logo"?"object-contain":"object-cover"}/>{media.illustrative&&<span className="cover-caption">{media.label}</span>}</div>
      <div className="px-5 pb-7 sm:px-9">
        <div className="relative -mt-6 inline-flex rounded-2xl border-4 ui-border ui-surface"><BusinessMark large name={name} logo={logo}/></div>
        {media.attribution&&<small className="ml-3 ui-muted">{media.attribution}</small>}
        <div className="mt-3 flex flex-wrap items-center gap-3"><h2 id={`provider-title-${item.id}`} className="text-3xl font-semibold tracking-tight">{name}</h2><BusinessStatusBadge item={item}/></div>
        <p className="mt-1 text-sm ui-muted">{item.type} · {item.branch||item.location}</p>
        <p className="my-4 max-w-prose leading-7">{item.shortIntro||summary}</p>{item.shortIntro&&summary&&summary!==item.shortIntro&&<p className="mb-4 leading-7">{summary}</p>}
        <section className="profile-group"><h3>Services &amp; offerings</h3><p>{offerings||item.services.join(" · ")}</p>{item.serviceOptions?.map(o=><div key={o.serviceId ?? o.title} className="mt-3"><strong>{o.title}</strong><p>{o.description}</p>
        {!preview && item.listingState === "claimed" && item.vendorId && o.serviceId && <PublicServicePackages business={item.vendorId} service={o.serviceId} action={packageAction}/>}</div>)}
        {!preview && !item.serviceOptions?.length && item.listingState === "claimed" && item.vendorId && item.serviceId && <div className="mt-3"><strong>{item.serviceTitle ?? item.type}</strong><PublicServicePackages business={item.vendorId} service={item.serviceId} action={packageAction}/></div>}
        {item.databaseSource&&<OfficialBusinessWork businessId={item.vendorId}/>}</section>
        <ProfileSections sections={item.profileSections}/>
        {gallery?.length?<section className="profile-group"><h3>Gallery</h3><div className="grid grid-cols-2 gap-3">{gallery.map(m=><figure key={m.url}><Image src={m.url} alt={m.alt} width={420} height={270} unoptimized className="aspect-video w-full rounded-xl object-cover"/>{m.attribution&&<figcaption>{m.attribution}</figcaption>}</figure>)}</div></section>:null}
        <section className="profile-group"><h3>Location &amp; booking</h3>{item.databaseSource && <p className="text-sm ui-muted">Availability to be confirmed with provider.</p>}<p>{item.address||item.location}{item.serviceRadiusMiles?` · Serves within ${item.serviceRadiusMiles} miles`:""}</p>
        {details.length>0&&<details className="my-3"><summary className="cursor-pointer font-medium">Event fit, pricing and booking details</summary>{details.map((d,i)=><p key={i} className="mt-3 whitespace-pre-line">{d}</p>)}</details>}
        {item.databaseSource&&/^https?:\/\//.test(item.sourceUrl)&&<a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">Official website</a>}</section>
        <footer className="mt-4 flex flex-wrap items-center justify-between gap-4"><div><p className="font-semibold">{item.pricingKnown===false?"Contact for pricing":preview?"See package pricing":(demo?"Demo estimate · ":"Estimated · ")+"$"+quote.toLocaleString()}</p>{item.pricingKnown!==false&&<details><summary className="cursor-pointer text-xs">Estimate details</summary><PricingDisclosure item={item}/></details>}</div>
        {preview?<span className="text-sm ui-muted">Saved profile preview</span>:item.listingState==="unclaimed"?<Link href={inquiry} className="hub-primary">Request through ARIVVIO</Link>:<button className="hub-primary" disabled={selected||preview||!listing.canRequest} onClick={onAdd}>{selected?"Added to cart":preview?"Preview":!listing.canRequest?"Requests unavailable":demo?"Add Demo to cart":"Add service to quote cart"}</button>}</footer>
        {!preview&&item.listingState==="unclaimed"&&<p className="mt-5 text-sm ui-muted">Own this business? <Link className="underline" href={`/business/${item.vendorId}?mode=claim`}>Claim this listing</Link></p>}
      </div>
    </div>
  </dialog>;
}
