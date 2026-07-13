"use client";

import Link from "next/link";
import { isAvailableAt, type MarketplaceItem, type ServiceName } from "@/app/data/marketplace";
import { getTimeOptions } from "@/lib/utils/format";

export type QuoteCartLine = {
  cartItemId?: string;
  id: number;
  item: MarketplaceItem;
  persisted: boolean;
  priceAdjustment: number;
  serviceEnd: string;
  serviceName: ServiceName;
  serviceStart: string;
  serviceTitle: string;
};

type QuoteCartDrawerProps = {
  canPersistCart: boolean;
  cart: QuoteCartLine[];
  cartMessage: string;
  eventSummary: string;
  getLineQuote: (line: QuoteCartLine) => number;
  isAuthLoading: boolean;
  isLoggedIn: boolean;
  isRequestingQuotes: boolean;
  variant?: "panel" | "compact" | "bar" | "workspace";
  onRemove: (lineId: number) => void;
  onRequestQuotes: () => void;
  onUpdateTime: (
    lineId: number,
    field: "serviceStart" | "serviceEnd",
    value: string,
  ) => void;
};

const timeOptions = getTimeOptions();

export function QuoteCartDrawer({
  canPersistCart,
  cart,
  cartMessage,
  eventSummary,
  getLineQuote,
  isAuthLoading,
  isLoggedIn,
  isRequestingQuotes,
  variant = "panel",
  onRemove,
  onRequestQuotes,
  onUpdateTime,
}: QuoteCartDrawerProps) {
  const total = cart.reduce((sum, line) => sum + getLineQuote(line), 0);
  const isCompact = variant === "compact";
  const isBar = variant === "bar";
  const isWorkspace = variant === "workspace";

  if (isBar) {
    return (
      <aside className="min-w-0 rounded-[24px] border border-[#D4AF37]/16 bg-white/95 p-3 shadow-[0_18px_56px_rgba(13,19,33,0.08)] backdrop-blur transition duration-200 ease-out">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Quote cart
            </p>
            <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
              <h2 className="text-xl font-semibold tracking-tight">
                {cart.length} selected
              </h2>
              <p className="text-sm font-semibold text-neutral-600">
                ${total.toLocaleString()} est.
              </p>
            </div>
            <p className="mt-1 truncate text-xs font-semibold text-neutral-500">
              {cartMessage || eventSummary}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!canPersistCart ? (
              <CartPrompt
                compact
                isAuthLoading={isAuthLoading}
                isLoggedIn={isLoggedIn}
              />
            ) : null}
            <button
              type="button"
              onClick={onRequestQuotes}
              disabled={isRequestingQuotes}
              className="h-10 rounded-full bg-[#0D1321] px-4 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(13,19,33,0.18)] transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#111A2E] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {isRequestingQuotes ? "Requesting..." : "Request quotes"}
            </button>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`min-w-0 rounded-[28px] border border-[#D4AF37]/16 bg-white/95 shadow-[0_22px_70px_rgba(13,19,33,0.08)] backdrop-blur transition duration-200 ease-out hover:shadow-[0_26px_82px_rgba(13,19,33,0.1)] ${
        isCompact
          ? "max-h-[52vh] overflow-y-auto p-4"
          : isWorkspace
            ? "max-h-[calc(100vh-6.5rem)] overflow-y-auto p-4"
            : "sticky top-24 h-fit p-5"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Quote cart
          </p>
          <h2 className={`${isCompact ? "mt-1 text-xl" : "mt-2 text-2xl"} font-semibold tracking-tight`}>
            {cart.length} selected
          </h2>
        </div>
        <span className="rounded-full bg-[#FFF8E1] px-3 py-1 text-sm font-semibold text-[#8A6A16]">
          ${total.toLocaleString()}
        </span>
      </div>

      <p className="mt-4 rounded-2xl bg-[#F6F3EA] px-4 py-3 text-sm text-neutral-600 ring-1 ring-[#D4AF37]/10">
        {eventSummary}
      </p>

      {!canPersistCart ? (
        <CartPrompt
          isAuthLoading={isAuthLoading}
          isLoggedIn={isLoggedIn}
        />
      ) : null}

      {cartMessage ? (
        <p className="mt-4 rounded-2xl bg-[#FFF8E1] px-4 py-3 text-sm font-semibold text-[#8A6A16]">
          {cartMessage}
        </p>
      ) : null}

      <div className={`${isCompact ? "mt-4 max-h-44 overflow-y-auto pr-1" : "mt-5"} space-y-3`}>
        {cart.length ? (
          (isCompact ? cart.slice(0, 3) : cart).map((line) => (
            <CartLineCard
              key={line.id}
              compact={isCompact}
              line={line}
              quote={getLineQuote(line)}
              onRemove={onRemove}
              onUpdateTime={onUpdateTime}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-300 p-4 text-sm leading-6 text-neutral-500">
            Add vendors from the rows to build a clean quote estimate.
          </div>
        )}
        {isCompact && cart.length > 3 ? (
          <p className="px-1 text-xs font-semibold text-neutral-500">
            +{cart.length - 3} more selected
          </p>
        ) : null}
      </div>

      <div className={`${isCompact ? "mt-4 pt-4" : "mt-5 pt-5"} border-t border-neutral-100`}>
        <div className="flex items-end justify-between">
          <p className="text-sm text-neutral-500">Estimated total</p>
          <p className={`${isCompact ? "text-2xl" : "text-3xl"} font-semibold`}>
            ${total.toLocaleString()}
          </p>
        </div>
        <button
          type="button"
          onClick={onRequestQuotes}
          disabled={isRequestingQuotes}
          className="mt-5 h-12 w-full rounded-full bg-[#0D1321] text-sm font-semibold text-white shadow-[0_14px_30px_rgba(13,19,33,0.18)] transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#111A2E] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {isRequestingQuotes ? "Requesting..." : "Request quotes"}
        </button>
      </div>
    </aside>
  );
}

function CartPrompt({
  compact = false,
  isAuthLoading,
  isLoggedIn,
}: {
  compact?: boolean;
  isAuthLoading: boolean;
  isLoggedIn: boolean;
}) {
  if (isAuthLoading) {
    return (
      <p
        className={
          compact
            ? "hidden rounded-full border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-600 sm:inline-flex"
            : "mt-4 rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-600"
        }
      >
        Checking account...
      </p>
    );
  }

  if (!isLoggedIn) {
    return (
      <Link
        href="/auth/login"
        className={
          compact
            ? "hidden rounded-full border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:-translate-y-0.5 hover:border-[#0D1321] sm:inline-flex"
            : "mt-4 block rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:border-[#0D1321]"
        }
      >
        {compact ? "Log in to save" : "Log in to save your quote cart."}
      </Link>
    );
  }

  return (
    <p
      className={
        compact
          ? "hidden rounded-full border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-600 sm:inline-flex"
          : "mt-4 rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-600"
      }
    >
      {compact ? "Save event to sync" : "Save this event to sync your quote cart."}
    </p>
  );
}

function CartLineCard({
  compact = false,
  line,
  onRemove,
  onUpdateTime,
  quote,
}: {
  compact?: boolean;
  line: QuoteCartLine;
  onRemove: (lineId: number) => void;
  onUpdateTime: (
    lineId: number,
    field: "serviceStart" | "serviceEnd",
    value: string,
  ) => void;
  quote: number;
}) {
  const lineAvailable = isAvailableAt(
    line.item,
    undefined,
    line.serviceStart,
    line.serviceEnd,
  );

  return (
    <div className="rounded-2xl border border-[#D4AF37]/14 bg-[#FFFCF7] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-neutral-950">{line.item.name}</p>
          <p className="mt-1 text-xs font-medium text-neutral-500">
            {line.serviceTitle} - {line.item.pricing.label}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRemove(line.id)}
          className="text-xs font-semibold text-neutral-500 transition hover:text-neutral-950"
        >
          Remove
        </button>
      </div>
      {!compact ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <CartTimeField
            label="Start"
            value={line.serviceStart}
            onChange={(value) => onUpdateTime(line.id, "serviceStart", value)}
          />
          <CartTimeField
            label="End"
            value={line.serviceEnd}
            onChange={(value) => onUpdateTime(line.id, "serviceEnd", value)}
          />
        </div>
      ) : null}
      <div className="mt-3 flex items-end justify-between">
        <p className="text-xl font-semibold">${quote.toLocaleString()}</p>
        <p
          className={`text-xs font-semibold ${
            lineAvailable ? "text-emerald-700" : "text-amber-700"
          }`}
        >
          {lineAvailable ? "Available" : "Check time"}
        </p>
      </div>
    </div>
  );
}

function CartTimeField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-9 w-full rounded-xl border border-neutral-200 bg-white px-2 text-sm text-neutral-950"
      >
        {timeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
