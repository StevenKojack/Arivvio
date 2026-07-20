"use client";

import type { PlanSelection } from "@/lib/planning-taxonomy";

export function PlanSelectionCard({
  item,
  onRemove,
}: {
  item: PlanSelection;
  onRemove: (item: PlanSelection) => void;
}) {
  return (
    <div className="group flex min-h-[76px] items-start justify-between gap-3 rounded-2xl border border-[#2E7D5B] bg-[#EFF8F3] px-4 py-3 shadow-[0_10px_24px_rgba(46,125,91,0.08)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(46,125,91,0.12)]">
      <div className="flex min-w-0 items-start gap-3">
        <span aria-hidden="true" className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2E7D5B] text-sm font-bold text-white">
          &#10003;
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-[#0D1321]">{item.label}</span>
          <span className="mt-1 block text-xs leading-5 text-neutral-600">{item.category}</span>
        </span>
      </div>
      <button
        type="button"
        onClick={() => onRemove(item)}
        aria-label={`Remove ${item.label} from your plan`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#2E7D5B]/25 bg-white text-lg leading-none text-[#285E49] outline-none transition hover:border-[#2E7D5B] hover:bg-[#E3F2E9] focus-visible:ring-2 focus-visible:ring-[#0D1321] focus-visible:ring-offset-2"
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
}
