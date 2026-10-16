"use client";

import { listingPresentation } from "@/lib/marketplace/listing-state";
import { memo, useState } from "react";
import { ListingImage } from "./ListingImage";
import { ProviderProfile } from "./ProviderProfile";
import Image from "next/image";
import type { MarketplaceItem } from "@/app/data/marketplace";
import { getVendorImage } from "@/lib/marketplace/vendorImages";

type VendorCardProps = {
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
  const imageUrl = item.photoUrl ?? getVendorImage(item);
  const listing = listingPresentation(item);
  const isDemoProvider = item.databaseSource === false;
  const tags = [
    item.type,
    ...(item.tags ?? []),
    ...(item.cultures ?? []),
  ].slice(0, 3);

  return (
    <><article
      onClick={() => onSelect?.(item)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect?.(item);
        }
      }}
      onMouseEnter={() => onHover?.(item.id)}
      onMouseLeave={() => onHover?.(null)}
      role="button"
      tabIndex={0}
      data-selected={isSelected}
      className={`provider-card w-full overflow-hidden rounded-xl transition ${isHighlighted ? "outline outline-1" : ""}`}

    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#f2f0ec]">
        <ListingImage
          src={imageUrl}
          alt={`${item.type} illustrative image`}
          sizes="(max-width: 768px) 74vw, 326px"
          className="object-cover transition duration-500 hover:scale-105"
        />
        {isSelected && <span className="absolute left-3 top-3 rounded-md ui-primary px-3 py-1 text-xs font-semibold">Selected</span>}

      </div>
      <div className="p-4">{matchLabel && <div className="mb-3 text-xs"><p className="font-semibold">{matchLabel}</p><p className="mt-1 leading-5 ui-muted">{matchReason}</p></div>}
        <div className="flex items-start justify-between gap-3">
          {item.profileImageUrl && <Image src={item.profileImageUrl} alt={`${item.name} logo`} width={44} height={44} unoptimized className="shrink-0 rounded-lg object-contain" />}
          <div>
            <p className="text-xs ui-muted">
              {item.type} · {item.location}
            </p>
            <h3 className="mt-2 line-clamp-2 text-lg font-semibold tracking-tight ui-text">
              {item.name}
            </h3>
          </div>

        </div>
        <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 ui-muted">
          {item.description || item.services.slice(0, 2).join(" · ") || matchReason}
        </p>
        {tags.length > 1 && <p className="mt-2 truncate text-xs ui-muted">{tags.slice(1).join(" · ")}</p>}
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs ui-muted">
              {isDemoProvider ? "Demo estimate" : "Estimated from"}
            </p>
            <p className="text-lg font-semibold ui-text">
              {preview ? item.serviceOptions?.[0]?.estimateLabel || "Request pricing" : `$${quote.toLocaleString()}`}
            </p>
          </div>
          <button
            type="button"
            disabled={!listing.canRequest || (disableAdd ?? isSelected)}
            onClick={(event) => {
              event.stopPropagation();
              if (preview) setProfileOpen(true); else onAdd(item);
            }}
            className={`h-10 rounded-lg px-4 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-default disabled:hover:translate-y-0 ${
              isSelected
                ? "ui-soft"
                : "ui-primary hover:opacity-90"
            }`}
          >
            {!listing.canRequest ? "Unclaimed listing" : buttonLabel}
          </button>
        </div>
        <button type="button" onClick={(event) => { event.stopPropagation(); setProfileOpen(true); }} className="mt-4 py-2 text-sm font-semibold underline underline-offset-4 hover:opacity-80">View profile</button>
      </div>
    </article>{profileOpen ? <ProviderProfile preview={preview} item={item} quote={quote} matchReason={item.services.slice(0, 2).join(" · ") || matchReason} selected={Boolean(disableAdd ?? isSelected)} onAdd={() => { setProfileOpen(false); if (!preview) onAdd(item); }} onClose={() => setProfileOpen(false)} /> : null}</>
  );
}

export const VendorCard = memo(VendorCardComponent);
