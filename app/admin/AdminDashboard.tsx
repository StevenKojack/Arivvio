"use client";

import { useEffect, useState } from "react";
import { isAdminEmail } from "@/lib/auth/roles";
import {
  getAdminOverview,
  updateVendorApprovalStatus,
} from "@/lib/repositories/adminRepository";
import type { PublicTableRow } from "@/lib/supabase/database.types";
import { createBrowserSupabaseClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { formatDate, formatMoney } from "@/lib/utils/format";

type AdminOverview = Awaited<ReturnType<typeof getAdminOverview>>;
type VendorRow = PublicTableRow<"vendor_businesses">;

export function AdminDashboard() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [message, setMessage] = useState("Loading admin dashboard...");
  const [activeSection, setActiveSection] = useState("Vendors");

  useEffect(() => {
    async function loadAdmin() {
      if (!hasSupabaseConfig()) {
        setMessage("Supabase is not configured yet.");
        return;
      }

      try {
        const supabase = createBrowserSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;

        if (!user) {
          setMessage("Log in with an admin account to view this dashboard.");
          return;
        }

        if (!isAdminEmail(user.email)) {
          setMessage("Access denied. Admin tools are restricted.");
          return;
        }

        const adminOverview = await getAdminOverview(supabase);
        setOverview(adminOverview);
        setMessage("");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to load admin dashboard.");
      }
    }

    loadAdmin();
  }, []);

  async function updateVendor(vendor: VendorRow, status: "approved" | "rejected") {
    try {
      const supabase = createBrowserSupabaseClient();
      const updatedVendor = await updateVendorApprovalStatus(supabase, {
        status,
        vendorId: vendor.id,
      });

      setOverview((current) =>
        current
          ? {
              ...current,
              vendors: current.vendors.map((item) =>
                item.id === vendor.id ? updatedVendor : item,
              ),
            }
          : current,
      );
      setMessage(`Vendor ${status}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update vendor.");
    }
  }

  if (!overview) {
    return (
      <div className="mx-auto max-w-7xl rounded-lg border border-neutral-200 bg-white p-6">
        <p className="text-sm font-semibold text-neutral-700">{message}</p>
      </div>
    );
  }

  const sections = ["Vendors", "Events", "Quotes", "Bookings", "Users", "Services"];

  return (
    <div className="mx-auto max-w-7xl">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B88A1D]">
          Admin
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
          Marketplace operations.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-neutral-600">
          Review vendors, events, quotes, bookings, profiles, and services
          without destructive actions.
        </p>
      </div>

      {message ? (
        <p className="mt-6 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700">
          {message}
        </p>
      ) : null}

      <div className="mt-8 grid gap-4 md:grid-cols-5">
        <Metric label="Vendors" value={String(overview.vendors.length)} />
        <Metric label="Events" value={String(overview.events.length)} />
        <Metric label="Quotes" value={String(overview.quoteRequests.length)} />
        <Metric label="Bookings" value={String(overview.bookings.length)} />
        <Metric label="Users" value={String(overview.profiles.length)} />
      </div>

      <div className="mt-8 overflow-x-auto rounded-lg border border-neutral-200 bg-white p-2">
        <div className="flex min-w-max gap-2">
          {sections.map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => setActiveSection(section)}
              className={`h-10 rounded-full px-4 text-sm font-semibold ${
                activeSection === section
                  ? "bg-[#0D1321] text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {section}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {activeSection === "Vendors" ? (
          <Panel title="Vendor businesses">
            {overview.vendors.map((vendor) => (
              <div key={vendor.id} className="rounded-lg border border-neutral-200 p-4">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <p className="font-semibold text-neutral-950">{vendor.business_name}</p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {vendor.category} - {vendor.approval_status} -{" "}
                      {vendor.service_area_city ?? "No city"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateVendor(vendor, "approved")}
                      className="rounded-full bg-[#0D1321] px-3 py-2 text-xs font-semibold text-white"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => updateVendor(vendor, "rejected")}
                      className="rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </Panel>
        ) : null}
        {activeSection === "Events" ? (
          <Panel title="Events">
            {overview.events.map((event) => (
              <Row
                key={event.id}
                title={event.title}
                detail={`${event.event_type} - ${formatDate(event.date)} - ${event.status}`}
              />
            ))}
          </Panel>
        ) : null}
        {activeSection === "Quotes" ? (
          <Panel title="Quote requests">
            {overview.quoteRequests.map((quote) => (
              <Row
                key={quote.id}
                title={quote.status}
                detail={`${formatMoney(quote.vendor_final_price ?? quote.estimated_price)} - guests ${quote.guest_count ?? 0}`}
              />
            ))}
          </Panel>
        ) : null}
        {activeSection === "Bookings" ? (
          <Panel title="Bookings">
            {overview.bookings.map((booking) => (
              <Row
                key={booking.id}
                title={`${booking.booking_status} - ${formatMoney(booking.final_price)}`}
                detail={`Payment ${booking.payment_status}`}
              />
            ))}
          </Panel>
        ) : null}
        {activeSection === "Users" ? (
          <Panel title="Profiles">
            {overview.profiles.map((profile) => (
              <Row
                key={profile.id}
                title={profile.email}
                detail={`${profile.role} - ${profile.full_name ?? "No name"}`}
              />
            ))}
          </Panel>
        ) : null}
        {activeSection === "Services" ? (
          <Panel title="Vendor services">
            {overview.services.map((service) => (
              <Row
                key={service.id}
                title={service.service_name}
                detail={`${service.category} - ${service.pricing_type} - ${service.active ? "active" : "disabled"}`}
              />
            ))}
          </Panel>
        ) : null}
      </div>
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
    <section className="rounded-lg border border-neutral-200 bg-white p-6">
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
