"use client";

import { useEffect, useRef } from "react";
import { AskArivvioButton } from "@/app/components/AskArivvioButton";
import { getAssistantContext, publishAssistantContext } from "@/lib/assistant/session";
import { providerContext } from "@/lib/assistant/context";
import Image from "next/image";
import { ListingImage } from "./ListingImage";
import type { MarketplaceItem } from "@/app/data/marketplace";
import { getVendorImage } from "@/lib/marketplace/vendorImages";

export function ProviderProfile({ item, quote, matchReason, selected, onAdd, onClose, preview = false }: { item: MarketplaceItem; quote: number; matchReason: string; selected: boolean; onAdd: () => void; onClose: () => void; preview?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const demo = item.databaseSource === false;
  useEffect(() => {
    if(preview)return;
    const previous = getAssistantContext("/marketplace");
    publishAssistantContext({...previous,providers:[providerContext(item)]});
    return ()=>publishAssistantContext(previous);
  }, [item, preview]);
  useEffect(() => {
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = overflow; };
  }, []);
  return <dialog ref={dialog} onCancel={onClose} aria-labelledby={`provider-title-${item.id}`} className="context-reveal fixed inset-0 m-auto max-h-[94dvh] w-[min(960px,96vw)] overflow-y-auto rounded-3xl ui-soft p-0 ui-text shadow-2xl backdrop:bg-black/50">
    <header className="sticky top-0 z-10 flex items-center justify-between border-b ui-border ui-surface px-5 py-4"><button onClick={onClose} className="rounded-full border px-4 py-2 text-sm font-semibold">{preview ? "Close preview" : "← Back to marketplace"}</button><span className="text-xs ui-muted">Provider details</span></header>
    <div className="relative h-48 sm:h-72"><ListingImage src={item.photoUrl || getVendorImage(item)} alt={item.photoUrl ? `${item.name} cover` : `${item.type} category illustration`} sizes="960px" className="object-cover" /><span className="absolute bottom-4 left-5 rounded-full ui-surface px-3 py-1 text-xs">{item.photoUrl ? "Business cover" : "Illustrative image"}</span></div>
    <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[1fr_280px]">
      <div>{item.profileImageUrl && <Image src={item.profileImageUrl} alt={`${item.name} business image`} width={88} height={88} unoptimized className="mb-4 rounded-xl object-contain" />}<p className="text-xs font-semibold uppercase tracking-widest text-[#8A6A16]">{item.type} · {item.location}</p><h2 id={`provider-title-${item.id}`} className="mt-3 text-3xl font-semibold tracking-tight">{item.name}</h2>
        <p className="mt-3 rounded-xl ui-soft p-3 text-xs leading-5">{demo ? "Demo listing. Pricing, capabilities and scheduling shown here are illustrative, not a verified business offer." : "Contact the provider to confirm pricing and availability."}</p>
        <section className="mt-8"><h3 className="text-lg font-semibold">About</h3><p className="mt-3 text-sm leading-7 ui-muted">{item.description}</p></section>
        <section className="mt-8"><h3 className="text-lg font-semibold">Services</h3><div className="mt-3 flex flex-wrap gap-2">{item.services.map(s => <span key={s} className="rounded-full border ui-surface px-3 py-2 text-sm">{s}</span>)}</div>{item.serviceOptions?.map(option => <div key={option.title} className="mt-4 rounded-xl border ui-surface p-4"><h4 className="font-semibold">{option.title}</h4><p className="mt-2 text-sm ui-muted">{option.description}</p><p className="mt-2 text-xs text-[#8A6A16]">{option.estimateLabel}</p></div>)}</section>
        <section className="mt-8"><h3 className="text-lg font-semibold">Details at a glance</h3><dl className="mt-4 grid grid-cols-2 gap-5 text-sm">{[["Event types", item.events.join(", ")], ["Service area", item.serviceRadiusMiles ? `Within ${item.serviceRadiusMiles} miles` : item.location], ["Capacity", item.capacity], ["Languages", item.languages?.join(", ")], ["Specialties", item.tags?.join(", ")]].filter(([,v]) => v).map(([label,value]) => <div key={label}><dt className="ui-muted">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}</dl></section>
        {item.marketplaceRules && <section className="mt-8"><h3 className="text-lg font-semibold">Events and service preferences</h3><p className="mt-3 text-sm">Serves: {item.marketplaceRules.eventMode === "selected" ? item.marketplaceRules.served.join(", ") : "Event types not restricted"}</p><p className="mt-2 text-sm">Does not serve: {item.marketplaceRules.excluded.join(", ") || "No exclusions specified"}</p><p className="mt-2 text-sm">Audience: {({unspecified:"Not specified",all:"All ages",adults:"Adult events, 18+",kids:"Kids and teens, under 18","21plus":"Nightlife, 21+"})[item.marketplaceRules.audience]}</p><p className="mt-2 text-sm">{item.marketplaceRules.region} {item.marketplaceRules.travelNotes}</p></section>}
        {!!item.galleryUrls?.length && <section className="mt-8"><h3 className="text-lg font-semibold">Gallery</h3><div className="mt-3 grid grid-cols-2 gap-3">{item.galleryUrls.map((src,i)=><div className="relative aspect-[4/3] overflow-hidden rounded-xl" key={i}><Image src={src} alt={`${item.name} gallery photo ${i+1}`} fill unoptimized sizes="350px" className="object-cover" /></div>)}</div></section>}
        <section className="mt-8"><h3 className="text-lg font-semibold">Availability</h3><p className="mt-3 text-sm leading-7 ui-muted">Availability is not live. Adding this provider to your cart does not reserve a date.</p></section>
      </div>
      <aside className="h-fit rounded-2xl border ui-border ui-surface p-5 md:sticky md:top-24"><p className="text-xs ui-muted">{demo ? "Demo estimate" : "Estimated price"}</p><p className="mt-2 text-3xl font-semibold">{preview ? "See packages" : <>${quote.toLocaleString()}</>}</p><p className="mt-2 text-xs ui-muted">{preview ? "Pricing is shown for each service." : item.pricing.label}</p><div className="my-5 border-y py-4"><h3 className="text-sm font-semibold">{preview ? "Marketplace headline" : "Your event fit"}</h3><p className="mt-2 text-sm leading-6 ui-muted">{matchReason}</p></div><button disabled={selected || preview} onClick={onAdd} className="w-full rounded-full ui-primary px-4 py-3 text-sm font-semibold disabled:opacity-60">{preview ? "Add to quote cart · preview" : selected ? "Added to your quote cart" : "Add to quote cart"}</button>{!preview&&<AskArivvioButton />}<p className="mt-3 text-xs leading-5 ui-muted">Compare your selections in the marketplace cart. No payment is taken and no booking is confirmed.</p></aside>
    </div>
  </dialog>;
}
