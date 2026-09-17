"use client";

import { memo, useState } from "react";
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
  matchLabel = "Good match",
  matchReason = "Fits your event details and timing.",
  onHover,
  onSelect,
  quote,
  onAdd,
}: VendorCardProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const imageUrl = item.photoUrl ?? getVendorImage(item);
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
      className={`provider-card w-full overflow-hidden rounded-2xl transition hover:shadow-lg ${isHighlighted ? "outline outline-1" : ""}`}

    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#f2f0ec]">
        <Image
          src={imageUrl}
          alt=""
          fill
          loading="lazy"
          sizes="(max-width: 768px) 74vw, 326px"
          unoptimized
          className="object-cover transition duration-500 hover:scale-105"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_38%,rgba(13,19,33,0.62))]" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
          <span className="rounded-full ui-surface px-3 py-1 text-xs font-semibold ui-text backdrop-blur">
            {item.type}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold backdrop-blur ${
              isSelected
                ? "ui-primary"
                : "bg-[#26334b] text-[#f1ede4]"
            }`}
          >
            {matchLabel || (item.serviceRadiusMiles ? `${item.serviceRadiusMiles} mi service area` : item.type)}
          </span>
        </div>
      </div>
      <div className="p-4">
        {isDemoProvider ? (
          <p className="mb-3 w-fit rounded-full ui-soft px-3 py-1 text-xs font-semibold text-[#8A6A16] ring-1 ring-[#D4AF37]/18">
            Demo provider
          </p>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          {item.profileImageUrl && <Image src={item.profileImageUrl} alt={`${item.name} logo`} width={44} height={44} unoptimized className="shrink-0 rounded-lg object-contain" />}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] ui-muted">
              {item.location}
            </p>
            <h3 className="mt-2 line-clamp-2 text-lg font-semibold tracking-tight ui-text">
              {item.name}
            </h3>
          </div>

        </div>
        <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 ui-muted">
          {matchReason}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full ui-soft px-2.5 py-1 text-xs font-semibold ui-muted ring-1 ring-[#D4AF37]/10"
            >
              {tag}
            </span>
          ))}
        </div>
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
            disabled={disableAdd ?? isSelected}
            onClick={(event) => {
              event.stopPropagation();
              if (preview) setProfileOpen(true); else onAdd(item);
            }}
            className={`h-10 rounded-full px-4 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-default disabled:hover:translate-y-0 ${
              isSelected
                ? "ui-soft"
                : "ui-primary shadow-[0_12px_26px_rgba(13,19,33,0.18)] hover:opacity-90"
            }`}
          >
            {buttonLabel}
          </button>
        </div>
        <button type="button" onClick={(event) => { event.stopPropagation(); setProfileOpen(true); }} className="mt-4 w-full rounded-full border ui-border px-4 py-2 text-sm font-semibold hover:opacity-80">View profile</button>
      </div>
    </article>{profileOpen ? <ProviderProfile preview={preview} item={item} quote={quote} matchReason={matchReason} selected={Boolean(disableAdd ?? isSelected)} onAdd={() => { setProfileOpen(false); if (!preview) onAdd(item); }} onClose={() => setProfileOpen(false)} /> : null}</>
  );
}

export const VendorCard = memo(VendorCardComponent);
