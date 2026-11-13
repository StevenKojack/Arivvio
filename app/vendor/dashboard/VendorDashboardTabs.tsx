"use client";
import {ProviderProfile} from "@/app/marketplace/components/ProviderProfile";
import {mapServiceToMarketplaceItem} from "@/lib/supabase/marketplace";

import { allServices } from "@/app/data/marketplace";
import Link from "next/link";
import { vendorBookingLink } from "@/lib/vendor-calendar/links";
import { useMemo, useState } from "react";
import type { BookingRow } from "@/lib/repositories/bookingsRepository";
import type { QuoteRequestRow } from "@/lib/repositories/quotesRepository";
import type {
  VendorAvailabilityRow,
  VendorBusinessRow,
  VendorPhotoRow,
  VendorServiceRow,
} from "@/lib/repositories/vendorsRepository";
import type { PublicTableRow } from "@/lib/supabase/database.types";
import { formatDate, formatMoney } from "@/lib/utils/format";

export type QuoteWithEvent = QuoteRequestRow & {
  event?: Pick<PublicTableRow<"events">,"title"|"event_type"|"date"|"guest_count">;
};

export type VendorDashboardTab =
  | "Dashboard"
  | "Services"
  | "Availability"
  | "Photos"
  | "Inquiries"
  | "Bookings"
  | "Profile"
  | "Business Settings"
  | "Analytics";

export const vendorDashboardTabs: VendorDashboardTab[] = [
  "Dashboard",
  "Services",
  "Availability",
  "Photos",
  "Inquiries",
  "Bookings",
  "Profile",
  "Business Settings",
  "Analytics",
];

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
  onDeletePhoto: (photo: VendorPhotoRow) => Promise<void>;
  onUpdateBusiness: (vendorId: string, draft: BusinessDraft) => Promise<void>;
  onReorderPhotos: (vendorId:string,ids:string[]) => Promise<void>;
  onUploadPhoto: (vendorId: string, file: File, altText:string) => Promise<boolean>;
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

export function PhotosTab({
  services, availability,
  onReorderPhotos,
  onDeletePhoto,
  onUploadPhoto,
  photos,
  vendors,
}: Pick<
  VendorTabProps,
  "onDeletePhoto" | "onUploadPhoto" | "onReorderPhotos" | "photos" | "vendors" | "services" | "availability"
>) {
  const [vendorId, setVendorId] = useState(vendors[0]?.id ?? "");
  const [altText,setAltText]=useState("");
  const [preview,setPreview]=useState(false);
  const [fileName, setFileName] = useState("");
  const [pendingFile, setPendingFile] = useState<File>();
  const [rightsAccepted, setRightsAccepted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const selectedVendor = vendors.find((vendor) => vendor.id === vendorId);

  const selectedServices=services.filter(s=>s.vendor_id===vendorId);
  const previewItem=selectedVendor&&selectedServices[0]?mapServiceToMarketplaceItem(selectedVendor,selectedServices[0],availability.filter(a=>a.vendor_id===vendorId),photos.filter(p=>p.vendor_id===vendorId),[],selectedServices):null;

  async function uploadFile(file: File | undefined) {
    if (!file || !vendorId || !rightsAccepted || altText.trim().length<3 || uploading) {
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFileName("Choose a JPEG, PNG, or WebP photo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileName("Photo uploads must be 5MB or smaller.");
      return;
    }

    setFileName(file.name);
    setUploading(true);
    try {
      if (await onUploadPhoto(vendorId, file, altText)) {
        setPendingFile(undefined);
        setRightsAccepted(false);
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <Panel title="Photos">
      {previewItem&&<button className="mb-4 rounded-lg border px-4 py-2 text-sm" onClick={()=>setPreview(true)}>Preview customer profile</button>}
      {preview&&previewItem&&<ProviderProfile item={previewItem} quote={0} matchReason="Your saved business profile and services" selected={false} preview onAdd={()=>{}} onClose={()=>setPreview(false)}/>}

      <div className="grid gap-3 rounded-lg border border-dashed border-neutral-300 p-5 text-sm text-neutral-600">
        <p>
          Upload JPEG, PNG, or WebP images up to 5MB. Photos appear on your public business profile.
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
        <label className="flex h-12 cursor-pointer items-center justify-center rounded-full focus-within:outline-2 focus-within:outline-offset-4 bg-[#0D1321] px-4 text-sm font-semibold text-white">
          Choose photo
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setPendingFile(file);
              setFileName(file?.name ?? "");
              setRightsAccepted(false);
              event.target.value = "";
            }}
          />
        </label>
        <label className="grid gap-2 text-sm">Describe the photo for people who cannot see it<input value={altText} maxLength={500} onChange={e=>setAltText(e.target.value)} placeholder="For example: Round tables set for a garden reception" className="rounded-lg border bg-white p-3"/></label>
        <label className="flex items-start gap-2">
          <input type="checkbox" checked={rightsAccepted} onChange={(event) => setRightsAccepted(event.target.checked)} />
          I own this photo or have permission to publish it, including permission from identifiable people shown.
        </label>
        <button type="button" disabled={!pendingFile || !vendorId || !rightsAccepted || altText.trim().length<3 || uploading} onClick={() => void uploadFile(pendingFile)} className="rounded-full bg-[#0D1321] px-4 py-3 font-semibold text-white disabled:opacity-50">
          {uploading ? "Uploading…" : "Upload photo"}
        </button>
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
            .sort((a,b)=>a.sort_order-b.sort_order)
            .map((photo,index,ordered) => (
              <div key={photo.id} className="overflow-hidden rounded-lg border border-neutral-200">
                <div
                  role="img"
                  aria-label={`Photo for ${selectedVendor.business_name}`}
                  className="h-40 bg-cover bg-center"
                  style={{ backgroundImage: `url(${photo.image_url})` }}
                />
                <div className="flex gap-3 p-3 text-xs"><span>{index===0?"Cover photo":`Photo ${index+1}`}</span>{index>0&&<><button type="button" className="underline" onClick={()=>void onReorderPhotos(vendorId,[photo.id,...ordered.filter(p=>p.id!==photo.id).map(p=>p.id)])}>Use as cover</button><button type="button" className="underline" onClick={()=>{const ids=ordered.map(p=>p.id);[ids[index-1],ids[index]]=[ids[index],ids[index-1]];void onReorderPhotos(vendorId,ids);}}>Move earlier</button></>}</div>
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

export function BookingsTab({ bookings }: Pick<VendorTabProps, "bookings">) {
  return (
    <Panel title="Confirmed bookings">
      {bookings.length ? (
        bookings.map((booking) => (
          <Link
            key={booking.id}
            href={booking.vendor_id ? vendorBookingLink(booking.vendor_id, booking.id) : `/bookings/${booking.id}`}
            className="block rounded-lg border border-neutral-200 p-4 transition hover:border-[#0D1321]"
          >
            <p className="font-semibold text-neutral-950">
              {formatMoney(booking.final_price)}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {booking.booking_status} · No payment collected
            </p>
          </Link>
        ))
      ) : (
        <EmptyLine text="No bookings yet. Bookings appear after customers accept a quote." />
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
