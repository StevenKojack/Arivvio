"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { allServices, eventTypes } from "@/app/data/marketplace";
import type { BookingRow } from "@/lib/repositories/bookingsRepository";
import type { QuoteRequestRow } from "@/lib/repositories/quotesRepository";
import type {
  VendorAvailabilityRow,
  VendorBusinessRow,
  VendorPhotoRow,
  VendorServiceRow,
} from "@/lib/repositories/vendorsRepository";
import type { PublicTableRow } from "@/lib/supabase/database.types";
import type { PricingType, QuoteStatus } from "@/lib/types/domain";
import { formatDate, formatMoney, formatTime } from "@/lib/utils/format";

export type QuoteWithEvent = QuoteRequestRow & {
  event?: PublicTableRow<"events">;
};

export type VendorDashboardTab =
  | "Dashboard"
  | "Services"
  | "Availability"
  | "Photos"
  | "Quotes"
  | "Bookings"
  | "Profile"
  | "Business Settings"
  | "Analytics";

export const vendorDashboardTabs: VendorDashboardTab[] = [
  "Dashboard",
  "Services",
  "Availability",
  "Photos",
  "Quotes",
  "Bookings",
  "Profile",
  "Business Settings",
  "Analytics",
];

export type ServiceDraft = {
  active: boolean;
  basePrice: number;
  category: string;
  description: string;
  eventTypesSupported: string[];
  hourlyRate: number;
  minimumHours: number;
  pricingType: PricingType;
  serviceName: string;
  setupFee: number;
  travelFee: number;
};

export type AvailabilityDraft = {
  date: string;
  endTime: string;
  startTime: string;
  status: "available" | "blocked" | "tentative";
  vendorId: string;
};

export type BusinessDraft = {
  businessName: string;
  category: string;
  city: string;
  description: string;
  phone: string;
  radius: number;
  websiteUrl: string;
};

type VendorTabProps = {
  availability: VendorAvailabilityRow[];
  bookings: BookingRow[];
  message?: string;
  onCreateAvailability: (draft: AvailabilityDraft) => Promise<void>;
  onCreateService: (draft: ServiceDraft) => Promise<void>;
  onDeleteAvailability: (availabilityId: string) => Promise<void>;
  onDeletePhoto: (photo: VendorPhotoRow) => Promise<void>;
  onDeleteService: (service: VendorServiceRow) => Promise<void>;
  onRespondQuote: (
    quoteId: string,
    status: Extract<QuoteStatus, "accepted" | "declined" | "countered">,
    vendorFinalPrice?: number | null,
  ) => Promise<void>;
  onToggleService: (service: VendorServiceRow) => Promise<void>;
  onToggleVacationMode: (vendor: VendorBusinessRow) => Promise<void>;
  onUpdateBusiness: (vendorId: string, draft: BusinessDraft) => Promise<void>;
  onUpdateService: (serviceId: string, draft: ServiceDraft) => Promise<void>;
  onUploadPhoto: (vendorId: string, file: File) => Promise<void>;
  photos: VendorPhotoRow[];
  quotes: QuoteWithEvent[];
  services: VendorServiceRow[];
  vendors: VendorBusinessRow[];
};

export function DashboardTab({
  bookings,
  quotes,
  services,
  vendors,
}: Pick<VendorTabProps, "bookings" | "quotes" | "services" | "vendors">) {
  const today = new Date().toISOString().slice(0, 10);
  const todaysQuotes = quotes.filter((quote) => quote.event?.date === today);
  const pendingQuotes = quotes.filter((quote) => quote.status === "pending");
  const upcomingBookings = bookings.filter(
    (booking) => booking.booking_status !== "cancelled",
  );
  const recentActivity = [...quotes.slice(0, 3), ...bookings.slice(0, 2)];

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Businesses" value={String(vendors.length)} />
        <Metric label="Active services" value={String(services.filter((service) => service.active).length)} />
        <Metric label="Today's quote requests" value={String(todaysQuotes.length)} />
        <Metric label="Pending responses" value={String(pendingQuotes.length)} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Upcoming bookings">
          {upcomingBookings.length ? (
            upcomingBookings.slice(0, 5).map((booking) => (
              <Row
                key={booking.id}
                title={formatMoney(booking.final_price)}
                detail={`${booking.booking_status} - ${booking.payment_status}`}
              />
            ))
          ) : (
            <EmptyLine text="No confirmed bookings yet." />
          )}
        </Panel>
        <Panel title="Recent activity">
          {recentActivity.length ? (
            recentActivity.map((item) => (
              <Row
                key={item.id}
                title={"status" in item ? item.status : item.booking_status}
                detail={"created_at" in item ? formatDate(item.created_at.slice(0, 10)) : ""}
              />
            ))
          ) : (
            <EmptyLine text="Activity appears here as planners request quotes and confirm bookings." />
          )}
        </Panel>
      </div>
    </div>
  );
}

