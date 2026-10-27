"use client";

import {BusinessStatusBadge} from "./BusinessStatusBadge";
import Link from "next/link";
import {getVendorMedia} from "@/lib/marketplace/vendorImages";
import {ListingImage} from "@/app/marketplace/components/ListingImage";
import type { MarketplaceItem } from "../data/marketplace";

type MarketplaceCardProps = {
  available: boolean;
  buttonLabel?: string;
  driveMinutes?: number;
  item: MarketplaceItem;
  quote: number;
  onAdd: (item: MarketplaceItem) => void;
};

export function MarketplaceCard({
  available,
  buttonLabel = "Add to cart",
  driveMinutes,
  item,
  quote,
  onAdd,
}: MarketplaceCardProps) {
  const media=getVendorMedia(item);
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-[#D4AF37]/16 bg-white shadow-[0_18px_44px_rgba(13,19,33,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[#D4AF37]/38 hover:shadow-[0_24px_58px_rgba(13,19,33,0.1)]">
      <div className="relative h-40"><ListingImage src={media.src} alt={media.alt} sizes="400px"/>{media.illustrative&&<span className="absolute bottom-2 left-2 rounded ui-surface px-2 py-1 text-xs">{media.label}</span>}</div>
      <div className="flex flex-1 flex-col p-5"><BusinessStatusBadge item={item}/>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B88A1D]">
              {item.type}
            </p>
            <h3 className="mt-3 text-xl font-semibold tracking-tight text-neutral-950">
              {item.name}
            </h3>
          </div>

        </div>
        <p className="mt-3 text-sm font-medium text-neutral-500">{item.location}</p>
        <p className="mt-1 text-xs text-neutral-400">{item.address}</p>
        <p className="mt-4 flex-1 text-sm leading-6 text-neutral-600">
          {item.description}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {item.events.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[#D4AF37]/18 px-3 py-1 text-xs font-medium text-neutral-600"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {item.services.slice(0, 3).map((service) => (
            <span
              key={service}
              className="rounded-full bg-[#FFF8E1] px-3 py-1 text-xs font-semibold text-[#8A6A16]"
            >
              {service}
            </span>
          ))}
        </div>

        <div className="mt-5 rounded-[22px] bg-[#F6F3EA] p-4 ring-1 ring-[#D4AF37]/10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Quote
              </p>
              <p className="mt-1 text-2xl font-semibold text-neutral-950">
                {item.pricingKnown === false ? "Contact for pricing" : `$${quote.toLocaleString()}`}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                available
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {item.databaseSource ? "Availability not confirmed" : available ? "Illustrative schedule" : "Check sample time"}
            </span>
          </div>
          <p className="mt-2 text-xs text-neutral-500">{item.pricing.label}</p>
          {typeof driveMinutes === "number" ? (
            <p className="mt-2 text-xs font-semibold text-neutral-700">
              About {driveMinutes} min normal traffic from venue
            </p>
          ) : null}
        </div>

        <div className="mt-5 border-t border-neutral-100 pt-4">
          {item.sourceUrl !== "#" ? (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mb-4 inline-flex text-xs font-semibold text-[#8A6A16] transition hover:text-neutral-950"
            >
              {item.databaseSource ? "Source information" : "Explore the Demo"}
            </a>
          ) : (
            <p className="mb-4 text-xs font-semibold text-neutral-500">
              {item.sourceLabel}
            </p>
          )}
          <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-500">Listed from</p>
            <p className="text-lg font-semibold text-neutral-950">{item.price}</p>
          </div>
          {item.listingState === "unclaimed" ? <Link href={`/business/${item.vendorId}`} className="underline">Request through ARIVVIO</Link> : <button
            type="button"
            onClick={() => onAdd(item)}
          className="inline-flex h-10 items-center rounded-full bg-[#0D1321] px-5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(13,19,33,0.18)] transition hover:-translate-y-0.5 hover:bg-[#111A2E]"
          >
            {buttonLabel}
          </button>}
          </div>
        </div>
      </div>
    </article>
  );
}
