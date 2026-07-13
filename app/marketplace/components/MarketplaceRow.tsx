"use client";

import { memo } from "react";
import { quoteItem, type MarketplaceItem, type QuoteContext } from "@/app/data/marketplace";
import { VendorCard } from "./VendorCard";

type MarketplaceRowProps = {
  activeItemId?: number | null;
  cartedIds?: number[];
  description?: string;
  items: MarketplaceItem[];
  quoteContext: QuoteContext;
  rowId: string;
  selectedServiceCountByVendor?: Map<number, number>;
  title: string;
  onAdd: (item: MarketplaceItem) => void;
  onHoverItem?: (itemId: number | null) => void;
  onSelectItem?: (item: MarketplaceItem) => void;
};

export function MarketplaceRow({
  activeItemId,
  cartedIds = [],
  description,
  items,
  onAdd,
  onHoverItem,
  onSelectItem,
  quoteContext,
  rowId,
  selectedServiceCountByVendor,
  title,
}: MarketplaceRowProps) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-[30px] border border-[#D4AF37]/14 bg-white/96 p-5 shadow-[0_18px_56px_rgba(13,19,33,0.055)] transition duration-300 ease-out">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-neutral-600">{description}</p>
          ) : null}
        </div>
        <span className="rounded-full bg-[#FFF8E1] px-3 py-1 text-xs font-semibold text-[#8A6A16]">
          {items.length}
        </span>
      </div>
      <div className="mt-4 flex min-w-0 snap-x gap-4 overflow-x-auto overscroll-x-contain scroll-smooth pb-3 [scrollbar-width:thin]">
        {items.map((item, index) => {
          const selectedServiceCount = selectedServiceCountByVendor?.get(item.id) ?? 0;
          const canAddMoreServices =
            (item.serviceOptions?.length ?? item.services.length) > selectedServiceCount;

          return (
          <div
            key={`${title}-${item.id}`}
            id={`vendor-card-${rowId}-${item.id}`}
            data-row-id={rowId}
            data-vendor-id={item.id}
            className="w-[min(74vw,310px)] shrink-0 snap-start 2xl:w-[326px]"
          >
            <VendorCard
              buttonLabel={
                selectedServiceCount > 1
                  ? `${selectedServiceCount} selected`
                  : selectedServiceCount === 1
                    ? "Selected"
                    : "Add to quote"
              }
              isHighlighted={activeItemId === item.id}
              isSelected={cartedIds.includes(item.id)}
              disableAdd={selectedServiceCount > 0 && !canAddMoreServices}
              item={item}
              matchLabel={cartedIds.includes(item.id) ? "Selected" : index < 3 ? "Top match" : "Match"}
              matchReason={getMatchReason(title, item)}
              quote={quoteItem(item, quoteContext)}
              onAdd={onAdd}
              onHover={onHoverItem}
              onSelect={onSelectItem}
            />
          </div>
          );
        })}
      </div>
    </section>
  );
}

export const MemoizedMarketplaceRow = memo(MarketplaceRow);

function getMatchReason(title: string, item: MarketplaceItem) {
  if (title === "Best matches") {
    return `Strong fit for ${item.events.slice(0, 2).join(" and ")} with ${item.services
      .slice(0, 2)
      .join(" and ")} available.`;
  }

  if (item.serviceRadiusMiles) {
    return `Serves this area within about ${item.serviceRadiusMiles} miles.`;
  }

  return `Fits the ${title.toLowerCase()} part of this event plan.`;
}
