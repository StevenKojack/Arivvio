"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { allServices, eventTypes } from "../../data/marketplace";
import {
  ZoneMapEditor,
  summarizeMapZones,
  type MapZone,
} from "../../components/maps/ZoneMapEditor";
import { createBrowserSupabaseClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { ensureCurrentProfile } from "@/lib/repositories/profilesRepository";
import {
  createVendorBusiness,
  createVendorService,
} from "@/lib/repositories/vendorsRepository";
import type { PricingType } from "@/lib/types/domain";
import { optionalUrl, requirePositiveNumber, requireString } from "@/lib/validators/forms";
import { validateVendorTags } from "@/lib/validators/tags";

const lifeStageOptions = ["Kids", "Teen", "Adult", "All ages"];

export function VendorOnboardingForm() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["DJ"]);
  const [city, setCity] = useState("Los Angeles");
  const [radius, setRadius] = useState(30);
  const [territoryZones, setTerritoryZones] = useState<MapZone[]>([
    {
      center: { x: 50, y: 50 },
      id: "vendor-zone-1",
      label: "Service territory 1",
      radiusPct: 28,
      type: "radius",
    },
  ]);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceName, setServiceName] = useState("DJ package");
  const [pricingType, setPricingType] = useState<PricingType>("hourly");
  const [basePrice, setBasePrice] = useState(300);
  const [hourlyRate, setHourlyRate] = useState(100);
  const [minimumHours, setMinimumHours] = useState(3);
  const [minimumGuests, setMinimumGuests] = useState(1);
  const [maximumGuests, setMaximumGuests] = useState(150);
  const [travelMode, setTravelMode] = useState("Travels to the customer");
  const [selectedLifeStages, setSelectedLifeStages] = useState<string[]>(["All ages"]);
  const [tagInput, setTagInput] = useState("birthday, private party, dance");
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([
    "Birthday",
    "Wedding",
    "Private Party",
  ]);
  const [error, setError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function checkSession() {
      if (!hasSupabaseConfig()) {
        return;
      }

      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.auth.getSession();

      if (!data.session?.user) {
        setAuthNotice("Log in first, then continue listing your service.");
      }
    }

    checkSession();
  }, []);

  function toggleEventType(eventType: string) {
    setSelectedEventTypes((current) =>
      current.includes(eventType)
        ? current.filter((item) => item !== eventType)
        : [...current, eventType],
    );
  }

  function toggleCategory(service: string) {
    setSelectedCategories((current) => {
      const next = current.includes(service)
        ? current.filter((item) => item !== service)
        : [...current, service];

      return next.length ? next : current;
    });

    if (!serviceName || serviceName === `${selectedCategories[0]} package`) {
      setServiceName(`${service} package`);
    }
  }

  function toggleLifeStage(lifeStage: string) {
    setSelectedLifeStages((current) => {
      if (lifeStage === "All ages") {
        return ["All ages"];
      }

      const withoutAllAges = current.filter((item) => item !== "All ages");
      const next = withoutAllAges.includes(lifeStage)
        ? withoutAllAges.filter((item) => item !== lifeStage)
        : [...withoutAllAges, lifeStage];

      return next.length ? next : ["All ages"];
    });
  }

  async function submitVendor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!hasSupabaseConfig()) {
      setError("Supabase is not configured yet. Add .env.local values first.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        router.push("/auth/login?next=/vendor/onboarding");
        return;
      }

      const profile = await ensureCurrentProfile(supabase, user);
      requireString(businessName, "Business name");
      requireString(serviceName, "Service name");
      requirePositiveNumber(radius, "Service radius");
      const primaryCategory = selectedCategories[0];
      const tags = validateVendorTags(tagInput.split(","));
      const structuredDescription = buildStructuredVendorDescription({
        categories: selectedCategories,
        description,
        lifeStages: selectedLifeStages,
        maximumGuests,
        minimumGuests,
        tags,
        territoryZones,
        travelMode,
      });
      const vendor = await createVendorBusiness(supabase, {
        approvalStatus: "approved",
        businessName,
        category: selectedCategories.join(", "),
        city,
        description: structuredDescription,
        ownerId: profile.id,
        phone: phone || null,
        radius,
        websiteUrl: optionalUrl(websiteUrl),
      });

      await createVendorService(supabase, {
        basePrice: pricingType === "hourly" ? null : basePrice,
        category: primaryCategory,
        description: structuredDescription,
        eventTypesSupported: selectedEventTypes,
        hourlyRate: pricingType === "hourly" ? hourlyRate : null,
        minimumHours: pricingType === "hourly" ? minimumHours : null,
        pricingType,
        serviceName,
        vendorId: vendor.id,
      });

      router.push("/account");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create vendor listing.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submitVendor}
      className="mx-auto mt-10 grid max-w-4xl gap-5 rounded-[28px] border border-[#D4AF37]/16 bg-white p-6 shadow-[0_22px_60px_rgba(13,19,33,0.07)]"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-neutral-800">
          Business name
          <input
            required
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            className="h-12 rounded-2xl border border-[#D4AF37]/20 px-4 text-sm outline-none focus:border-[#D4AF37]"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-neutral-800">
          Primary categories
          <span className="grid max-h-40 gap-2 overflow-y-auto rounded-2xl border border-[#D4AF37]/14 bg-[#FFFCF7] p-2">
            {allServices.slice(0, 18).map((service) => (
              <button
                key={service}
                type="button"
                onClick={() => toggleCategory(service)}
                className={`rounded-full px-3 py-2 text-left text-xs font-semibold transition ${
                  selectedCategories.includes(service)
                    ? "bg-[#0D1321] text-white"
                    : "border border-[#D4AF37]/18 bg-white text-neutral-700"
                }`}
              >
                {service}
              </button>
            ))}
          </span>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-neutral-800 md:col-span-2">
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-28 rounded-2xl border border-[#D4AF37]/20 px-4 py-3 text-sm outline-none focus:border-[#D4AF37]"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-neutral-800">
          Service city
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="h-12 rounded-lg border border-neutral-300 px-4 text-sm outline-none focus:border-[#0D1321]"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-neutral-800">
          Service radius
          <input
            type="number"
            min="1"
            value={radius}
            onChange={(event) => setRadius(Number(event.target.value))}
            className="h-12 rounded-lg border border-neutral-300 px-4 text-sm outline-none focus:border-[#0D1321]"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-neutral-800">
          Website
          <input
            value={websiteUrl}
            onChange={(event) => setWebsiteUrl(event.target.value)}
            placeholder="https://"
            className="h-12 rounded-lg border border-neutral-300 px-4 text-sm outline-none focus:border-[#0D1321]"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-neutral-800">
          Phone
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="h-12 rounded-lg border border-neutral-300 px-4 text-sm outline-none focus:border-[#0D1321]"
          />
        </label>
      </div>

      <ZoneMapEditor
        defaultLabel="Service territory"
        onZonesChange={setTerritoryZones}
        subtitle="Define where this business is willing to provide service."
        title="Vendor territory map"
        zones={territoryZones}
      />

      <div className="rounded-lg bg-[#F6F3EA] p-5">
        <h2 className="text-xl font-semibold tracking-tight">Starter service</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-neutral-800">
            Service name
            <input
              value={serviceName}
              onChange={(event) => setServiceName(event.target.value)}
              className="h-12 rounded-lg border border-neutral-300 px-4 text-sm outline-none focus:border-[#0D1321]"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-neutral-800">
            Pricing type
            <select
              value={pricingType}
              onChange={(event) => setPricingType(event.target.value as PricingType)}
              className="h-12 rounded-lg border border-neutral-300 bg-white px-4 text-sm outline-none focus:border-[#0D1321]"
            >
              <option value="hourly">Hourly</option>
              <option value="flat">Flat</option>
              <option value="per_guest">Per guest</option>
            </select>
          </label>
          {pricingType === "hourly" ? (
            <>
              <label className="grid gap-2 text-sm font-semibold text-neutral-800">
                Hourly rate
                <input
                  type="number"
                  min="0"
                  value={hourlyRate}
                  onChange={(event) => setHourlyRate(Number(event.target.value))}
                  className="h-12 rounded-lg border border-neutral-300 px-4 text-sm outline-none focus:border-[#0D1321]"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-neutral-800">
                Minimum hours
                <input
                  type="number"
                  min="1"
                  value={minimumHours}
                  onChange={(event) => setMinimumHours(Number(event.target.value))}
                  className="h-12 rounded-lg border border-neutral-300 px-4 text-sm outline-none focus:border-[#0D1321]"
                />
              </label>
            </>
          ) : (
            <label className="grid gap-2 text-sm font-semibold text-neutral-800">
              {pricingType === "per_guest" ? "Price per guest" : "Base price"}
              <input
                  type="number"
                min="0"
                value={basePrice}
                onChange={(event) => setBasePrice(Number(event.target.value))}
                className="h-12 rounded-lg border border-neutral-300 px-4 text-sm outline-none focus:border-[#0D1321]"
              />
            </label>
          )}
          <label className="grid gap-2 text-sm font-semibold text-neutral-800">
            Minimum guests
            <input
              type="number"
              min="1"
              value={minimumGuests}
              onChange={(event) => setMinimumGuests(Number(event.target.value))}
              className="h-12 rounded-lg border border-neutral-300 px-4 text-sm outline-none focus:border-[#0D1321]"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-neutral-800">
            Maximum guests
            <input
              type="number"
              min="1"
              value={maximumGuests}
              onChange={(event) => setMaximumGuests(Number(event.target.value))}
              className="h-12 rounded-lg border border-neutral-300 px-4 text-sm outline-none focus:border-[#0D1321]"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-neutral-800 md:col-span-2">
            Travel behavior
            <select
              value={travelMode}
              onChange={(event) => setTravelMode(event.target.value)}
              className="h-12 rounded-lg border border-neutral-300 bg-white px-4 text-sm outline-none focus:border-[#0D1321]"
            >
              <option>Travels to the customer</option>
              <option>Customer comes to our location</option>
              <option>Both travel and on-site service</option>
            </select>
          </label>
        </div>
        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-neutral-800">
            Event types supported
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {eventTypes.map((eventType) => (
              <button
                key={eventType}
                type="button"
                onClick={() => toggleEventType(eventType)}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                  selectedEventTypes.includes(eventType)
                    ? "bg-[#0D1321] text-white"
                    : "border border-neutral-300 bg-white text-neutral-700"
                }`}
              >
                {eventType}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-neutral-800">
            Ages or life stages supported
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {lifeStageOptions.map((lifeStage) => (
              <button
                key={lifeStage}
                type="button"
                onClick={() => toggleLifeStage(lifeStage)}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                  selectedLifeStages.includes(lifeStage)
                    ? "bg-[#0D1321] text-white"
                    : "border border-neutral-300 bg-white text-neutral-700"
                }`}
              >
                {lifeStage}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="mt-5 grid gap-2 text-sm font-semibold text-neutral-800">
          Service tags
          <input
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            placeholder="teen, activity, backyard, armenian, taco-cart"
            className="h-12 rounded-lg border border-neutral-300 bg-white px-4 text-sm outline-none focus:border-[#0D1321]"
          />
          <span className="text-xs font-medium text-neutral-500">
            Use short comma-separated tags. Offensive tags are blocked.
          </span>
        </label>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}
      {authNotice ? (
        <div className="rounded-lg border border-neutral-200 bg-[#FFFCF7] px-4 py-3 text-sm font-semibold text-neutral-700">
          <p>{authNotice}</p>
          <Link
            href="/auth/login?next=/vendor/onboarding"
            className="mt-3 inline-flex rounded-full bg-[#0D1321] px-4 py-2 text-sm text-white"
          >
            Log in to continue
          </Link>
        </div>
      ) : null}
      <button
        disabled={isSubmitting}
        className="h-12 rounded-full bg-[#0D1321] px-6 text-sm font-semibold text-white transition hover:bg-[#111A2E] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Creating..." : "Create vendor listing"}
      </button>
    </form>
  );
}

function buildStructuredVendorDescription(input: {
  categories: string[];
  description: string;
  lifeStages: string[];
  maximumGuests: number;
  minimumGuests: number;
  tags: string[];
  territoryZones: MapZone[];
  travelMode: string;
}) {
  return [
    input.description.trim(),
    `Categories: ${input.categories.join(", ")}`,
    `Travel: ${input.travelMode}`,
    `Guest range: ${input.minimumGuests}-${input.maximumGuests}`,
    `Life stages: ${input.lifeStages.join(", ")}`,
    `Territories: ${summarizeMapZones(input.territoryZones)}`,
    `Tags: ${input.tags.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
