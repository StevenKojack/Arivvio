"use client";
import Link from "next/link";
import { vendorReadiness } from "@/lib/acquisition/activation";
import type {
  VendorBusinessRow,
  VendorServiceRow,
  VendorPhotoRow,
  VendorAvailabilityRow,
} from "@/lib/repositories/vendorsRepository";
import type { VendorDashboardTab } from "./VendorDashboardTabs";
export function ActivationChecklist({
  vendors,
  services,
  photos,
  availability,
  onTab,
}: {
  vendors: VendorBusinessRow[];
  services: VendorServiceRow[];
  photos: VendorPhotoRow[];
  availability: VendorAvailabilityRow[];
  onTab: (tab: VendorDashboardTab) => void;
}) {
  return (
    <div className="my-6 space-y-4">
      {vendors.map((v) => {
        const ready = vendorReadiness(v, services);
        const steps: {
          label: string;
          done: boolean;
          tab: VendorDashboardTab;
          essential?: boolean;
        }[] = [
          {
            label: "Review business summary and operating city",
            done: ready.profile,
            tab: "Business Settings",
            essential: true,
          },
          {
            label: "Confirm at least one active service",
            done: ready.service,
            tab: "Services",
            essential: true,
          },
          {
            label: "Add packages or pricing, or quote individually",
            done: services.some(
              (s) =>
                s.vendor_id === v.id &&
                (s.base_price !== null || s.hourly_rate !== null),
            ),
            tab: "Services",
          },
          {
            label: "Add licensed business photos",
            done: photos.some((p) => p.vendor_id === v.id),
            tab: "Photos",
          },
          {
            label: "Set calendar availability",
            done: availability.some(
              (a) =>
                a.vendor_id === v.id &&
                a.date >= new Date().toISOString().slice(0, 10),
            ),
            tab: "Availability",
          },
        ];
        return (
          <section
            key={v.id}
            className="rounded-xl ui-soft p-5"
            aria-label={`${v.business_name} activation`}
          >
            <h2 className="font-semibold">
              {v.business_name}:{" "}
              {ready.ready ? "Profile ready for inquiries" : "Your next steps"}
            </h2>
            <p className="mt-2 text-sm">
              {ready.authority
                ? "Business authority verified."
                : "Business authority verification is still required for direct requests."}{" "}
              Profile readiness is separate from verification. It does not
              guarantee availability or fulfillment.
            </p>
            {!ready.authority && (
              <Link href="/vendor/verification" className="underline">
                Continue verification
              </Link>
            )}
            <ul className="my-3 space-y-2">
              {steps.map((s) => (
                <li key={s.label}>
                  <button
                    className="text-left underline"
                    onClick={() => onTab(s.tab)}
                  >
                    {s.done ? "Complete" : "Next"}: {s.label}
                    {s.essential ? "" : " (optional)"}
                  </button>
                </li>
              ))}
            </ul>
            {v.vacation_mode && (
              <button
                className="hub-button"
                onClick={() => onTab("Availability")}
              >
                Review vacation mode before receiving inquiries
              </button>
            )}
            <div className="flex flex-wrap gap-3 mt-3">
              <Link className="hub-button" href={`/business/${v.id}`}>
                Review public listing
              </Link>
              <button className="hub-button" onClick={() => onTab("Inquiries")}>
                Open inquiries
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
