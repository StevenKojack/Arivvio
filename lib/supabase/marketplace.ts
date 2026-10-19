import type { SupabaseClient } from "@supabase/supabase-js";
import {
  allServices,
  eventTypes,
  type AvailabilityWindow,
  type EventType,
  type MarketplaceItem,
  type PricingModel,
  type ServiceName,
} from "@/app/data/marketplace";
import type { Database, PublicTableRow } from "./database.types";

type TypedSupabaseClient = SupabaseClient<Database>;
type VendorBusinessRow = PublicTableRow<"vendor_businesses">;
type VendorServiceRow = PublicTableRow<"vendor_services">;
type VendorAvailabilityRow = PublicTableRow<"vendor_availability">;
type VendorPhotoRow = PublicTableRow<"vendor_photos">;
type VendorTagRow = PublicTableRow<"vendor_tags">;
type VendorServiceTagRow = PublicTableRow<"vendor_service_tags">;
type EventRow = PublicTableRow<"events">;
type CartItemRow = PublicTableRow<"cart_items">;

export type MarketplaceCartInput = {
  endTime?: string | null;
  estimatedPrice?: number | null;
  eventId: string;
  itemType: "vendor_service" | "venue";
  quantity?: number;
  serviceId?: string | null;
  startTime?: string | null;
  vendorId?: string | null;
  venueId?: string | null;
};

export type QuoteRequestInput = {
  endTime?: string | null;
  estimatedPrice?: number | null;
  eventId: string;
  guestCount?: number | null;
  message?: string | null;
  plannerId: string;
  serviceId?: string | null;
  startTime?: string | null;
  vendorId?: string | null;
  venueId?: string | null;
};

export async function getApprovedVendorBusinesses(
  supabase: TypedSupabaseClient,
) {
  const { data, error } = await supabase
    .from("vendor_businesses")
    .select("*")
    .eq("approval_status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getVendorServices(
  supabase: TypedSupabaseClient,
  vendorIds?: string[],
) {
  let query = supabase
    .from("vendor_services")
    .select("*")
    .eq("active", true);

  if (vendorIds?.length) {
    query = query.in("vendor_id", vendorIds);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getMarketplaceProviders(supabase: TypedSupabaseClient) {
  const vendors = (await getApprovedVendorBusinesses(supabase)).filter(
    (vendor) => !vendor.vacation_mode,
  );
  const vendorIds = vendors.map((vendor) => vendor.id);

  if (!vendorIds.length) {
    return [];
  }

  const [services, availabilityByVendor, photosByVendor, tagsByVendor] = await Promise.all([
    getVendorServices(supabase, vendorIds),
    getAvailabilityByVendor(supabase, vendorIds),
    getPhotosByVendor(supabase, vendorIds),
    getTagsByVendor(supabase, vendorIds),
  ]);
  const serviceIds = services.map((service) => service.id);
  const tagsByService = await getTagsByService(supabase, serviceIds);
  const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor]));

  return services
    .map((service, index) => {
      const vendor = vendorById.get(service.vendor_id);

      if (!vendor) {
        return null;
      }

      return mapServiceToMarketplaceItem(
        vendor,
        service,
        availabilityByVendor.get(vendor.id) ?? [],
        photosByVendor.get(vendor.id) ?? [],
        [
          ...(tagsByVendor.get(vendor.id) ?? []),
          ...(tagsByService.get(service.id) ?? []),
        ],
        services.filter((candidate) => candidate.vendor_id === vendor.id),
        index,
      );
    })
    .filter((item): item is MarketplaceItem => Boolean(item));
}

