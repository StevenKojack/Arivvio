"use client";

import Link from "next/link";
import { marketplaceItems, quoteItem } from "../data/marketplace";
import { MarketplaceCard } from "./MarketplaceCard";

export function MarketplacePreview() {
  return (
    <section className="relative overflow-hidden bg-[#0D1321] px-6 py-24 text-white sm:px-8 lg:px-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(212,175,55,0.2),transparent_30%),radial-gradient(circle_at_88%_22%,rgba(255,255,255,0.08),transparent_24%),linear-gradient(135deg,#0D1321,#132038)]" />
      <div className="mx-auto max-w-7xl">
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
              Vendor categories
            </p>
            <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Venues, food, entertainment, rentals, production, and support in one flow.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-neutral-300">
              Marketplace browsing should feel like discovering the right team,
              not sorting through a spreadsheet.
            </p>
          </div>
          <Link
            href="/marketplace"
            className="inline-flex h-12 w-fit items-center rounded-full bg-white px-5 text-sm font-semibold text-[#0D1321] shadow-[0_18px_44px_rgba(13,19,33,0.24)] transition hover:-translate-y-0.5 hover:bg-[#FFF8E1]"
          >
            Browse marketplace
          </Link>
        </div>
        <div className="relative mt-10 grid gap-5 md:grid-cols-3">
          {marketplaceItems.slice(0, 3).map((item) => (
            <MarketplaceCard
              key={item.id}
              available
              buttonLabel="Preview quote"
              item={item}
              quote={quoteItem(item, {
                durationHours: 3,
                guests: 40,
                startTime: "14:00",
              })}
              onAdd={() => undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
