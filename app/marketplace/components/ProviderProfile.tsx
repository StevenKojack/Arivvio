"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import type { MarketplaceItem } from "@/app/data/marketplace";
import { getVendorImage } from "@/lib/marketplace/vendorImages";

export function ProviderProfile({ item, quote, matchReason, selected, onAdd, onClose, preview = false }: { item: MarketplaceItem; quote: number; matchReason: string; selected: boolean; onAdd: () => void; onClose: () => void; preview?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const demo = item.databaseSource === false;
  useEffect(() => {
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = overflow; };
  }, []);
  return <dialog ref={dialog} onCancel={onClose} aria-labelledby={`provider-title-${item.id}`} className="fixed inset-0 m-auto max-h-[94dvh] w-[min(960px,96vw)] overflow-y-auto rounded-3xl bg-[#FAF9F6] p-0 text-[#0D1321] shadow-2xl backdrop:bg-black/50">
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-4"><button onClick={onClose} className="rounded-full border px-4 py-2 text-sm font-semibold">{preview ? "Close preview" : "← Back to marketplace"}</button><span className="text-xs text-neutral-500">Provider details</span></header>
    <div className="relative h-48 sm:h-72"><Image src={getVendorImage(item)} alt={`${item.type} category illustration`} fill unoptimized sizes="960px" className="object-cover" /><span className="absolute bottom-4 left-5 rounded-full bg-white px-3 py-1 text-xs">Illustrative image</span></div>
    <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[1fr_280px]">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-[#8A6A16]">{item.type} · {item.location}</p><h2 id={`provider-title-${item.id}`} className="mt-3 text-3xl font-semibold tracking-tight">{item.name}</h2>
        <p className="mt-3 rounded-xl bg-[#EFEAE0] p-3 text-xs leading-5">{demo ? "Demo listing. Pricing, capabilities and scheduling shown here are illustrative, not a verified business offer." : "Contact the provider to confirm pricing and availability."}</p>
        <section className="mt-8"><h3 className="text-lg font-semibold">About</h3><p className="mt-3 text-sm leading-7 text-neutral-600">{item.description}</p></section>
        <section className="mt-8"><h3 className="text-lg font-semibold">Services</h3><div className="mt-3 flex flex-wrap gap-2">{item.services.map(s => <span key={s} className="rounded-full border bg-white px-3 py-2 text-sm">{s}</span>)}</div>{item.serviceOptions?.map(option => <div key={option.title} className="mt-4 rounded-xl border bg-white p-4"><h4 className="font-semibold">{option.title}</h4><p className="mt-2 text-sm text-neutral-600">{option.description}</p><p className="mt-2 text-xs text-[#8A6A16]">{option.estimateLabel}</p></div>)}</section>
        <section className="mt-8"><h3 className="text-lg font-semibold">Details at a glance</h3><dl className="mt-4 grid grid-cols-2 gap-5 text-sm">{[["Event types", item.events.join(", ")], ["Service area", item.serviceRadiusMiles ? `Within ${item.serviceRadiusMiles} miles` : item.location], ["Capacity", item.capacity], ["Languages", item.languages?.join(", ")], ["Specialties", item.tags?.join(", ")]].filter(([,v]) => v).map(([label,value]) => <div key={label}><dt className="text-neutral-500">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}</dl></section>
        {item.marketplaceRules && <section className="mt-8"><h3 className="text-lg font-semibold">Events and service preferences</h3><p className="mt-3 text-sm">Serves: {item.marketplaceRules.eventMode === "selected" ? item.marketplaceRules.served.join(", ") : "Event types not restricted"}</p><p className="mt-2 text-sm">Does not serve: {item.marketplaceRules.excluded.join(", ") || "No exclusions specified"}</p><p className="mt-2 text-sm">Audience: {({unspecified:"Not specified",all:"All ages",adults:"Adult events, 18+",kids:"Kids and teens, under 18","21plus":"Nightlife, 21+"})[item.marketplaceRules.audience]}</p><p className="mt-2 text-sm">{item.marketplaceRules.region} {item.marketplaceRules.travelNotes}</p></section>}
        <section className="mt-8"><h3 className="text-lg font-semibold">Availability</h3><p className="mt-3 text-sm leading-7 text-neutral-600">Availability is not live. Adding this provider to your cart does not reserve a date.</p></section>
      </div>
      <aside className="h-fit rounded-2xl border border-neutral-200 bg-white p-5 md:sticky md:top-24"><p className="text-xs text-neutral-500">{demo ? "Demo estimate" : "Estimated price"}</p><p className="mt-2 text-3xl font-semibold">{preview && !quote ? "See packages" : `${quote.toLocaleString()}`}</p><p className="mt-2 text-xs text-neutral-500">{item.pricing.label}</p><div className="my-5 border-y py-4"><h3 className="text-sm font-semibold">Your event fit</h3><p className="mt-2 text-sm leading-6 text-neutral-600">{matchReason}</p></div><button hidden={preview} disabled={selected} onClick={onAdd} className="w-full rounded-full bg-[#0D1321] px-4 py-3 text-sm font-semibold text-white disabled:bg-[#E5ECE4] disabled:text-[#285E49]">{selected ? "Added to your quote cart" : "Add to quote cart"}</button><p className="mt-3 text-xs leading-5 text-neutral-500">Compare your selections in the marketplace cart. No payment is taken and no booking is confirmed.</p></aside>
    </div>
  </dialog>;
}