export async function getEventById(
  supabase: TypedSupabaseClient,
  eventId: string,
) {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function createCartItem(
  supabase: TypedSupabaseClient,
  input: MarketplaceCartInput,
) {
  const { data, error } = await supabase
    .from("cart_items")
    .insert({
      end_time: input.endTime ?? null,
      estimated_price: input.estimatedPrice ?? null,
      event_id: input.eventId,
      item_type: input.itemType,
      quantity: input.quantity ?? 1,
      service_id: input.serviceId ?? null,
      start_time: input.startTime ?? null,
      vendor_id: input.vendorId ?? null,
      venue_id: input.venueId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function createQuoteRequest(
  supabase: TypedSupabaseClient,
  input: QuoteRequestInput,
) {
  const { data, error } = await supabase
    .from("quote_requests")
    .insert({
      estimated_price: input.estimatedPrice ?? null,
      event_id: input.eventId,
      guest_count: input.guestCount ?? null,
      message: input.message ?? null,
      planner_id: input.plannerId,
      requested_end_time: input.endTime ?? null,
      requested_start_time: input.startTime ?? null,
      service_id: input.serviceId ?? null,
      status: "pending",
      vendor_final_price: null,
      vendor_id: input.vendorId ?? null,
      venue_id: input.venueId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function createQuoteRequestsFromCart(
  supabase: TypedSupabaseClient,
  {
    cartItems,
    event,
    message,
    plannerId,
  }: {
    cartItems: Array<
      Pick<
        CartItemRow,
        | "end_time"
        | "estimated_price"
        | "event_id"
        | "id"
        | "service_id"
        | "start_time"
        | "vendor_id"
        | "venue_id"
      >
    >;
    event: Pick<EventRow, "guest_count" | "id">;
    message?: string;
    plannerId: string;
  },
) {
  const quoteableItems = cartItems.filter(
    (item) => item.vendor_id || item.service_id || item.venue_id,
  );

  if (!quoteableItems.length) {
    return [];
  }

  const records = quoteableItems.map((item) => ({
    estimated_price: item.estimated_price,
    event_id: event.id,
    guest_count: event.guest_count,
    message: message ?? null,
    planner_id: plannerId,
    requested_end_time: item.end_time,
    requested_start_time: item.start_time,
    service_id: item.service_id,
    status: "pending" as const,
    vendor_final_price: null,
    vendor_id: item.vendor_id,
    venue_id: item.venue_id,
  }));

  const { data, error } = await supabase
    .from("quote_requests")
    .insert(records)
    .select("*");

  if (error) {
    throw error;
  }

  await supabase
    .from("cart_items")
    .update({ status: "quote_requested" })
    .eq("event_id", event.id)
    .in(
      "id",
      quoteableItems.map((item) => item.id),
    );

  return data ?? [];
}

function mapServiceToMarketplaceItem(
  vendor: VendorBusinessRow,
  service: VendorServiceRow,
  availability: VendorAvailabilityRow[],
  photos: VendorPhotoRow[],
  tags: string[],
  vendorServices: VendorServiceRow[],
  index: number,
): MarketplaceItem {
  const type = toServiceName(service.category);
  const serviceOptions = vendorServices.map((vendorService) => ({
    description:
      vendorService.description ??
      `${vendor.business_name} offers ${vendorService.service_name}.`,
    estimateLabel: priceLabel(toPricingModel(vendorService)),
    service: toServiceName(vendorService.category),
    serviceId: vendorService.id,
    title: vendorService.service_name,
  }));
  const events = service.event_types_supported
    .filter((eventType): eventType is EventType =>
      eventTypes.includes(eventType as EventType),
    );
  const pricing = toPricingModel(service);
  const city = vendor.service_area_city ?? "Los Angeles";
  const basePrice = priceLabel(pricing);

  return {
    address: vendor.base_address ?? city,
    availability: toAvailabilityWindows(availability),
    blockedDates: availability
      .filter((row) => row.status === "blocked")
      .map((row) => row.date),
    coordinates: {
      lat: vendor.latitude ?? 34.0522 + index * 0.004,
      lng: vendor.longitude ?? -118.2437 - index * 0.004,
    },
    databaseSource: true,
    listingState: vendor.owner_id ? "claimed" : "unclaimed",
    description:
      service.description ??
      vendor.description ??
      `${vendor.business_name} offers ${service.service_name} for local events.`,
    events: events.length ? events : eventTypes,
    id: numericId(service.id),
    location: city,
    name: service.service_name || vendor.business_name,
    photoUrl: photos[0]?.image_url ?? null,
    price: basePrice,
    pricing,
    rating: 4.85,
    reviewCount: 1,
    serviceId: service.id,
    serviceRadiusMiles: vendor.service_radius_miles,
    serviceOptions: serviceOptions.length > 1 ? serviceOptions : undefined,
    services: Array.from(new Set(vendorServices.map((vendorService) => toServiceName(vendorService.category)))),
    sourceLabel: vendor.website_url ? "Vendor website" : "Database vendor",
    sourceUrl: vendor.website_url ?? "#",
    tags: Array.from(new Set([...tags, service.category, vendor.category, city])),
    type,
    vendorId: vendor.id,
    venueId: null,
  };
}

async function getTagsByVendor(
  supabase: TypedSupabaseClient,
  vendorIds: string[],
) {
  if (!vendorIds.length) {
    return new Map<string, string[]>();
  }

  const { data, error } = await supabase
    .from("vendor_tags")
    .select("*")
    .in("vendor_id", vendorIds);

  if (error) {
    if (error.code === "42P01") {
      return new Map<string, string[]>();
    }

    throw error;
  }

  return (data ?? []).reduce((map, row: VendorTagRow) => {
    const rows = map.get(row.vendor_id) ?? [];
    rows.push(row.tag);
    map.set(row.vendor_id, rows);
    return map;
  }, new Map<string, string[]>());
}

async function getTagsByService(
  supabase: TypedSupabaseClient,
  serviceIds: string[],
) {
  if (!serviceIds.length) {
    return new Map<string, string[]>();
  }

  const { data, error } = await supabase
    .from("vendor_service_tags")
    .select("*")
    .in("service_id", serviceIds);

  if (error) {
    if (error.code === "42P01") {
      return new Map<string, string[]>();
    }

    throw error;
  }

  return (data ?? []).reduce((map, row: VendorServiceTagRow) => {
    const rows = map.get(row.service_id) ?? [];
    rows.push(row.tag);
    map.set(row.service_id, rows);
    return map;
  }, new Map<string, string[]>());
}

async function getPhotosByVendor(
  supabase: TypedSupabaseClient,
  vendorIds: string[],
) {
  const { data, error } = await supabase
    .from("vendor_photos")
    .select("*")
    .in("vendor_id", vendorIds)
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).reduce((map, row) => {
    const rows = map.get(row.vendor_id) ?? [];
    rows.push(row);
    map.set(row.vendor_id, rows);
    return map;
  }, new Map<string, VendorPhotoRow[]>());
}

async function getAvailabilityByVendor(
  supabase: TypedSupabaseClient,
  vendorIds: string[],
) {
  const { data, error } = await supabase
    .from("vendor_availability")
    .select("*")
    .in("vendor_id", vendorIds);

  if (error) {
    throw error;
  }

  return (data ?? []).reduce((map, row) => {
    const rows = map.get(row.vendor_id) ?? [];
    rows.push(row);
    map.set(row.vendor_id, rows);
    return map;
  }, new Map<string, VendorAvailabilityRow[]>());
}

function toServiceName(value: string): ServiceName {
  return allServices.includes(value as ServiceName)
    ? (value as ServiceName)
    : "Staffing";
}

function toPricingModel(service: VendorServiceRow): PricingModel {
  if (service.pricing_type === "hourly") {
    const hourlyRate = Number(service.hourly_rate ?? service.base_price ?? 0);
    const minHours = Number(service.minimum_hours ?? 1);

    return {
      hourlyRate,
      kind: "hourly",
      label: `$${hourlyRate.toLocaleString()} / hour, ${minHours} hour minimum`,
      minHours,
      setupFee: Number(service.setup_fee ?? 0),
    };
  }

  if (service.pricing_type === "per_guest") {
    const perGuest = Number(service.base_price ?? 0);

    return {
      kind: "perGuest",
      label: `$${perGuest.toLocaleString()} / guest`,
      minimum: perGuest,
      perGuest,
      serviceFee: Number(service.setup_fee ?? 0),
    };
  }

  const basePrice = Number(service.base_price ?? 0);

  return {
    basePrice,
    kind: "flat",
    label: `$${basePrice.toLocaleString()} flat estimate`,
  };
}

function toAvailabilityWindows(
  availability: VendorAvailabilityRow[],
): AvailabilityWindow[] {
  const availableWindows = availability.filter((row) => row.status === "available");

  if (!availableWindows.length) {
    return [
      {
        days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        end: "23:00",
        start: "08:00",
      },
    ];
  }

  return availableWindows.map((row) => ({
    days: [
      new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(
        new Date(`${row.date}T12:00:00`),
      ),
    ],
    end: String(row.end_time).slice(0, 5),
    start: String(row.start_time).slice(0, 5),
  }));
}

function priceLabel(pricing: PricingModel) {
  if (pricing.kind === "flat") {
    return `$${pricing.basePrice.toLocaleString()} estimate`;
  }

  if (pricing.kind === "hourly") {
    const total = pricing.hourlyRate * pricing.minHours + (pricing.setupFee ?? 0);

    return `$${total.toLocaleString()} / ${pricing.minHours} hours`;
  }

  return `$${pricing.perGuest.toLocaleString()} / guest`;
}

function numericId(value: string) {
  return (
    Array.from(value).reduce(
      (hash, character) => (hash * 31 + character.charCodeAt(0)) % 900000,
      100000,
    ) + 100000
  );
}