export function ServicesTab({
  onCreateService,
  onDeleteService,
  onToggleService,
  onUpdateService,
  services,
  vendors,
}: Pick<
  VendorTabProps,
  | "onCreateService"
  | "onDeleteService"
  | "onToggleService"
  | "onUpdateService"
  | "services"
  | "vendors"
>) {
  const [draft, setDraft] = useState<ServiceDraft>({
    active: true,
    basePrice: 300,
    category: "DJ",
    description: "",
    eventTypesSupported: ["Birthday", "Wedding", "Private Party"],
    hourlyRate: 100,
    minimumHours: 3,
    pricingType: "hourly",
    serviceName: "DJ package",
    setupFee: 0,
    travelFee: 0,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  function loadService(service: VendorServiceRow) {
    setEditingId(service.id);
    setDraft({
      active: service.active,
      basePrice: Number(service.base_price ?? 0),
      category: service.category,
      description: service.description ?? "",
      eventTypesSupported: service.event_types_supported,
      hourlyRate: Number(service.hourly_rate ?? 0),
      minimumHours: Number(service.minimum_hours ?? 1),
      pricingType: service.pricing_type,
      serviceName: service.service_name,
      setupFee: Number(service.setup_fee ?? 0),
      travelFee: Number(service.travel_fee ?? 0),
    });
  }

  function toggleEventType(eventType: string) {
    setDraft((current) => ({
      ...current,
      eventTypesSupported: current.eventTypesSupported.includes(eventType)
        ? current.eventTypesSupported.filter((item) => item !== eventType)
        : [...current.eventTypesSupported, eventType],
    }));
  }

  async function saveService() {
    if (editingId) {
      await onUpdateService(editingId, draft);
      setEditingId(null);
      return;
    }

    await onCreateService(draft);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <Panel title={editingId ? "Edit service" : "Create service"}>
        <div className="grid gap-3">
          <Input label="Service name" value={draft.serviceName} onChange={(value) => setDraft({ ...draft, serviceName: value })} />
          <label className="grid gap-2 text-sm font-semibold text-neutral-800">
            Category
            <select
              value={draft.category}
              onChange={(event) => setDraft({ ...draft, category: event.target.value })}
              className="h-11 rounded-lg border border-neutral-300 bg-white px-3"
            >
              {allServices.map((service) => (
                <option key={service}>{service}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-neutral-800">
            Description
            <textarea
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              className="min-h-24 rounded-lg border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-neutral-800">
            Pricing
            <select
              value={draft.pricingType}
              onChange={(event) =>
                setDraft({ ...draft, pricingType: event.target.value as PricingType })
              }
              className="h-11 rounded-lg border border-neutral-300 bg-white px-3"
            >
              <option value="hourly">Hourly</option>
              <option value="flat">Flat</option>
              <option value="per_guest">Per guest</option>
            </select>
          </label>
          <Input
            label={draft.pricingType === "hourly" ? "Hourly rate" : "Base price"}
            type="number"
            value={String(draft.pricingType === "hourly" ? draft.hourlyRate : draft.basePrice)}
            onChange={(value) =>
              setDraft({
                ...draft,
                ...(draft.pricingType === "hourly"
                  ? { hourlyRate: Number(value) }
                  : { basePrice: Number(value) }),
              })
            }
          />
          {draft.pricingType === "hourly" ? (
            <Input
              label="Minimum hours"
              type="number"
              value={String(draft.minimumHours)}
              onChange={(value) => setDraft({ ...draft, minimumHours: Number(value) })}
            />
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Setup fee"
              type="number"
              value={String(draft.setupFee)}
              onChange={(value) => setDraft({ ...draft, setupFee: Number(value) })}
            />
            <Input
              label="Travel fee"
              type="number"
              value={String(draft.travelFee)}
              onChange={(value) => setDraft({ ...draft, travelFee: Number(value) })}
            />
          </div>
          <label className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 text-sm font-semibold text-neutral-800">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
              className="h-4 w-4 accent-[#0D1321]"
            />
            Active in marketplace
          </label>
          <fieldset className="rounded-lg border border-neutral-200 p-3">
            <legend className="px-1 text-sm font-semibold text-neutral-800">
              Event types supported
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {eventTypes.map((eventType) => (
                <button
                  key={eventType}
                  type="button"
                  onClick={() => toggleEventType(eventType)}
                  className={`rounded-full px-3 py-2 text-xs font-semibold ${
                    draft.eventTypesSupported.includes(eventType)
                      ? "bg-[#0D1321] text-white"
                      : "border border-neutral-300 text-neutral-700"
                  }`}
                >
                  {eventType}
                </button>
              ))}
            </div>
          </fieldset>
          <button
            type="button"
            onClick={saveService}
            disabled={!vendors.length}
            className="h-11 rounded-full bg-[#0D1321] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {editingId ? "Save service" : "Create service"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="h-11 rounded-full border border-neutral-300 px-4 text-sm font-semibold text-neutral-950"
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </Panel>
      <Panel title="Services">
        {services.length ? (
          services.map((service) => (
            <div key={service.id} className="rounded-lg border border-neutral-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-neutral-950">{service.service_name}</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {service.category} - {service.pricing_type}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleService(service)}
                  className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold"
                >
                  {service.active ? "Disable" : "Enable"}
                </button>
              </div>
              <p className="mt-3 text-sm text-neutral-600">
                {service.description || "No description added."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => loadService(service)}
                  className="rounded-full bg-[#0D1321] px-3 py-1 text-xs font-semibold text-white"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteService(service)}
                  className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <EmptyLine text="Create your first service to appear in the marketplace." />
        )}
      </Panel>
    </div>
  );
}

export function AvailabilityTab({
  availability,
  onDeleteAvailability,
  onCreateAvailability,
  onToggleVacationMode,
  vendors,
}: Pick<
  VendorTabProps,
  | "availability"
  | "onCreateAvailability"
  | "onDeleteAvailability"
  | "onToggleVacationMode"
  | "vendors"
>) {
  const [draft, setDraft] = useState<AvailabilityDraft>({
    date: "",
    endTime: "17:00",
    startTime: "09:00",
    status: "available",
    vendorId: vendors[0]?.id ?? "",
  });
  const weeklyDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <Panel title="Business hours">
        <div className="grid gap-3">
          <div className="grid gap-2">
            {vendors.map((vendor) => (
              <div
                key={vendor.id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-neutral-950">
                    {vendor.business_name}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {vendor.vacation_mode
                      ? "Vacation mode hides this business from marketplace"
                      : "Accepting marketplace inquiries"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleVacationMode(vendor)}
                  className={`rounded-full px-3 py-2 text-xs font-semibold ${
                    vendor.vacation_mode
                      ? "bg-[#0D1321] text-white"
                      : "border border-neutral-300 text-neutral-950"
                  }`}
                >
                  {vendor.vacation_mode ? "Vacation on" : "Vacation off"}
                </button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weeklyDays.map((day) => (
              <span
                key={day}
                className="rounded-lg border border-neutral-200 bg-[#F6F3EA] px-2 py-3 text-center text-xs font-semibold"
              >
                {day}
              </span>
            ))}
          </div>
          <Input label="Default start" type="time" value={draft.startTime} onChange={(value) => setDraft({ ...draft, startTime: value })} />
          <Input label="Default end" type="time" value={draft.endTime} onChange={(value) => setDraft({ ...draft, endTime: value })} />
          <div className="rounded-lg border border-dashed border-neutral-300 p-4 text-sm text-neutral-600">
            Use available windows for specific bookable dates and blackout dates for unavailable dates. Vacation mode hides the entire business from the marketplace.
          </div>
        </div>
      </Panel>
      <Panel title="Manual availability">
        <div className="grid gap-3">
          <label className="grid gap-2 text-sm font-semibold text-neutral-800">
            Vendor
            <select
              value={draft.vendorId}
              onChange={(event) => setDraft({ ...draft, vendorId: event.target.value })}
              className="h-11 rounded-lg border border-neutral-300 bg-white px-3"
            >
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.business_name}
                </option>
              ))}
            </select>
          </label>
          <Input label="Date" type="date" value={draft.date} onChange={(value) => setDraft({ ...draft, date: value })} />
          <label className="grid gap-2 text-sm font-semibold text-neutral-800">
            Status
            <select
              value={draft.status}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  status: event.target.value as AvailabilityDraft["status"],
                })
              }
              className="h-11 rounded-lg border border-neutral-300 bg-white px-3"
            >
              <option value="available">Available</option>
              <option value="blocked">Blackout date</option>
              <option value="tentative">Tentative</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => onCreateAvailability(draft)}
            disabled={!draft.date || !draft.vendorId}
            className="h-11 rounded-full bg-[#0D1321] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save availability
          </button>
        </div>
        <div className="mt-5 space-y-2">
          {availability.length ? (
            availability.map((window) => (
              <div key={window.id} className="rounded-lg border border-neutral-200 p-4">
                <p className="font-semibold text-neutral-950">
                  {formatDate(window.date)} - {window.status}
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  {formatTime(window.start_time)} to {formatTime(window.end_time)}
                </p>
                <button
                  type="button"
                  onClick={() => onDeleteAvailability(window.id)}
                  className="mt-3 rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700"
                >
                  Delete
                </button>
              </div>
            ))
          ) : (
            <EmptyLine text="No availability rows saved yet." />
          )}
        </div>
      </Panel>
    </div>
  );
}

export function PhotosTab({
  onDeletePhoto,
  onUploadPhoto,
  photos,
  vendors,
}: Pick<
  VendorTabProps,
  "onDeletePhoto" | "onUploadPhoto" | "photos" | "vendors"
>) {
  const [vendorId, setVendorId] = useState(vendors[0]?.id ?? "");
  const [fileName, setFileName] = useState("");
  const selectedVendor = vendors.find((vendor) => vendor.id === vendorId);

  async function uploadFile(file: File | undefined) {
    if (!file || !vendorId) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFileName("Photo uploads must be 5MB or smaller.");
      return;
    }

    setFileName(file.name);
    await onUploadPhoto(vendorId, file);
  }

  return (
    <Panel title="Photos">
      <div className="grid gap-3 rounded-lg border border-dashed border-neutral-300 p-5 text-sm text-neutral-600">
        <p>
          Upload JPEG, PNG, or WebP images up to 5MB. Photos are saved in
          Supabase Storage and written to vendor_photos.
        </p>
        <label className="grid gap-2 text-sm font-semibold text-neutral-800">
          Vendor
          <select
            value={vendorId}
            onChange={(event) => setVendorId(event.target.value)}
            className="h-11 rounded-lg border border-neutral-300 bg-white px-3"
          >
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.business_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex h-12 cursor-pointer items-center justify-center rounded-full bg-[#0D1321] px-4 text-sm font-semibold text-white">
          Upload photo
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              void uploadFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        {fileName ? (
          <p className="text-xs font-semibold text-neutral-500">
            Last selected: {fileName}
          </p>
        ) : null}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {selectedVendor ? (
          photos
            .filter((photo) => photo.vendor_id === selectedVendor.id)
            .map((photo) => (
              <div key={photo.id} className="overflow-hidden rounded-lg border border-neutral-200">
                <div
                  className="h-40 bg-cover bg-center"
                  style={{ backgroundImage: `url(${photo.image_url})` }}
                />
                <button
                  type="button"
                  onClick={() => onDeletePhoto(photo)}
                  className="w-full border-t border-neutral-200 px-3 py-2 text-xs font-semibold text-red-700"
                >
                  Delete photo
                </button>
              </div>
            ))
        ) : (
          <EmptyLine text="Create a vendor profile before uploading photos." />
        )}
        {selectedVendor &&
        photos.filter((photo) => photo.vendor_id === selectedVendor.id).length === 0 ? (
          <EmptyLine text="No photos for this vendor yet." />
        ) : null}
      </div>
    </Panel>
  );
}

export function QuotesTab({
  onRespondQuote,
  quotes,
}: Pick<VendorTabProps, "onRespondQuote" | "quotes">) {
  const [counterPrices, setCounterPrices] = useState<Record<string, string>>({});

  return (
    <Panel title="Quote requests">
      {quotes.length ? (
        quotes.map((quote) => (
          <div key={quote.id} className="rounded-lg border border-neutral-200 p-4">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="font-semibold text-neutral-950">
                  {quote.event?.title ?? "Planner event"}
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  {quote.event?.event_type ?? "Event"} -{" "}
                  {formatDate(quote.event?.date)} -{" "}
                  {quote.guest_count ?? quote.event?.guest_count ?? 0} guests
                </p>
                <p className="mt-2 text-sm text-neutral-600">
                  Requested: {formatTime(quote.requested_start_time)} to{" "}
                  {formatTime(quote.requested_end_time)}
                </p>
              </div>
              <span className="w-fit rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
                {quote.status}
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
              <div className="min-w-32">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                  Estimate
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {formatMoney(quote.vendor_final_price ?? quote.estimated_price)}
                </p>
              </div>
              <Input
                label="Counter price"
                type="number"
                value={counterPrices[quote.id] ?? ""}
                onChange={(value) =>
                  setCounterPrices((current) => ({
                    ...current,
                    [quote.id]: value,
                  }))
                }
              />
              <div className="flex flex-wrap gap-2">
                <QuoteButton label="Accept" onClick={() => onRespondQuote(quote.id, "accepted", null)} />
                <QuoteButton
                  label="Counter"
                  primary
                  onClick={() =>
                    onRespondQuote(
                      quote.id,
                      "countered",
                      Number(counterPrices[quote.id] ?? 0),
                    )
                  }
                />
                <QuoteButton label="Decline" onClick={() => onRespondQuote(quote.id, "declined", null)} />
              </div>
            </div>
          </div>
        ))
      ) : (
        <EmptyLine text="No incoming quote requests yet." />
      )}
    </Panel>
  );
}

export function BookingsTab({ bookings }: Pick<VendorTabProps, "bookings">) {
  return (
    <Panel title="Confirmed bookings">
      {bookings.length ? (
        bookings.map((booking) => (
          <Link
            key={booking.id}
            href={`/bookings/${booking.id}`}
            className="block rounded-lg border border-neutral-200 p-4 transition hover:border-[#0D1321]"
          >
            <p className="font-semibold text-neutral-950">
              {formatMoney(booking.final_price)}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {booking.booking_status} - deposit{" "}
              {formatMoney(booking.deposit_amount)} - balance{" "}
              {formatMoney(booking.balance_due)}
            </p>
          </Link>
        ))
      ) : (
        <EmptyLine text="No bookings yet. Accepted quotes become bookings when planners confirm." />
      )}
    </Panel>
  );
}

export function ProfileTab({ vendors }: Pick<VendorTabProps, "vendors">) {
  return (
    <Panel title="Public profile">
      {vendors.length ? (
        vendors.map((vendor) => (
          <Row
            key={vendor.id}
            title={vendor.business_name}
            detail={`${vendor.category} - ${vendor.service_area_city ?? "No city"} - ${vendor.service_radius_miles} mile radius`}
          />
        ))
      ) : (
        <EmptyLine text="Create a vendor profile to publish your business." />
      )}
    </Panel>
  );
}

export function BusinessSettingsTab({
  onUpdateBusiness,
  vendors,
}: Pick<VendorTabProps, "onUpdateBusiness" | "vendors">) {
  const vendor = vendors[0];
  const [draft, setDraft] = useState<BusinessDraft>({
    businessName: vendor?.business_name ?? "",
    category: vendor?.category ?? "DJ",
    city: vendor?.service_area_city ?? "Los Angeles",
    description: vendor?.description ?? "",
    phone: vendor?.phone ?? "",
    radius: vendor?.service_radius_miles ?? 30,
    websiteUrl: vendor?.website_url ?? "",
  });

  if (!vendor) {
    return (
      <Panel title="Business settings">
        <EmptyLine text="Create a vendor profile before editing business settings." />
      </Panel>
    );
  }

  return (
    <Panel title="Business settings">
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="Business name" value={draft.businessName} onChange={(value) => setDraft({ ...draft, businessName: value })} />
        <label className="grid gap-2 text-sm font-semibold text-neutral-800">
          Category
          <select
            value={draft.category}
            onChange={(event) => setDraft({ ...draft, category: event.target.value })}
            className="h-11 rounded-lg border border-neutral-300 bg-white px-3"
          >
            {allServices.map((service) => (
              <option key={service}>{service}</option>
            ))}
          </select>
        </label>
        <Input label="Service city" value={draft.city} onChange={(value) => setDraft({ ...draft, city: value })} />
        <Input label="Radius miles" type="number" value={String(draft.radius)} onChange={(value) => setDraft({ ...draft, radius: Number(value) })} />
        <Input label="Website" value={draft.websiteUrl} onChange={(value) => setDraft({ ...draft, websiteUrl: value })} />
        <Input label="Phone" value={draft.phone} onChange={(value) => setDraft({ ...draft, phone: value })} />
      </div>
      <label className="mt-3 grid gap-2 text-sm font-semibold text-neutral-800">
        Description
        <textarea
          value={draft.description}
          onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          className="min-h-28 rounded-lg border border-neutral-300 px-3 py-2"
        />
      </label>
      <button
        type="button"
        onClick={() => onUpdateBusiness(vendor.id, draft)}
        className="mt-4 h-11 rounded-full bg-[#0D1321] px-4 text-sm font-semibold text-white"
      >
        Save business
      </button>
    </Panel>
  );
}

export function AnalyticsTab({
  bookings,
  quotes,
  services,
}: Pick<VendorTabProps, "bookings" | "quotes" | "services">) {
  const revenue = bookings.reduce((total, booking) => total + Number(booking.final_price ?? 0), 0);
  const responseRate = quotes.length
    ? Math.round(
        (quotes.filter((quote) => quote.status !== "pending").length / quotes.length) * 100,
      )
    : 0;
  const categoryMix = useMemo(
    () =>
      services.reduce<Record<string, number>>((mix, service) => {
        mix[service.category] = (mix[service.category] ?? 0) + 1;
        return mix;
      }, {}),
    [services],
  );

  return (
    <div className="grid gap-5 md:grid-cols-3">
      <Metric label="Quoted requests" value={String(quotes.length)} />
      <Metric label="Response rate" value={`${responseRate}%`} />
      <Metric label="Booked revenue" value={formatMoney(revenue)} />
      <Panel title="Category mix">
        {Object.entries(categoryMix).length ? (
          Object.entries(categoryMix).map(([category, count]) => (
            <Row key={category} title={category} detail={`${count} service${count === 1 ? "" : "s"}`} />
          ))
        ) : (
          <EmptyLine text="Create services to see category mix." />
        )}
      </Panel>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

function Panel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6 shadow-[0_18px_44px_rgba(13,19,33,0.05)]">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-5 space-y-3">{children}</div>
    </section>
  );
}

function Row({ detail, title }: { detail: string; title: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <p className="font-semibold text-neutral-950">{title}</p>
      <p className="mt-1 text-sm text-neutral-500">{detail}</p>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-neutral-300 p-5 text-sm text-neutral-600">
      {text}
    </p>
  );
}

function Input({
  label,
  onChange,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-neutral-800">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg border border-neutral-300 px-3 outline-none focus:border-[#0D1321]"
      />
    </label>
  );
}

function QuoteButton({
  label,
  onClick,
  primary,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 rounded-full px-4 text-sm font-semibold ${
        primary
          ? "bg-[#0D1321] text-white"
          : "border border-neutral-300 text-neutral-950"
      }`}
    >
      {label}
    </button>
  );
}
