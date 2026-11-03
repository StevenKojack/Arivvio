"use client";

import {BusinessStatusBadge} from "@/app/components/BusinessStatusBadge";
import {getVendorMedia} from "@/lib/marketplace/vendorImages";
import { PricingDisclosure } from "./PricingDisclosure";
import Link from "next/link";
import { listingPresentation } from "@/lib/marketplace/listing-state";
import { memo, useState } from "react";
import { ListingImage } from "./ListingImage";
import { ProviderProfile } from "./ProviderProfile";
import Image from "next/image";
import type { MarketplaceItem } from "@/app/data/marketplace";


type VendorCardProps = {
  eventId?: string;
  preview?: boolean;
  buttonLabel?: string;
  disableAdd?: boolean;
  isHighlighted?: boolean;
  isSelected?: boolean;
  item: MarketplaceItem;
  matchLabel?: string;
  matchReason?: string;
  quote: number;
  onAdd: (item: MarketplaceItem) => void;
  onHover?: (itemId: number | null) => void;
  onSelect?: (item: MarketplaceItem) => void;
};

function VendorCardComponent({
  eventId,
  preview = false,
  buttonLabel = "Add to quote",
  disableAdd,
  isHighlighted = false,
  isSelected = false,
  item,
  matchLabel,
  matchReason = "Fits your event details and timing.",
  onHover,
  onSelect,
  quote,
  onAdd,
}: VendorCardProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const media = getVendorMedia(item);
  const imageUrl = media.src;
  const listing = listingPresentation(item);
  const isDemoProvider = item.databaseSource === false;
  const tags = [
    item.type,
    ...(item.tags ?? []),
    ...(item.cultures ?? []),
  ].slice(0, 3);

  return (
    <><article
      onMouseEnter={() => onHover?.(item.id)}
      onMouseLeave={() => onHover?.(null)}
      data-selected={isSelected}
      className={`provider-card w-full overflow-hidden rounded-xl transition ${isHighlighted ? "outline outline-1" : ""}`}

    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#f2f0ec]">
        <ListingImage
          src={imageUrl}
          alt={media.alt}
          sizes="(max-width: 768px) 74vw, 326px"
          className="object-cover transition duration-500 hover:scale-105"
        />
        {media.illustrative&&<span className="absolute bottom-2 right-2 rounded ui-surface px-2 py-1 text-[10px]">{media.label}</span>}
        {isSelected && <span className="absolute left-3 top-3 rounded-md ui-primary px-3 py-1 text-xs font-semibold">Selected</span>}

      </div>
      <div className="p-4"><div className="mb-3"><BusinessStatusBadge item={item}/></div>
        <div className="flex items-start justify-between gap-3">
          {item.databaseSource === false && item.profileImageUrl && <Image src={item.profileImageUrl} alt={`${item.name} logo`} width={44} height={44} unoptimized className="shrink-0 rounded-lg object-contain" />}
          <div>

            <h3 className="mt-2 text-lg font-semibold tracking-tight ui-text">
              <button className="provider-profile-trigger text-left" onClick={()=>setProfileOpen(true)} aria-label={`View ${item.name} profile`}>{item.name}</button>
            </h3><p className="mt-1 text-xs ui-muted">{item.type} · {item.location}</p>
          </div>

        </div>
        <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 ui-muted">
          {item.description || item.services.slice(0, 2).join(" · ") || matchReason}
        </p>
        {tags.length > 1 && <p className="mt-2 truncate text-xs ui-muted">{tags.slice(1).join(" · ")}</p>}
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs ui-muted">
              {item.pricingKnown === false ? "Pricing" : isDemoProvider ? "Demo estimate" : "Estimated from"}
            </p>
            <p className="text-lg font-semibold ui-text">
              {item.pricingKnown === false ? "Contact for pricing" : preview ? item.serviceOptions?.[0]?.estimateLabel || "Request pricing" : `$${quote.toLocaleString()}`}
            </p>
          </div>
          {item.listingState === "unclaimed" ? <Link href={`/business/${item.vendorId}?serviceId=${item.serviceId??""}${eventId ? `&eventId=${encodeURIComponent(eventId)}` : ""}`} onClick={e=>e.stopPropagation()} className="provider-action rounded-lg ui-primary px-3 py-2 text-sm">Request through ARIVVIO</Link> : <button
            type="button"
            disabled={!listing.canRequest || (disableAdd ?? isSelected)}
            onClick={(event) => {
              event.stopPropagation();
              if (preview) setProfileOpen(true); else onAdd(item);
            }}
            className={`provider-action h-10 rounded-lg px-4 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-default disabled:hover:translate-y-0 ${
              isSelected
                ? "ui-soft"
                : "ui-primary hover:opacity-90"
            }`}
          >
            {!listing.canRequest ? "Verification review required" : buttonLabel}
          </button>}
        </div>
        {onSelect && <button type="button" onClick={()=>onSelect(item)} className="provider-action hub-button mt-3">Select {item.name}</button>}
        {matchLabel && <p className="mt-3 text-xs ui-muted">{matchLabel}</p>}
        <PricingDisclosure item={item}/>

      </div>
    </article>{profileOpen ? <ProviderProfile eventId={eventId} preview={preview} item={item} quote={quote} matchReason={preview ? matchReason : item.services.slice(0, 2).join(" · ") || matchReason} selected={Boolean(disableAdd ?? isSelected)} onAdd={() => { setProfileOpen(false); if (!preview) onAdd(item); }} onClose={() => setProfileOpen(false)} /> : null}</>
  );
}

export const VendorCard = memo(VendorCardComponent);
