"use client";

import { PricingDisclosure } from "./PricingDisclosure";
import Link from "next/link";
import { listingPresentation } from "@/lib/marketplace/listing-state";
import { useEffect, useRef } from "react";
import { AskArivvioButton } from "@/app/components/AskArivvioButton";
import { getAssistantContext, publishAssistantContext } from "@/lib/assistant/session";
import { providerContext } from "@/lib/assistant/context";
import Image from "next/image";
import { ListingImage } from "./ListingImage";
import type { MarketplaceItem } from "@/app/data/marketplace";
import { getVendorMedia } from "@/lib/marketplace/vendorImages";

import { BusinessStatusBadge } from "@/app/components/BusinessStatusBadge";
import { lockDocumentScroll } from "@/lib/ui/scroll-lock";

export function ProviderProfile({ eventId, item, quote, matchReason, selected, onAdd, onClose, preview = false }: { eventId?: string; item: MarketplaceItem; quote: number; matchReason: string; selected: boolean; onAdd: () => void; onClose: () => void; preview?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const listing = listingPresentation(item);
  const media = getVendorMedia(item);
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
  return <dialog ref={dialog} onCancel={onClose} aria-labelledby={`provider-title-${item.id}`} className="context-reveal fixed inset-0 m-auto max-h-[94dvh] w-[min(960px,96vw)] overflow-hidden rounded-2xl ui-soft p-0 ui-text shadow-2xl backdrop:bg-black/50">
    <header className="sticky top-0 z-10 flex items-center justify-between border-b ui-border ui-surface px-5 py-4"><button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-semibold">{preview ? "Close preview" : "← Back to marketplace"}</button><span className="text-xs ui-muted">Meet your event team</span></header>
    <div className="provider-profile-scroll">
    <div className="relative h-48 sm:h-72"><ListingImage src={media.src} alt={media.alt} sizes="960px" className="object-cover" /><span className="absolute bottom-4 left-5 rounded-lg ui-surface px-3 py-1 text-xs">{media.label}</span></div>
    <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[1fr_280px]">
      <div>{item.databaseSource === false && item.profileImageUrl && <Image src={item.profileImageUrl} alt={`${item.name} business image`} width={88} height={88} unoptimized className="mb-4 rounded-xl object-contain" />}<p className="text-xs font-semibold uppercase tracking-widest text-[#8A6A16]">{item.type} · {item.location}</p><h2 id={`provider-title-${item.id}`} className="mt-3 text-3xl font-semibold tracking-tight">{item.name}</h2>
        <div className="mt-3"><BusinessStatusBadge item={item}/></div><p className="mt-3 text-sm leading-6 ui-muted">{listing.description}</p>{media.attribution && <p className="mt-2 text-xs ui-muted">{media.attribution}</p>}
        {item.listingState === "unclaimed" && <p className="mt-4 text-sm"><Link className="underline" href={`/business/${item.vendorId}?mode=claim`}>Own this business? Claim this listing</Link>. <Link className="underline" href="/support-project">Contact ARIVVIO to correct or remove this listing.</Link></p>}
        {item.databaseSource && /^https?:\/\//.test(item.sourceUrl) && <p className="mt-3 text-sm"><a className="underline" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Official business website</a></p>}
        <section className="mt-8"><h3 className="text-lg font-semibold">Meet {item.name}</h3><p className="mt-3 text-sm leading-7 ui-muted">{item.description}</p></section>
        <section className="mt-8"><h3 className="text-lg font-semibold">What they bring to your event</h3><div className="mt-3 flex flex-wrap gap-2">{item.services.map(s => <span key={s} className="rounded-lg border ui-surface px-3 py-2 text-sm">{s}</span>)}</div>{item.serviceOptions?.map(option => <div key={option.title} className="mt-4 rounded-xl border ui-surface p-4"><h4 className="font-semibold">{option.title}</h4><p className="mt-2 text-sm ui-muted">{option.description}</p><p className="mt-2 text-xs text-[#8A6A16]">{option.estimateLabel}</p></div>)}</section>
        <section className="mt-8 border-t ui-border pt-6"><h3 className="text-lg font-semibold">Event fit & practical details</h3><dl className="mt-4 grid grid-cols-2 gap-5 text-sm">{[["Event types", item.events.join(", ")], ["Service area", item.serviceRadiusMiles ? `Within ${item.serviceRadiusMiles} miles` : item.location], ["Capacity", item.capacity], ["Languages", item.languages?.join(", ")], ["Specialties", item.tags?.join(", ")]].filter(([,v]) => v).map(([label,value]) => <div key={label}><dt className="ui-muted">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}</dl></section>
        {item.marketplaceRules && <details className="mt-8 border-t ui-border pt-5"><summary className="cursor-pointer text-sm font-semibold">More service preferences</summary><p className="mt-3 text-sm">Serves: {item.marketplaceRules.eventMode === "selected" ? item.marketplaceRules.served.join(", ") : "Event types not restricted"}</p><p className="mt-2 text-sm">Does not serve: {item.marketplaceRules.excluded.join(", ") || "No exclusions specified"}</p><p className="mt-2 text-sm">Audience: {({unspecified:"Not specified",all:"All ages",adults:"Adult events, 18+",kids:"Kids and teens, under 18","21plus":"Nightlife, 21+"})[item.marketplaceRules.audience]}</p><p className="mt-2 text-sm">{item.marketplaceRules.region} {item.marketplaceRules.travelNotes}</p></details>}
        {!!item.media?.filter(m=>m.status === "approved").length && <section className="mt-8"><h3 className="text-lg font-semibold">Gallery</h3><div className="mt-3 grid grid-cols-2 gap-3">{item.media.filter(m=>m.status === "approved").sort((a,b)=>a.order-b.order).map(m=><figure key={m.url}><div className="relative aspect-[4/3] overflow-hidden rounded-xl"><Image src={m.url} alt={m.alt} fill unoptimized sizes="350px" className="object-cover" /></div>{(m.kind === "illustration" || m.attribution) && <figcaption className="mt-1 text-xs ui-muted">{m.kind === "illustration" ? "Illustrative image. " : ""}{m.attribution}</figcaption>}</figure>)}</div></section>}
        <section className="mt-8"><h3 className="text-lg font-semibold">Availability</h3><p className="mt-3 text-sm leading-7 ui-muted">{demo ? "Illustrative schedule. These sample windows do not represent real availability." : "Availability is not confirmed. An inquiry does not reserve a date."}</p>{demo && item.availability.map((window,index)=><p key={index} className="mt-2 text-sm ui-muted">{window.days.join(", ")} · {window.start}–{window.end}</p>)}</section>
      </div>
      <aside className="h-fit rounded-2xl border ui-border ui-surface p-5 md:sticky md:top-24"><p className="text-xs ui-muted">{demo ? "Demo estimate" : "Estimated price"}</p><p className="mt-2 text-3xl font-semibold">{item.pricingKnown === false ? "Contact for pricing" : preview ? "See packages" : <>${quote.toLocaleString()}</>}</p><p className="mt-2 text-xs ui-muted">{preview ? "Pricing is shown for each service." : item.pricing.label}</p><PricingDisclosure item={item}/><div className="my-5 border-y py-4"><h3 className="text-sm font-semibold">{preview ? "A closer look" : "Your event fit"}</h3><p className="mt-2 text-sm leading-6 ui-muted">{matchReason}</p></div>{item.listingState === "unclaimed" ? <Link className="block rounded-lg ui-primary px-4 py-3 text-center text-sm font-semibold" href={`/business/${item.vendorId}?serviceId=${item.serviceId??""}${eventId ? `&eventId=${encodeURIComponent(eventId)}` : ""}`}>Request through ARIVVIO</Link> : <button disabled={selected || preview || !listing.canRequest} onClick={onAdd} className="w-full rounded-lg ui-primary px-4 py-3 text-sm font-semibold disabled:opacity-60">{!listing.canRequest ? "Requests not open yet" : preview ? "Add to quote cart · preview" : selected ? "Added to your quote cart" : demo ? "Add Demo to cart" : "Request Quote"}</button>}{!preview&&<AskArivvioButton />}<p className="mt-3 text-xs leading-5 ui-muted">Compare your selections in the marketplace cart. No payment is taken and no booking is confirmed.</p></aside>
    </div>
    </div>
  </dialog>;
}
