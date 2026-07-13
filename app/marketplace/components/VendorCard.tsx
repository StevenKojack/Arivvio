"use client";

import { memo } from "react";
import Image from "next/image";
import type { MarketplaceItem } from "@/app/data/marketplace";
import { getVendorImage } from "@/lib/marketplace/vendorImages";

type VendorCardProps = {
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
  const imageUrl = item.photoUrl ?? getVendorImage(item);
  const tags = [
    item.type,
    ...(item.tags ?? []),
    ...(item.cultures ?? []),
  ].slice(0, 3);

  return (
    <article
      onClick={() => onSelect?.(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect?.(item);
        }
      }}
      onMouseEnter={() => onHover?.(item.id)}
      onMouseLeave={() => onHover?.(null)}
      role="button"
      tabIndex={0}
      className={`w-full overflow-hidden rounded-[28px] border bg-white shadow-[0_14px_38px_rgba(13,19,33,0.055)] transition duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(13,19,33,0.11)] ${
        isSelected
          ? "border-[#D4AF37] ring-4 ring-[#D4AF37]/18"
          : isHighlighted
            ? "border-[#0D1321] ring-4 ring-[#0D1321]/10"
            : "border-[#D4AF37]/14"
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#f2f0ec]">
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
          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-neutral-900 backdrop-blur">
            {item.type}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold backdrop-blur ${
              isSelected
                ? "bg-[#D4AF37] text-[#0D1321]"
                : "bg-[#0D1321]/80 text-white"
            }`}
          >
            {matchLabel}
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
              {item.location}
            </p>
            <h3 className="mt-2 line-clamp-2 text-lg font-semibold tracking-tight text-neutral-950">
              {item.name}
            </h3>
          </div>
          <span className="shrink-0 rounded-full bg-[#F6F3EA] px-2.5 py-1 text-xs font-semibold text-[#0D1321]">
            {item.rating.toFixed(1)}
          </span>
        </div>
        <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-neutral-600">
          {matchReason}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[#F6F3EA] px-2.5 py-1 text-xs font-semibold text-neutral-600 ring-1 ring-[#D4AF37]/10"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-neutral-500">Starts around</p>
            <p className="text-lg font-semibold text-neutral-950">
              ${quote.toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            disabled={disableAdd ?? isSelected}
            onClick={(event) => {
              event.stopPropagation();
              onAdd(item);
            }}
            className={`h-10 rounded-full px-4 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-default disabled:hover:translate-y-0 ${
              isSelected
                ? "bg-[#FFF8E1] text-[#8A6A16]"
                : "bg-[#0D1321] text-white shadow-[0_12px_26px_rgba(13,19,33,0.18)] hover:bg-[#111A2E]"
            }`}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </article>
  );
}

export const VendorCard = memo(VendorCardComponent);
