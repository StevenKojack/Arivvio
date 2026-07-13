"use client";

import type { ServiceName } from "@/app/data/marketplace";

type ServiceRecommendationCardProps = {
  isSelected: boolean;
  onToggle: (service: ServiceName) => void;
  service: ServiceName;
};

export function ServiceRecommendationCard({
  isSelected,
  onToggle,
  service,
}: ServiceRecommendationCardProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(service)}
      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
        isSelected
          ? "border-[#0D1321] bg-white text-neutral-950 shadow-[0_12px_30px_rgba(13,19,33,0.06)]"
          : "border-neutral-200 bg-[#FFFCF7] text-neutral-500 hover:border-neutral-400"
      }`}
    >
      <span className="text-sm font-semibold">{service}</span>
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
          isSelected ? "bg-[#0D1321] text-white" : "bg-white text-neutral-400"
        }`}
      >
        {isSelected ? "-" : "+"}
      </span>
    </button>
  );
}
