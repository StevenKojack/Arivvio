"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { eventTypes } from "@/app/data/marketplace";
import { createBrowserSupabaseClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { getEventsByIds } from "@/lib/repositories/eventsRepository";
import { ensureCurrentProfile } from "@/lib/repositories/profilesRepository";
import { getBookingsForVendors, type BookingRow } from "@/lib/repositories/bookingsRepository";
import { getQuoteRequestsForVendors } from "@/lib/repositories/quotesRepository";
import {
  createAvailabilityWindow,
  createVendorService,
  deleteAvailabilityWindow,
  deleteVendorPhoto,
  deleteVendorService,
  getVendorAvailabilityByVendorIds,
  getVendorBusinessesByOwner,
  getVendorPhotosByVendorIds,
  getVendorServicesByVendorIds,
  uploadVendorPhoto,
  updateVendorBusiness,
  updateVendorVacationMode,
  updateVendorService,
  type VendorAvailabilityRow,
  type VendorBusinessRow,
  type VendorPhotoRow,
  type VendorServiceRow,
} from "@/lib/repositories/vendorsRepository";
import { respondToQuoteRequest } from "@/lib/services/quoteService";
import { optionalUrl, requirePositiveNumber, requireString } from "@/lib/validators/forms";
import {
  AnalyticsTab,
  AvailabilityTab,
  BookingsTab,
  BusinessSettingsTab,
  DashboardTab,
  PhotosTab,
  ProfileTab,
  QuotesTab,
  ServicesTab,
  vendorDashboardTabs,
  type AvailabilityDraft,
  type BusinessDraft,
  type QuoteWithEvent,
  type ServiceDraft,
  type VendorDashboardTab,
} from "./VendorDashboardTabs";
import type { QuoteStatus } from "@/lib/types/domain";

export function VendorDashboard() {
  const [activeTab, setActiveTab] = useState<VendorDashboardTab>("Dashboard");
  const [vendors, setVendors] = useState<VendorBusinessRow[]>([]);
  const [services, setServices] = useState<VendorServiceRow[]>([]);
  const [availability, setAvailability] = useState<VendorAvailabilityRow[]>([]);
  const [photos, setPhotos] = useState<VendorPhotoRow[]>([]);
  const [quotes, setQuotes] = useState<QuoteWithEvent[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      if (!hasSupabaseConfig()) {
        setMessage("Supabase is not configured yet. Add the project URL to use vendor quotes.");
        setIsLoading(false);
        return;
      }

      try {
        const supabase = createBrowserSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;

        if (!user) {
          setMessage("Log in as a vendor to see quote requests.");
          setIsLoading(false);
          return;
        }

        const profile = await ensureCurrentProfile(supabase, user);
        const vendorRows = await getVendorBusinessesByOwner(supabase, profile.id);
        const vendorIds = vendorRows.map((vendor) => vendor.id);
        const [serviceRows, availabilityRows, photoRows, quoteRows, bookingRows] =
          await Promise.all([
            getVendorServicesByVendorIds(supabase, vendorIds),
            getVendorAvailabilityByVendorIds(supabase, vendorIds),
            getVendorPhotosByVendorIds(supabase, vendorIds),
            getQuoteRequestsForVendors(supabase, vendorIds),
            getBookingsForVendors(supabase, vendorIds),
          ]);
        const eventIds = Array.from(new Set(quoteRows.map((quote) => quote.event_id)));
        const eventRows = await getEventsByIds(supabase, eventIds);
        const eventsById = new Map(
          eventRows.map((eventRow) => [eventRow.id, eventRow]),
        );

        setVendors(vendorRows);
        setServices(serviceRows);
        setAvailability(availabilityRows);
        setPhotos(photoRows);
        setBookings(bookingRows);
        setQuotes(
          quoteRows.map((quote) => ({
            ...quote,
            event: eventsById.get(quote.event_id),
          })),
        );
        setMessage("");
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Unable to load vendor dashboard.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, []);

  async function handleCreateService(draft: ServiceDraft) {
    const vendor = vendors[0];

    if (!vendor) {
      setMessage("Create a vendor profile before adding services.");
      return;
    }

    try {
      requireString(draft.serviceName, "Service name");
      const supabase = createBrowserSupabaseClient();
      const service = await createVendorService(supabase, {
        active: draft.active,
        basePrice: draft.pricingType === "hourly" ? null : draft.basePrice,
        category: draft.category,
        description: draft.description || null,
        eventTypesSupported: draft.eventTypesSupported.length
          ? draft.eventTypesSupported
          : eventTypes,
        hourlyRate: draft.pricingType === "hourly" ? draft.hourlyRate : null,
        minimumHours: draft.pricingType === "hourly" ? draft.minimumHours : null,
        pricingType: draft.pricingType,
        serviceName: draft.serviceName,
        setupFee: draft.setupFee,
        travelFee: draft.travelFee,
        vendorId: vendor.id,
      });

      setServices((current) => [service, ...current]);
      setMessage("Service created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create service.");
    }
  }

  async function handleUpdateService(serviceId: string, draft: ServiceDraft) {
    try {
      requireString(draft.serviceName, "Service name");
      const supabase = createBrowserSupabaseClient();
      const updatedService = await updateVendorService(supabase, {
        active: draft.active,
        basePrice: draft.pricingType === "hourly" ? null : draft.basePrice,
        category: draft.category,
        description: draft.description || null,
        eventTypesSupported: draft.eventTypesSupported.length
          ? draft.eventTypesSupported
          : eventTypes,
        hourlyRate: draft.pricingType === "hourly" ? draft.hourlyRate : null,
        id: serviceId,
        minimumHours: draft.pricingType === "hourly" ? draft.minimumHours : null,
        pricingType: draft.pricingType,
        serviceName: draft.serviceName,
        setupFee: draft.setupFee,
        travelFee: draft.travelFee,
      });

      setServices((current) =>
        current.map((service) =>
          service.id === serviceId ? updatedService : service,
        ),
      );
      setMessage("Service updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update service.");
    }
  }

  async function handleDeleteService(service: VendorServiceRow) {
    try {
      const supabase = createBrowserSupabaseClient();
      await deleteVendorService(supabase, service.id);
      setServices((current) => current.filter((item) => item.id !== service.id));
      setMessage("Service deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete service.");
    }
  }

  async function handleToggleService(service: VendorServiceRow) {
    try {
      const supabase = createBrowserSupabaseClient();
      const updatedService = await updateVendorService(supabase, {
        active: !service.active,
        id: service.id,
      });

      setServices((current) =>
        current.map((item) => (item.id === service.id ? updatedService : item)),
      );
      setMessage(updatedService.active ? "Service enabled." : "Service disabled.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update service.");
    }
  }

  async function handleCreateAvailability(draft: AvailabilityDraft) {
    try {
      requireString(draft.date, "Date");
      const supabase = createBrowserSupabaseClient();
      const window = await createAvailabilityWindow(supabase, draft);

      setAvailability((current) => [window, ...current]);
      setMessage("Availability saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save availability.");
    }
  }

  async function handleDeleteAvailability(availabilityId: string) {
    try {
      const supabase = createBrowserSupabaseClient();
      await deleteAvailabilityWindow(supabase, availabilityId);
      setAvailability((current) =>
        current.filter((window) => window.id !== availabilityId),
      );
      setMessage("Availability removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete availability.");
    }
  }

  async function handleToggleVacationMode(vendor: VendorBusinessRow) {
    try {
      const supabase = createBrowserSupabaseClient();
      const updatedVendor = await updateVendorVacationMode(supabase, {
        id: vendor.id,
        vacationMode: !vendor.vacation_mode,
      });
      setVendors((current) =>
        current.map((item) => (item.id === vendor.id ? updatedVendor : item)),
      );
      setMessage(updatedVendor.vacation_mode ? "Vacation mode enabled." : "Vacation mode disabled.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update vacation mode.");
    }
  }

  async function handleUploadPhoto(vendorId: string, file: File) {
    try {
      const supabase = createBrowserSupabaseClient();
      const result = await uploadVendorPhoto(supabase, {
        file,
        sortOrder: photos.filter((photo) => photo.vendor_id === vendorId).length,
        vendorId,
      });

      setPhotos((current) => [result.photo, ...current]);
      setMessage("Photo uploaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to upload photo.");
    }
  }

  async function handleDeletePhoto(photo: VendorPhotoRow) {
    try {
      const supabase = createBrowserSupabaseClient();
      await deleteVendorPhoto(supabase, photo);
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
      setMessage("Photo deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete photo.");
    }
  }

  async function handleRespondQuote(
    quoteId: string,
    status: Extract<QuoteStatus, "accepted" | "declined" | "countered">,
    vendorFinalPrice?: number | null,
  ) {
    try {
      const supabase = createBrowserSupabaseClient();
      const updatedQuote = await respondToQuoteRequest(supabase, {
        quoteId,
        status,
        vendorFinalPrice,
      });

      setQuotes((current) =>
        current.map((quote) =>
          quote.id === quoteId ? { ...quote, ...updatedQuote } : quote,
        ),
      );
      setMessage(`Quote ${status}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update quote.");
    }
  }

  async function handleUpdateBusiness(vendorId: string, draft: BusinessDraft) {
    try {
      requireString(draft.businessName, "Business name");
      requirePositiveNumber(draft.radius, "Radius");
      const supabase = createBrowserSupabaseClient();
      const updatedVendor = await updateVendorBusiness(supabase, {
        businessName: draft.businessName,
        category: draft.category,
        city: draft.city,
        description: draft.description || null,
        id: vendorId,
        phone: draft.phone || null,
        radius: draft.radius,
        websiteUrl: optionalUrl(draft.websiteUrl),
      });

      setVendors((current) =>
        current.map((vendor) => (vendor.id === vendorId ? updatedVendor : vendor)),
      );
      setMessage("Business updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update business.");
    }
  }

  if (isLoading) {
    return <DashboardShell message="Loading vendor dashboard..." />;
  }

  if (message && !vendors.length) {
    return (
      <DashboardShell message={message}>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/auth/login"
            className="rounded-full bg-[#0D1321] px-5 py-3 text-sm font-semibold text-white"
          >
            Log in
          </Link>
          <Link
            href="/vendor/onboarding"
            className="rounded-full border border-neutral-300 px-5 py-3 text-sm font-semibold text-neutral-950"
          >
            Create vendor profile
          </Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B88A1D]">
            Vendor dashboard
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
            Run your event business.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-neutral-600">
            Manage services, availability, quotes, bookings, and your public
            business profile from one operational console.
          </p>
        </div>
        <Link
          href="/vendor/onboarding"
          className="rounded-full bg-[#0D1321] px-5 py-3 text-sm font-semibold text-white"
        >
          Add business
        </Link>
      </div>

      {message ? (
        <p className="mt-6 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700">
          {message}
        </p>
      ) : null}

      <div className="mt-8 overflow-x-auto rounded-lg border border-neutral-200 bg-white p-2">
        <div className="flex min-w-max gap-2">
          {vendorDashboardTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`h-10 rounded-full px-4 text-sm font-semibold transition ${
                activeTab === tab
                  ? "bg-[#0D1321] text-white"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {activeTab === "Dashboard" ? (
          <DashboardTab
            bookings={bookings}
            quotes={quotes}
            services={services}
            vendors={vendors}
          />
        ) : null}
        {activeTab === "Services" ? (
          <ServicesTab
            onCreateService={handleCreateService}
            onDeleteService={handleDeleteService}
            onToggleService={handleToggleService}
            onUpdateService={handleUpdateService}
            services={services}
            vendors={vendors}
          />
        ) : null}
        {activeTab === "Availability" ? (
          <AvailabilityTab
            availability={availability}
            onCreateAvailability={handleCreateAvailability}
            onDeleteAvailability={handleDeleteAvailability}
            onToggleVacationMode={handleToggleVacationMode}
            vendors={vendors}
          />
        ) : null}
        {activeTab === "Photos" ? (
          <PhotosTab
            onDeletePhoto={handleDeletePhoto}
            onUploadPhoto={handleUploadPhoto}
            photos={photos}
            vendors={vendors}
          />
        ) : null}
        {activeTab === "Quotes" ? (
          <QuotesTab onRespondQuote={handleRespondQuote} quotes={quotes} />
        ) : null}
        {activeTab === "Bookings" ? <BookingsTab bookings={bookings} /> : null}
        {activeTab === "Profile" ? <ProfileTab vendors={vendors} /> : null}
        {activeTab === "Business Settings" ? (
          <BusinessSettingsTab
            onUpdateBusiness={handleUpdateBusiness}
            vendors={vendors}
          />
        ) : null}
        {activeTab === "Analytics" ? (
          <AnalyticsTab bookings={bookings} quotes={quotes} services={services} />
        ) : null}
      </div>
    </div>
  );
}

function DashboardShell({
  children,
  message,
}: {
  children?: React.ReactNode;
  message: string;
}) {
  return (
    <div className="mx-auto max-w-7xl rounded-lg border border-neutral-200 bg-white p-6 shadow-[0_18px_44px_rgba(13,19,33,0.05)]">
      <p className="text-sm font-semibold text-neutral-700">{message}</p>
      {children}
    </div>
  );
}
