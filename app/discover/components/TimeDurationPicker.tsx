"use client";

import { useMemo, useRef, useState } from "react";
import { getEndTime, getHoursBetween } from "@/app/data/marketplace";
import { FloatingPopover } from "@/app/components/ui/FloatingPopover";
import { formatTime, getTimeOptions } from "@/lib/utils/format";

type TimeDurationPickerProps = {
  endTime: string;
  startTime: string;
  onEndTimeChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
};

const durationPresets = [
  { hours: 2, label: "2 hours" },
  { hours: 3, label: "3 hours" },
  { hours: 4, label: "4 hours" },
  { hours: 6, label: "6 hours" },
  { hours: 8, label: "All day" },
];
const timeOptions = getTimeOptions();

export function TimeDurationPicker({
  endTime,
  onEndTimeChange,
  onStartTimeChange,
  startTime,
}: TimeDurationPickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const durationHours = useMemo(
    () => getHoursBetween(startTime, endTime),
    [endTime, startTime],
  );

  function updateDuration(hours: number) {
    onEndTimeChange(getEndTime(startTime, hours));
  }

  return (
    <div className="relative">
      <p className="text-sm font-semibold text-neutral-800">Time</p>
      <button
        ref={triggerRef}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="mt-2 flex h-14 w-full items-center justify-between rounded-2xl border border-neutral-300 bg-white px-4 text-left text-sm font-semibold text-neutral-950 shadow-[0_10px_30px_rgba(13,19,33,0.04)] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-neutral-500 hover:shadow-[0_16px_40px_rgba(13,19,33,0.08)] focus:border-[#0D1321] focus:outline-none focus:ring-4 focus:ring-[#D4AF37]/25"
      >
        <span>
          {formatTime(startTime)} - {formatTime(endTime)}
        </span>
        <span className="rounded-full bg-[#F6F3EA] px-3 py-1 text-xs text-neutral-600">
          {durationHours} hr
        </span>
      </button>

      <FloatingPopover
        isOpen={isOpen}
        label="Time and duration"
        preferredHeight={360}
        triggerRef={triggerRef}
        width={560}
        onClose={() => setIsOpen(false)}
      >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Event time
              </p>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">
                {durationHours} hour plan
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[#0D1321]"
            >
              Done
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-neutral-800">
              Start time
              <select
                value={startTime}
                onChange={(event) => {
                  onStartTimeChange(event.target.value);
                  onEndTimeChange(getEndTime(event.target.value, durationHours));
                }}
                className="mt-2 h-12 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm font-semibold outline-none transition duration-200 ease-out focus:border-[#0D1321] focus:ring-4 focus:ring-[#D4AF37]/25"
              >
                {timeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-neutral-800">
              End time
              <select
                value={endTime}
                onChange={(event) => onEndTimeChange(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm font-semibold outline-none transition duration-200 ease-out focus:border-[#0D1321] focus:ring-4 focus:ring-[#D4AF37]/25"
              >
                {timeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {durationPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => updateDuration(preset.hours)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition duration-200 ease-out hover:-translate-y-0.5 ${
                  Math.round(durationHours) === preset.hours
                    ? "bg-[#0D1321] text-white"
                    : "border border-neutral-200 bg-white text-neutral-700 hover:border-[#0D1321]"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <label className="mt-5 block text-sm font-semibold text-neutral-800">
            Duration
            <input
              type="range"
              min="1"
              max="12"
              step="0.5"
              value={Math.min(Math.max(durationHours, 1), 12)}
              onChange={(event) => updateDuration(Number(event.target.value))}
              className="mt-3 w-full accent-[#D4AF37]"
            />
          </label>
      </FloatingPopover>
    </div>
  );
}
