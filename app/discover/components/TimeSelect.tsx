"use client";
import { formatTime, getTimeOptions } from "@/lib/utils/format";
export function TimeSelect({ label, value, onChange, emptyLabel = "Time to confirm" }: { label: string; value: string; onChange: (value: string) => void; emptyLabel?: string }) {
  const options = getTimeOptions();
  if (value && !options.some(option => option.value === value)) options.push({ value, label: formatTime(value) });
  options.sort((a, b) => a.value.localeCompare(b.value));
  return <label className="block text-sm font-semibold ui-text">{label}<select className="hub-input mt-2 h-12 w-full" value={value} onChange={event => onChange(event.target.value)}><option value="">{emptyLabel}</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
