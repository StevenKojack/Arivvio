import { coverageProviders } from "./demo-provider-coverage";
export type EventType =
  | "Birthday"
  | "Wedding"
  | "Graduation"
  | "Corporate"
  | "Seminar"
  | "Convention"
  | "Funeral"
  | "Baby Shower"
  | "Fundraiser"
  | "Private Party";

export type ServiceName =
  | "Venue"
  | "Catering"
  | "Cake & Desserts"
  | "DJ"
  | "Live Music"
  | "Magic"
  | "Character Performers"
  | "Balloons"
  | "Bounce Houses"
  | "Photo Booth"
  | "Rentals"
  | "Invitations"
  | "Photography"
  | "Florals"
  | "AV Production"
  | "Registration"
  | "Printed Materials"
  | "Printed Programs"
  | "Live Streaming"
  | "Transportation"
  | "Party Bus"
  | "Valet"
  | "Security"
  | "Staffing"
  | "Bartending"
  | "Cleaning"
  | "Booth Rentals"
  | "Portable Restrooms";

export type Coordinates = {
  lat: number;
  lng: number;
};

export type PricingModel =
  | {
      kind: "flat";
      setupFee?: number;
      travelFee?: number;
      basePrice: number;
      label: string;
    }
  | {
      kind: "hourly";
      travelFee?: number;
      hourlyRate: number;
      minHours: number;
      setupFee?: number;
      label: string;
    }
  | {
      kind: "perGuest";
      travelFee?: number;
      perGuest: number;
      minimum: number;
      serviceFee?: number;
      label: string;
    };

export type AvailabilityWindow = {
  days: string[];
  start: string;
  end: string;
};

export type MarketplaceServiceOption = {
  description: string;
  estimateLabel: string;
  priceAdjustment?: number;
  service: ServiceName;
  serviceId?: string | null;
  title: string;
};

export type MarketplaceItem = {
  pricingKnown?: boolean;
  coordinatesKnown?: boolean;
  verificationStatus?: string;
  listingState?: "demo" | "unclaimed" | "claimed";
  provenance?: { sourceUrl: string; retrievedAt: string; permittedUse: string; fields: string[] }[];
  claimedAt?: string;

  marketplaceRules?: import("@/lib/vendor-demo/model").MarketplaceRules;
  sourceKey?: string;
  id: number;
  databaseSource?: boolean;
  name: string;
  type: ServiceName;
  location: string;
  photoUrl?: string | null;
  profileImageUrl?: string;
  galleryUrls?: string[];
  address: string;
  coordinates: Coordinates;
  price: string;
  capacity?: string;
  rating: number;
  events: EventType[];
  services: ServiceName[];
  description: string;
  pricing: PricingModel;
  availability: AvailabilityWindow[];
  blockedDates?: string[];
  sourceLabel: string;
  sourceUrl: string;
  serviceOptions?: MarketplaceServiceOption[];
  serviceRadiusMiles?: number;
  vendorId?: string | null;
  serviceId?: string | null;
  venueId?: string | null;
  averageResponseMinutes?: number;
  budgetTier?: "economy" | "standard" | "premium" | "luxury";
  cultures?: string[];
  languages?: string[];
  maxGuestCount?: number;
  minGuestCount?: number;
  repeatClientRate?: number;
  reviewCount?: number;
  tags?: string[];
};

export type QuoteContext = {
  date?: string;
  durationHours: number;
  endTime?: string;
  guests: number;
  startTime?: string;
};

export type EventPlanPreset = {
  recommended: ServiceName[];
  more: ServiceName[];
};

export type HomeArea = {
  name: string;
  coordinates: Coordinates;
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const weekend = ["Sat", "Sun"] as const;
const everyDay = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const eventTypes: EventType[] = [
  "Birthday",
  "Wedding",
  "Graduation",
  "Corporate",
  "Seminar",
  "Convention",
  "Funeral",
  "Baby Shower",
  "Fundraiser",
  "Private Party",
];

export const homeAreas: HomeArea[] = [
  { name: "Downtown Los Angeles", coordinates: { lat: 34.0407, lng: -118.2468 } },
  { name: "Hollywood", coordinates: { lat: 34.1016, lng: -118.3267 } },
  { name: "Mid-Wilshire", coordinates: { lat: 34.0617, lng: -118.3089 } },
  { name: "Pasadena", coordinates: { lat: 34.1478, lng: -118.1445 } },
  { name: "Santa Monica", coordinates: { lat: 34.0195, lng: -118.4912 } },
  { name: "Long Beach", coordinates: { lat: 33.7701, lng: -118.1937 } },
];

export const entertainmentServices: ServiceName[] = [
  "DJ",
  "Live Music",
  "Magic",
  "Character Performers",
  "Balloons",
  "Bounce Houses",
  "Photo Booth",
];

export const allServices: ServiceName[] = [
  "Venue",
  "Catering",
  "Cake & Desserts",
  ...entertainmentServices,
  "Rentals",
  "Invitations",
  "Photography",
  "Florals",
  "AV Production",
  "Registration",
  "Printed Materials",
  "Printed Programs",
  "Live Streaming",
  "Transportation",
  "Party Bus",
  "Valet",
  "Security",
  "Staffing",
  "Bartending",
  "Cleaning",
  "Booth Rentals",
  "Portable Restrooms",
];

export const eventPlanPresets: Record<EventType, EventPlanPreset> = {
  Birthday: {
    recommended: [
      "Venue",
      "Catering",
      "Cake & Desserts",
      "DJ",
      "Magic",
      "Character Performers",
      "Rentals",
      "Invitations",
      "Photography",
    ],
    more: [
      "Live Music",
      "Photo Booth",
      "Balloons",
      "Bounce Houses",
      "Florals",
      "AV Production",
      "Staffing",
    ],
  },
  Wedding: {
    recommended: [
      "Venue",
      "Catering",
      "Florals",
      "Photography",
      "Rentals",
      "Invitations",
      "Live Music",
      "DJ",
    ],
    more: [
      "Transportation",
      "Party Bus",
      "Valet",
      "Bartending",
      "AV Production",
      "Staffing",
      "Cake & Desserts",
    ],
  },
  Graduation: {
    recommended: [
      "Venue",
      "Catering",
      "Photography",
      "Rentals",
      "Invitations",
      "DJ",
      "Photo Booth",
    ],
    more: ["Live Music", "AV Production", "Transportation", "Party Bus", "Cake & Desserts", "Balloons"],
  },
  Corporate: {
    recommended: [
      "Venue",
      "Catering",
      "AV Production",
      "Rentals",
      "Photography",
      "Staffing",
    ],
    more: [
      "Live Music",
      "DJ",
      "Photo Booth",
      "Transportation",
      "Valet",
      "Registration",
      "Security",
    ],
  },
  Seminar: {
    recommended: [
      "Venue",
      "AV Production",
      "Registration",
      "Catering",
      "Printed Materials",
    ],
    more: ["Photography", "Staffing", "Transportation", "Valet", "Rentals"],
  },
  Convention: {
    recommended: [
      "Venue",
      "AV Production",
      "Booth Rentals",
      "Registration",
      "Staffing",
      "Catering",
    ],
    more: [
      "Photography",
      "Transportation",
      "Valet",
      "DJ",
      "Live Music",
      "Printed Materials",
      "Security",
      "Cleaning",
    ],
  },
  Funeral: {
    recommended: [
      "Venue",
      "Catering",
      "Florals",
      "Printed Programs",
      "Live Streaming",
      "Transportation",
    ],
    more: ["Photography", "AV Production", "Rentals", "Live Music", "Staffing", "Valet"],
  },
  "Baby Shower": {
    recommended: [
      "Venue",
      "Catering",
      "Cake & Desserts",
      "Florals",
      "Rentals",
      "Invitations",
      "Photography",
    ],
    more: ["Magic", "Character Performers", "Balloons", "Photo Booth", "Transportation"],
  },
  Fundraiser: {
    recommended: [
      "Venue",
      "Catering",
      "AV Production",
      "Invitations",
      "Live Music",
      "Staffing",
    ],
    more: [
      "DJ",
      "Photography",
      "Florals",
      "Registration",
      "Printed Materials",
      "Security",
      "Valet",
      "Cleaning",
    ],
  },
  "Private Party": {
    recommended: [
      "Venue",
      "Catering",
      "DJ",
      "Live Music",
      "Rentals",
      "Photography",
      "Invitations",
    ],
    more: [
      "Magic",
      "Character Performers",
      "Balloons",
      "Photo Booth",
      "Florals",
      "Staffing",
      "Bartending",
    ],
  },
};

export const marketplaceTypes = ["All", ...allServices] as const;

export function getHoursBetween(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const start = startHour * 60 + startMinute;
  let end = endHour * 60 + endMinute;

  if (end <= start) {
    end += 24 * 60;
  }

  return Math.max((end - start) / 60, 1);
}

export function getEndTime(startTime: string, durationHours: number) {
  const [hour, minute] = startTime.split(":").map(Number);
  const totalMinutes = hour * 60 + minute + durationHours * 60;
  const endHour = Math.floor(totalMinutes / 60) % 24;
  const endMinute = totalMinutes % 60;

  return `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
}

export function quoteItem(item: MarketplaceItem, context: QuoteContext) {
  const durationHours =
    context.startTime && context.endTime
      ? getHoursBetween(context.startTime, context.endTime)
      : context.durationHours;

  if (item.pricing.kind === "flat") {
    return item.pricing.basePrice + (item.pricing.setupFee ?? 0) + (item.pricing.travelFee ?? 0);
  }

  if (item.pricing.kind === "hourly") {
    const billableHours = Math.max(durationHours, item.pricing.minHours);

    return billableHours * item.pricing.hourlyRate + (item.pricing.setupFee ?? 0) + (item.pricing.travelFee ?? 0);
  }

  return Math.max(
    context.guests * item.pricing.perGuest + (item.pricing.serviceFee ?? 0),
    item.pricing.minimum,
  ) + (item.pricing.travelFee ?? 0);
}

export function isAvailableAt(
  item: MarketplaceItem,
  date?: string,
  startTime?: string,
  endTime?: string,
) {
  if (!item.availability.length || item.listingState === "unclaimed") return false;
  if (!date || !startTime) {
    return true;
  }

  if (item.blockedDates?.includes(date)) {
    return false;
  }

  const day = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(
    new Date(`${date}T12:00:00`),
  );
  const serviceEnd = endTime ?? startTime;

  return item.availability.some(
    (window) =>
      window.days.includes(day) &&
      startTime >= window.start &&
      serviceEnd <= window.end,
  );
}

export function getDistanceMiles(from: Coordinates, to: Coordinates) {
  const milesPerDegreeLat = 69;
  const milesPerDegreeLng = 54.6;
  const latMiles = (from.lat - to.lat) * milesPerDegreeLat;
  const lngMiles = (from.lng - to.lng) * milesPerDegreeLng;

  return Math.sqrt(latMiles * latMiles + lngMiles * lngMiles);
}

export function estimateDriveMinutes(from: Coordinates, to: Coordinates) {
  return Math.round(getDistanceMiles(from, to) * 2.4 + 8);
}

const demoFixtures: MarketplaceItem[] = [
  ...coverageProviders,
  {
    id: 1,
    name: "Marigold Lantern Hall",
    type: "Venue",
    location: "Mid-Wilshire, Los Angeles",
    address: "Mid-Wilshire, Los Angeles",
    coordinates: { lat: 34.0607, lng: -118.3246 },
    price: "$5,500 estimate",
    capacity: "1,238 theatre seats",
    rating: 0,
    events: ["Wedding", "Corporate", "Fundraiser", "Private Party"],
    services: ["Venue"],
    description: "A fictional hall with a theatre-inspired dining room, flexible reception layouts and a quiet preparation suite. Explore a seated dinner or ceremony-to-reception package.",
    pricing: { kind: "flat", basePrice: 5500, label: "venue estimate" },
    availability: [{ days: [...everyDay], start: "08:00", end: "23:00" }],
    budgetTier: "premium",
    maxGuestCount: 1200,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["wedding", "corporate", "gala", "formal", "historic", "theatre"],
  },
  {
    id: 2,
    name: "Crescent Loom Pavilion",
    type: "Venue",
    location: "University Park, Los Angeles",
    address: "University Park, Los Angeles",
    coordinates: { lat: 34.0237, lng: -118.2811 },
    price: "$8,400 estimate",
    capacity: "Large auditorium and expo hall",
    rating: 0,
    events: ["Convention", "Corporate", "Seminar", "Fundraiser", "Graduation"],
    services: ["Venue", "AV Production", "Booth Rentals"],
    description: "A fictional pavilion for large exhibits and company gatherings, with sample stage, registration and production packages.",
    pricing: { kind: "flat", basePrice: 8400, label: "large venue estimate" },
    availability: [{ days: [...everyDay], start: "08:00", end: "22:00" }],
    budgetTier: "premium",
    maxGuestCount: 6000,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["conference", "convention", "expo", "graduation", "av", "large-format"],
  },
  {
    id: 3,
    name: "Velvet Acorn Supper Club",
    type: "Venue",
    location: "Hollywood, Los Angeles",
    address: "Hollywood, Los Angeles",
    coordinates: { lat: 34.1046, lng: -118.3427 },
    price: "$3,200 estimate",
    capacity: "Private groups",
    rating: 0,
    events: ["Birthday", "Private Party", "Corporate", "Fundraiser"],
    services: ["Venue", "Magic", "Catering"],
    description: "A fictional supper club pairing intimate dinner layouts with close-up magic and a small performance stage.",
    pricing: { kind: "flat", basePrice: 3200, label: "private group estimate" },
    availability: [{ days: [...everyDay], start: "17:00", end: "23:30" }],
    budgetTier: "premium",
    maxGuestCount: 300,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    serviceOptions: [
      {
        description: "Fictional venue experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
        estimateLabel: "$3,200 venue estimate",
        service: "Venue",
        title: "Venue access",
      },
      {
        description: "Fictional venue experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
        estimateLabel: "$950 show package estimate",
        priceAdjustment: -2250,
        service: "Magic",
        title: "Entertainment/show package",
      },
      {
        description: "Fictional venue experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
        estimateLabel: "$115 / guest estimate",
        priceAdjustment: 1400,
        service: "Catering",
        title: "Dining package",
      },
    ],
    tags: ["birthday", "magic", "private-party", "entertainment", "dining"],
  },
  {
    id: 4,
    name: "Juniper Kiln Courtyard",
    type: "Venue",
    location: "Culver City, CA",
    address: "Culver City, CA",
    coordinates: { lat: 34.0319, lng: -118.3777 },
    price: "$4,900 estimate",
    capacity: "Indoor-outdoor venue",
    rating: 0,
    events: ["Wedding", "Corporate", "Private Party", "Fundraiser"],
    services: ["Venue"],
    description: "A fictional courtyard with greenery, lounge corners and a flexible indoor rain plan for relaxed celebrations.",
    pricing: { kind: "flat", basePrice: 4900, label: "venue estimate" },
    availability: [{ days: [...everyDay], start: "09:00", end: "23:00" }],
    budgetTier: "premium",
    maxGuestCount: 250,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["wedding", "corporate", "indoor-outdoor", "sustainable", "private-party"],
  },
  {
    id: 5,
    name: "Saffron Fold Catering",
    type: "Catering",
    location: "Beverly Grove, Los Angeles",
    address: "Beverly Grove, Los Angeles",
    coordinates: { lat: 34.0811, lng: -118.3824 },
    price: "$115 / guest estimate",
    rating: 0,
    events: ["Wedding", "Corporate", "Fundraiser", "Birthday", "Private Party"],
    services: ["Catering", "Staffing"],
    description: "A fictional kitchen pairing seasonal plated menus with family-style sharing dishes. Sample packages include menu planning and service coordination.",
    pricing: { kind: "perGuest", perGuest: 115, minimum: 2500, label: "per guest estimate" },
    availability: [{ days: [...everyDay], start: "08:00", end: "23:00" }],
    averageResponseMinutes: 240,
    budgetTier: "luxury",
    maxGuestCount: 1200,
    minGuestCount: 25,
    repeatClientRate: 72,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["catering", "premium", "wedding", "corporate", "gala", "staffing"],
  },
  {
    id: 6,
    name: "Cadence Orchard DJs",
    type: "DJ",
    location: "Santa Monica, CA",
    address: "Santa Monica, CA",
    coordinates: { lat: 34.0278, lng: -118.4712 },
    price: "$300 / 3 hours estimate",
    rating: 0,
    events: ["Birthday", "Wedding", "Graduation", "Corporate", "Private Party"],
    services: ["DJ", "AV Production"],
    description: "A fictional DJ collective offering ceremony sound, dinner sets and a dance-floor finale with a dedicated emcee option.",
    pricing: { kind: "hourly", hourlyRate: 100, minHours: 3, label: "$300 for 3 hours estimate" },
    availability: [
      { days: [...weekdays], start: "14:00", end: "23:00" },
      { days: [...weekend], start: "10:00", end: "23:30" },
    ],
    averageResponseMinutes: 120,
    budgetTier: "standard",
    maxGuestCount: 400,
    repeatClientRate: 68,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["dj", "dance", "birthday", "graduation", "wedding", "corporate", "mc"],
  },
  {
    id: 7,
    name: "Prism Loom Production",
    type: "AV Production",
    location: "Glendale, CA",
    address: "Glendale, CA",
    coordinates: { lat: 34.1467, lng: -118.2551 },
    price: "$180 / hour estimate",
    rating: 0,
    events: ["Corporate", "Convention", "Seminar", "Wedding", "Private Party"],
    services: ["AV Production", "Live Streaming", "Rentals"],
    description: "A fictional production studio combining clear speech audio, warm room lighting and projection for presentations and celebrations.",
    pricing: { kind: "hourly", hourlyRate: 180, minHours: 3, setupFee: 250, label: "production crew estimate" },
    availability: [{ days: [...everyDay], start: "07:00", end: "23:00" }],
    averageResponseMinutes: 180,
    budgetTier: "premium",
    maxGuestCount: 1000,
    repeatClientRate: 61,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["av", "conference", "seminar", "trade-show", "live-streaming", "production"],
  },
  {
    id: 8,
    name: "Paper Kite Event Rentals",
    type: "Rentals",
    location: "North Hollywood, CA",
    address: "North Hollywood, CA",
    coordinates: { lat: 34.1722, lng: -118.379 },
    price: "$1,250 estimate",
    rating: 0,
    events: ["Birthday", "Baby Shower", "Private Party", "Wedding", "Corporate"],
    services: ["Rentals", "Photo Booth", "Staffing"],
    description: "A fictional rental workshop with modular lounge furniture, playful tabletop details and delivery-window planning.",
    pricing: { kind: "flat", basePrice: 1250, label: "rental package estimate" },
    availability: [{ days: [...everyDay], start: "07:00", end: "20:00" }],
    averageResponseMinutes: 300,
    budgetTier: "standard",
    maxGuestCount: 300,
    repeatClientRate: 58,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["rentals", "photo-booth", "birthday", "party", "family-friendly", "corporate"],
  },
  {
    id: 9,
    name: "Cloudberry Ribbon Cakes",
    type: "Cake & Desserts",
    location: "Silver Lake, Los Angeles",
    address: "Silver Lake, Los Angeles",
    coordinates: { lat: 34.0852, lng: -118.2755 },
    price: "$380 estimate",
    rating: 0,
    events: ["Birthday", "Wedding", "Baby Shower", "Graduation", "Private Party"],
    services: ["Cake & Desserts"],
    description: "A fictional bakery designing layered celebration cakes and small dessert tastings, with sample size and finish options.",
    pricing: { kind: "flat", basePrice: 380, label: "custom dessert estimate" },
    availability: [{ days: [...weekdays, ...weekend], start: "09:00", end: "18:00" }],
    averageResponseMinutes: 360,
    budgetTier: "standard",
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["cake", "dessert", "birthday", "baby-shower", "wedding", "custom"],
  },
  {
    id: 10,
    name: "Gathergrain Rentals",
    type: "Rentals",
    location: "Van Nuys, CA",
    address: "Van Nuys, CA",
    coordinates: { lat: 34.2116, lng: -118.4793 },
    price: "$1,600 estimate",
    rating: 0,
    events: ["Wedding", "Corporate", "Private Party", "Birthday", "Fundraiser"],
    services: ["Rentals"],
    description: "A fictional rental collection of dining chairs, linens and table settings for dinners of different sizes.",
    pricing: { kind: "flat", basePrice: 1600, label: "rental order estimate" },
    availability: [{ days: [...everyDay], start: "07:00", end: "20:00" }],
    averageResponseMinutes: 240,
    budgetTier: "premium",
    maxGuestCount: 800,
    repeatClientRate: 65,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["rentals", "wedding", "corporate", "gala", "tables", "seating"],
  },
  {
    id: 11,
    name: "Moss & Ribbon Florals",
    type: "Florals",
    location: "Sherman Oaks, CA",
    address: "Sherman Oaks, CA",
    coordinates: { lat: 34.1485, lng: -118.4357 },
    price: "$900 estimate",
    rating: 0,
    events: ["Wedding", "Baby Shower", "Funeral", "Fundraiser", "Private Party"],
    services: ["Florals"],
    description: "A fictional floral atelier creating seasonal centerpieces, ceremony arrangements and reusable reception installations.",
    pricing: { kind: "flat", basePrice: 900, label: "floral design estimate" },
    availability: [{ days: [...everyDay], start: "07:00", end: "18:00" }],
    averageResponseMinutes: 420,
    budgetTier: "premium",
    repeatClientRate: 70,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["florals", "wedding", "funeral", "memorial", "baby-shower", "gala"],
  },
  {
    id: 12,
    name: "Pocket Comet Magic",
    type: "Magic",
    location: "Hollywood, Los Angeles",
    address: "Hollywood, Los Angeles",
    coordinates: { lat: 34.1019, lng: -118.3269 },
    price: "$275 / hour estimate",
    rating: 0,
    events: ["Birthday", "Baby Shower", "Private Party", "Corporate"],
    services: ["Magic"],
    description: "A fictional magician offering family stage shows and walk-around sets tailored to the sample event schedule.",
    pricing: { kind: "hourly", hourlyRate: 275, minHours: 1, label: "magic performance estimate" },
    availability: [{ days: [...weekend], start: "10:00", end: "20:00" }],
    averageResponseMinutes: 480,
    budgetTier: "standard",
    maxGuestCount: 120,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["magic", "birthday", "family-friendly", "kids", "entertainment"],
  },
  {
    id: 13,
    name: "Storyfern Characters",
    type: "Character Performers",
    location: "Burbank, CA",
    address: "Burbank, CA",
    coordinates: { lat: 34.1808, lng: -118.309 },
    price: "$150 / hour estimate",
    rating: 0,
    events: ["Birthday", "Baby Shower", "Private Party"],
    services: ["Character Performers"],
    description: "A fictional character team bringing story time, games and themed entrances to children’s celebrations.",
    pricing: { kind: "hourly", hourlyRate: 150, minHours: 2, label: "character performer estimate" },
    availability: [{ days: [...weekend], start: "09:00", end: "19:00" }],
    averageResponseMinutes: 480,
    budgetTier: "standard",
    maxGuestCount: 80,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["character", "kids", "birthday", "family-friendly", "costume", "entertainment"],
  },
  {
    id: 14,
    name: "Frameberry Photo Booths",
    type: "Photo Booth",
    location: "Culver City, CA",
    address: "Culver City, CA",
    coordinates: { lat: 34.0211, lng: -118.3965 },
    price: "$500 / 3 hours estimate",
    rating: 0,
    events: ["Birthday", "Wedding", "Graduation", "Corporate", "Private Party"],
    services: ["Photo Booth"],
    description: "A fictional photo-booth studio with simple backdrops, digital strips and a sample guest-gallery experience.",
    pricing: { kind: "hourly", hourlyRate: 125, minHours: 3, setupFee: 125, label: "booth rental estimate" },
    availability: [{ days: [...everyDay], start: "10:00", end: "23:00" }],
    averageResponseMinutes: 360,
    budgetTier: "standard",
    maxGuestCount: 500,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["photo-booth", "birthday", "wedding", "graduation", "corporate", "party"],
  },
  {
    id: 15,
    name: "Tumble Orchard Play Loft",
    type: "Venue",
    location: "El Segundo, CA",
    address: "El Segundo, CA",
    coordinates: { lat: 33.9236, lng: -118.3948 },
    price: "$950 estimate",
    capacity: "Private kids party venue",
    rating: 0,
    events: ["Birthday", "Private Party", "Baby Shower"],
    services: ["Venue", "Character Performers", "Catering"],
    description: "Fictional venue experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
    pricing: { kind: "flat", basePrice: 950, label: "private party package estimate" },
    availability: [{ days: [...everyDay], start: "10:00", end: "20:00" }],
    averageResponseMinutes: 260,
    budgetTier: "standard",
    maxGuestCount: 120,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    serviceOptions: [
      {
        description: "Fictional venue experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
        estimateLabel: "$950 venue estimate",
        service: "Venue",
        title: "Kids party venue",
      },
      {
        description: "Fictional venue experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
        estimateLabel: "$420 play package estimate",
        priceAdjustment: -530,
        service: "Character Performers",
        title: "Bounce/play entertainment",
      },
      {
        description: "Fictional venue experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
        estimateLabel: "$240 host package estimate",
        priceAdjustment: -710,
        service: "Staffing",
        title: "Party host package",
      },
    ],
    tags: ["kids", "birthday", "indoor-play", "family-friendly", "private-party"],
  },
  {
    id: 16,
    name: "Copper Circuit Raceway",
    type: "Venue",
    location: "Sylmar, CA",
    address: "Sylmar, CA",
    coordinates: { lat: 34.3203, lng: -118.4992 },
    price: "$1,450 estimate",
    capacity: "Racing parties and corporate groups",
    rating: 0,
    events: ["Birthday", "Corporate", "Graduation", "Private Party"],
    services: ["Venue", "Catering", "Staffing", "Character Performers"],
    description: "Fictional venue experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
    pricing: { kind: "flat", basePrice: 1450, label: "group racing estimate" },
    availability: [{ days: [...everyDay], start: "11:00", end: "22:00" }],
    averageResponseMinutes: 300,
    budgetTier: "standard",
    maxGuestCount: 180,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    serviceOptions: [
      {
        description: "Fictional venue experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
        estimateLabel: "$1,450 venue estimate",
        service: "Venue",
        title: "Party venue",
      },
      {
        description: "Fictional venue experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
        estimateLabel: "$900 activity estimate",
        priceAdjustment: -550,
        service: "Character Performers",
        title: "Go-kart entertainment",
      },
      {
        description: "Fictional venue experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
        estimateLabel: "$32 / guest estimate",
        priceAdjustment: 450,
        service: "Catering",
        title: "Food package",
      },
    ],
    tags: ["racing", "activity", "birthday", "corporate", "team-event"],
  },
  {
    id: 17,
    name: "Aster Loom Ballroom",
    type: "Venue",
    location: "Pasadena, CA",
    address: "Pasadena, CA",
    coordinates: { lat: 34.1456, lng: -118.144 },
    price: "$4,200 estimate",
    capacity: "Ballroom and terrace events",
    rating: 0,
    events: ["Wedding", "Corporate", "Baby Shower", "Fundraiser", "Private Party"],
    services: ["Venue", "Catering", "AV Production"],
    description: "Fictional venue experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
    pricing: { kind: "flat", basePrice: 4200, label: "banquet venue estimate" },
    availability: [{ days: [...everyDay], start: "09:00", end: "23:30" }],
    averageResponseMinutes: 240,
    budgetTier: "premium",
    maxGuestCount: 350,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    serviceOptions: [
      {
        description: "Fictional venue experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
        estimateLabel: "$4,200 venue estimate",
        service: "Venue",
        title: "Venue package",
      },
      {
        description: "Fictional venue experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
        estimateLabel: "$95 / guest estimate",
        priceAdjustment: 1800,
        service: "Catering",
        title: "Catering package",
      },
      {
        description: "Fictional venue experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
        estimateLabel: "$850 production estimate",
        priceAdjustment: -3350,
        service: "AV Production",
        title: "AV package",
      },
    ],
    tags: ["banquet", "wedding", "ballroom", "pasadena", "formal"],
  },
  {
    id: 18,
    name: "Sunthread Reception Hall",
    type: "Venue",
    location: "Hollywood, Los Angeles",
    address: "Hollywood, Los Angeles",
    coordinates: { lat: 34.0935, lng: -118.3265 },
    price: "$7,200 estimate",
    capacity: "Grand ballroom",
    rating: 0,
    events: ["Wedding", "Fundraiser", "Corporate", "Convention", "Private Party"],
    services: ["Venue", "Catering", "AV Production", "Staffing"],
    description: "Fictional venue experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
    pricing: { kind: "flat", basePrice: 7200, label: "premium ballroom estimate" },
    availability: [{ days: [...everyDay], start: "09:00", end: "23:30" }],
    averageResponseMinutes: 180,
    budgetTier: "luxury",
    maxGuestCount: 500,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    serviceOptions: [
      {
        description: "Fictional venue experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
        estimateLabel: "$7,200 venue estimate",
        service: "Venue",
        title: "Ballroom venue",
      },
      {
        description: "Fictional venue experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
        estimateLabel: "$135 / guest estimate",
        priceAdjustment: 2800,
        service: "Catering",
        title: "Banquet catering",
      },
      {
        description: "Fictional venue experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
        estimateLabel: "$2,400 decor package estimate",
        priceAdjustment: -4800,
        service: "AV Production",
        title: "Decor and production package",
      },
    ],
    tags: ["banquet", "wedding", "gala", "hollywood", "luxury"],
  },
  {
    id: 19,
    name: "Canyon Paper Terrace",
    type: "Venue",
    location: "Burbank, CA",
    address: "Burbank, CA",
    coordinates: { lat: 34.1978, lng: -118.3037 },
    price: "$5,900 estimate",
    capacity: "Hilltop restaurant and event spaces",
    rating: 0,
    events: ["Wedding", "Corporate", "Fundraiser", "Private Party", "Graduation"],
    services: ["Venue", "Catering", "Staffing"],
    description: "Fictional venue experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
    pricing: { kind: "flat", basePrice: 5900, label: "event space estimate" },
    availability: [{ days: [...everyDay], start: "10:00", end: "23:00" }],
    averageResponseMinutes: 220,
    budgetTier: "premium",
    maxGuestCount: 450,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["venue", "views", "restaurant", "wedding", "corporate"],
  },
  {
    id: 20,
    name: "Olive Notebook Kitchen",
    type: "Catering",
    location: "East Hollywood, Los Angeles",
    address: "East Hollywood, Los Angeles",
    coordinates: { lat: 34.0904, lng: -118.2826 },
    price: "$78 / guest estimate",
    rating: 0,
    events: ["Wedding", "Corporate", "Baby Shower", "Fundraiser", "Private Party"],
    services: ["Catering", "Staffing"],
    description: "Fictional catering experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
    pricing: { kind: "perGuest", perGuest: 78, minimum: 1800, serviceFee: 250, label: "per guest estimate" },
    availability: [{ days: [...everyDay], start: "08:00", end: "23:00" }],
    averageResponseMinutes: 180,
    budgetTier: "premium",
    maxGuestCount: 400,
    minGuestCount: 20,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["catering", "seasonal", "wedding", "corporate", "private-dining"],
  },
  {
    id: 21,
    name: "Supper Finch Catering",
    type: "Catering",
    location: "Santa Monica, CA",
    address: "Santa Monica, CA",
    coordinates: { lat: 34.022, lng: -118.4814 },
    price: "$64 / guest estimate",
    rating: 0,
    events: ["Wedding", "Corporate", "Fundraiser", "Birthday", "Private Party"],
    services: ["Catering", "Staffing"],
    description: "Fictional catering experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
    pricing: { kind: "perGuest", perGuest: 64, minimum: 1600, serviceFee: 200, label: "per guest estimate" },
    availability: [{ days: [...everyDay], start: "08:00", end: "23:00" }],
    averageResponseMinutes: 210,
    budgetTier: "standard",
    maxGuestCount: 800,
    minGuestCount: 25,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["catering", "corporate", "wedding", "buffet", "staffing"],
  },
  {
    id: 22,
    name: "Turntable Meadow DJs",
    type: "DJ",
    location: "Long Beach, CA",
    address: "Long Beach, CA",
    coordinates: { lat: 33.7879, lng: -118.1704 },
    price: "$425 / 3 hours estimate",
    rating: 0,
    events: ["Birthday", "Wedding", "Graduation", "Corporate", "Private Party"],
    services: ["DJ", "AV Production"],
    description: "Fictional dj experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
    pricing: { kind: "hourly", hourlyRate: 125, minHours: 3, setupFee: 50, label: "mobile DJ estimate" },
    availability: [
      { days: [...weekdays], start: "16:00", end: "23:00" },
      { days: [...weekend], start: "11:00", end: "23:30" },
    ],
    averageResponseMinutes: 160,
    budgetTier: "standard",
    maxGuestCount: 350,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["dj", "long-beach", "mobile", "wedding", "birthday"],
  },
  {
    id: 23,
    name: "Lanternwood Sessions",
    type: "Live Music",
    location: "Downtown Los Angeles",
    address: "Downtown Los Angeles",
    coordinates: { lat: 34.0449, lng: -118.2553 },
    price: "$650 estimate",
    rating: 0,
    events: ["Wedding", "Fundraiser", "Corporate", "Private Party", "Funeral"],
    services: ["Live Music"],
    description: "Fictional live music experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
    pricing: { kind: "flat", basePrice: 650, label: "live music estimate" },
    availability: [{ days: [...everyDay], start: "10:00", end: "22:00" }],
    averageResponseMinutes: 420,
    budgetTier: "standard",
    maxGuestCount: 260,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["live-music", "jazz", "acoustic", "reception", "ceremony"],
  },
  {
    id: 24,
    name: "Quiet Prism Photography",
    type: "Photography",
    location: "Culver City, CA",
    address: "Culver City, CA",
    coordinates: { lat: 34.0059, lng: -118.4117 },
    price: "$1,200 estimate",
    rating: 0,
    events: ["Wedding", "Birthday", "Baby Shower", "Corporate", "Private Party"],
    services: ["Photography", "Photo Booth"],
    description: "A fictional photography studio capturing candid arrivals, family portraits and the small details between. Sample coverage includes an edited gallery.",
    pricing: { kind: "flat", basePrice: 1200, label: "event photo estimate" },
    availability: [{ days: [...everyDay], start: "09:00", end: "23:00" }],
    averageResponseMinutes: 200,
    budgetTier: "premium",
    maxGuestCount: 500,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["photography", "event-coverage", "portraits", "wedding", "corporate"],
  },
  {
    id: 25,
    name: "Fern Letter Florals",
    type: "Florals",
    location: "Downtown Los Angeles",
    address: "Downtown Los Angeles",
    coordinates: { lat: 34.0398, lng: -118.2492 },
    price: "$650 estimate",
    rating: 0,
    events: ["Wedding", "Baby Shower", "Funeral", "Birthday", "Fundraiser"],
    services: ["Florals"],
    description: "Fictional florals experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
    pricing: { kind: "flat", basePrice: 650, label: "event florals estimate" },
    availability: [{ days: [...everyDay], start: "07:00", end: "18:00" }],
    averageResponseMinutes: 300,
    budgetTier: "standard",
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["florals", "flower-district", "wedding", "memorial", "baby-shower"],
  },
  {
    id: 26,
    name: "Clearwatch Event Crew",
    type: "Security",
    location: "Los Angeles, CA",
    address: "Los Angeles, CA",
    coordinates: { lat: 34.0618, lng: -118.3005 },
    price: "$90 / hour estimate",
    rating: 0,
    events: ["Corporate", "Convention", "Fundraiser", "Private Party", "Wedding"],
    services: ["Security", "Staffing"],
    description: "A fictional event security team demonstrating entry coordination, guest guidance and event-plan review. Credentials and staffing shown here are illustrative.",
    pricing: { kind: "hourly", hourlyRate: 90, minHours: 4, label: "security staff estimate" },
    availability: [{ days: [...everyDay], start: "07:00", end: "23:30" }],
    averageResponseMinutes: 180,
    budgetTier: "standard",
    maxGuestCount: 2000,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["security", "staffing", "access-control", "corporate", "large-event"],
  },
  {
    id: 27,
    name: "Freshfield Comfort Rentals",
    type: "Portable Restrooms",
    location: "Commerce, CA",
    address: "Commerce, CA",
    coordinates: { lat: 34.0006, lng: -118.1598 },
    price: "$725 estimate",
    rating: 0,
    events: ["Convention", "Fundraiser", "Corporate", "Private Party", "Graduation"],
    services: ["Portable Restrooms", "Staffing"],
    description: "A fictional comfort rental team demonstrating restroom placement, delivery access and pickup planning for outdoor gatherings.",
    pricing: { kind: "flat", basePrice: 725, label: "restroom logistics estimate" },
    availability: [{ days: [...everyDay], start: "06:00", end: "20:00" }],
    averageResponseMinutes: 360,
    budgetTier: "standard",
    maxGuestCount: 3000,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["restrooms", "logistics", "outdoor", "large-event", "delivery"],
  },
  {
    id: 28,
    name: "Birchfold Event Supply",
    type: "Rentals",
    location: "Inglewood, CA",
    address: "Inglewood, CA",
    coordinates: { lat: 33.9617, lng: -118.3531 },
    price: "$1,150 estimate",
    rating: 0,
    events: ["Wedding", "Birthday", "Baby Shower", "Corporate", "Private Party"],
    services: ["Rentals", "Booth Rentals"],
    description: "A fictional rental collection focused on ceremony seating, dinner tables and coordinated setup.",
    pricing: { kind: "flat", basePrice: 1150, label: "rental package estimate" },
    availability: [{ days: [...everyDay], start: "07:00", end: "20:00" }],
    averageResponseMinutes: 240,
    budgetTier: "standard",
    maxGuestCount: 700,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["rentals", "tables", "chairs", "booth", "wedding", "party"],
  },
  {
    id: 29,
    name: "Balloon Almanac",
    type: "Balloons",
    location: "Los Angeles, CA",
    address: "Los Angeles, CA",
    coordinates: { lat: 34.0764, lng: -118.2607 },
    price: "$750 estimate",
    rating: 0,
    events: ["Birthday", "Baby Shower", "Private Party", "Fundraiser", "Corporate"],
    services: ["Balloons", "Florals"],
    description: "A fictional balloon studio creating color-led garlands, entrance pieces and photo-corner installations.",
    pricing: { kind: "flat", basePrice: 750, label: "balloon install estimate" },
    availability: [{ days: [...everyDay], start: "08:00", end: "20:00" }],
    averageResponseMinutes: 360,
    budgetTier: "premium",
    maxGuestCount: 500,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["balloons", "decor", "birthday", "baby-shower", "installation"],
  },
  {
    id: 30,
    name: "Bounceberry Play Rentals",
    type: "Bounce Houses",
    location: "Los Angeles, CA",
    address: "Los Angeles, CA",
    coordinates: { lat: 34.0109, lng: -118.2913 },
    price: "$325 estimate",
    rating: 0,
    events: ["Birthday", "Baby Shower", "Private Party", "Fundraiser"],
    services: ["Bounce Houses", "Rentals"],
    description: "A fictional play-rental team offering inflatable activity packages with sample setup and supervision plans.",
    pricing: { kind: "flat", basePrice: 325, label: "inflatable rental estimate" },
    availability: [{ days: [...everyDay], start: "08:00", end: "20:00" }],
    averageResponseMinutes: 300,
    budgetTier: "economy",
    maxGuestCount: 160,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["bounce-house", "kids", "birthday", "backyard", "rentals"],
  },
  {
    id: 31,
    name: "Citrus Ledger Bar",
    type: "Bartending",
    location: "Los Angeles, CA",
    address: "Los Angeles, CA",
    coordinates: { lat: 34.056, lng: -118.3725 },
    price: "$65 / hour estimate",
    rating: 0,
    events: ["Wedding", "Corporate", "Fundraiser", "Private Party"],
    services: ["Bartending", "Staffing"],
    description: "A fictional bar team serving seasonal cocktails and alcohol-free drinks, with sample staffing and menu packages.",
    pricing: { kind: "hourly", hourlyRate: 65, minHours: 4, setupFee: 150, label: "bartending staff estimate" },
    availability: [{ days: [...everyDay], start: "10:00", end: "23:30" }],
    averageResponseMinutes: 240,
    budgetTier: "standard",
    maxGuestCount: 450,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["bartending", "bar-staff", "wedding", "private-party", "corporate"],
  },
  {
    id: 32,
    name: "Arrival Grove Valet",
    type: "Valet",
    location: "Los Angeles, CA",
    address: "Los Angeles, CA",
    coordinates: { lat: 34.0838, lng: -118.3537 },
    price: "$95 / hour estimate",
    rating: 0,
    events: ["Wedding", "Corporate", "Fundraiser", "Convention", "Private Party"],
    services: ["Valet", "Staffing"],
    description: "Fictional valet experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
    pricing: { kind: "hourly", hourlyRate: 95, minHours: 4, setupFee: 250, label: "valet team estimate" },
    availability: [{ days: [...everyDay], start: "08:00", end: "23:30" }],
    averageResponseMinutes: 240,
    budgetTier: "premium",
    maxGuestCount: 1000,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["valet", "parking", "guest-arrival", "wedding", "corporate"],
  },
  {
    id: 33,
    name: "Gatherlane Chauffeurs",
    type: "Transportation",
    location: "Los Angeles, CA",
    address: "Los Angeles, CA",
    coordinates: { lat: 33.9434, lng: -118.4081 },
    price: "$145 / hour estimate",
    rating: 0,
    events: ["Wedding", "Corporate", "Fundraiser", "Private Party", "Graduation"],
    services: ["Transportation"],
    description: "Fictional transportation experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
    pricing: { kind: "hourly", hourlyRate: 145, minHours: 3, label: "chauffeured vehicle estimate" },
    availability: [{ days: [...everyDay], start: "05:00", end: "23:30" }],
    averageResponseMinutes: 180,
    budgetTier: "premium",
    maxGuestCount: 40,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["transportation", "chauffeur", "vip", "airport", "wedding"],
  },
  {
    id: 34,
    name: "Night Orchard Party Coaches",
    type: "Party Bus",
    location: "Los Angeles, CA",
    address: "Los Angeles, CA",
    coordinates: { lat: 34.0428, lng: -118.3274 },
    price: "$190 / hour estimate",
    rating: 0,
    events: ["Birthday", "Wedding", "Graduation", "Private Party", "Corporate"],
    services: ["Party Bus", "Transportation"],
    description: "Fictional party bus experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
    pricing: { kind: "hourly", hourlyRate: 190, minHours: 4, label: "party bus estimate" },
    availability: [{ days: [...everyDay], start: "10:00", end: "23:30" }],
    averageResponseMinutes: 300,
    budgetTier: "standard",
    maxGuestCount: 45,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["party-bus", "transportation", "birthday", "graduation", "afterparty"],
  },
  {
    id: 35,
    name: "Tidy Lantern Crew",
    type: "Cleaning",
    location: "Los Angeles, CA",
    address: "Los Angeles, CA",
    coordinates: { lat: 34.0312, lng: -118.2508 },
    price: "$55 / hour estimate",
    rating: 0,
    events: ["Corporate", "Convention", "Fundraiser", "Private Party", "Graduation"],
    services: ["Cleaning", "Staffing"],
    description: "Fictional cleaning experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
    pricing: { kind: "hourly", hourlyRate: 55, minHours: 4, setupFee: 100, label: "cleaning crew estimate" },
    availability: [{ days: [...everyDay], start: "06:00", end: "23:30" }],
    averageResponseMinutes: 360,
    budgetTier: "standard",
    maxGuestCount: 1200,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["cleaning", "cleanup", "turnover", "staffing", "logistics"],
  },
  {
    id: 36,
    name: "Tortilla Meadow Kitchen",
    type: "Catering",
    location: "Los Angeles, CA",
    address: "Los Angeles, CA",
    coordinates: { lat: 34.0707, lng: -118.2076 },
    price: "$22 / guest estimate",
    rating: 0,
    events: ["Birthday", "Graduation", "Private Party", "Fundraiser", "Corporate"],
    services: ["Catering", "Staffing"],
    description: "Fictional catering experience with adaptable event packages, coordinated setup and a dedicated planning conversation. Explore the sample services and illustrative pricing below.",
    pricing: { kind: "perGuest", perGuest: 22, minimum: 950, serviceFee: 125, label: "taco cart estimate" },
    availability: [{ days: [...everyDay], start: "10:00", end: "23:00" }],
    averageResponseMinutes: 240,
    budgetTier: "economy",
    maxGuestCount: 400,
    minGuestCount: 35,
    reviewCount: 0,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["taco-cart", "catering", "birthday", "graduation", "casual"],
  },
  {
    id: 37,
    name: "Neon Circuit Social Club",
    type: "Venue",
    location: "Glendale, CA",
    address: "Glendale, CA",
    coordinates: { lat: 34.1425, lng: -118.2551 },
    price: "$1,650 demo estimate",
    capacity: "Up to 90 guests",
    rating: 0,
    events: ["Birthday", "Graduation", "Private Party", "Corporate"],
    services: ["Venue", "Catering", "AV Production"],
    description: "Demo activity venue with arcade play, lounge seating, food service, and flexible music for teen celebrations.",
    pricing: { kind: "flat", basePrice: 1650, label: "demo venue estimate" },
    availability: [{ days: [...everyDay], start: "10:00", end: "23:00" }],
    budgetTier: "standard",
    cultures: ["Armenian", "Latine"],
    maxGuestCount: 90,
    minGuestCount: 15,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["teen", "activity", "arcade", "birthday", "all-ages", "glendale"],
  },
  {
    id: 38,
    name: "Wonder Yard Playhouse",
    type: "Venue",
    location: "Pasadena, CA",
    address: "Pasadena, CA",
    coordinates: { lat: 34.1454, lng: -118.1267 },
    price: "$1,200 demo estimate",
    capacity: "Up to 70 guests",
    rating: 0,
    events: ["Birthday", "Baby Shower", "Private Party"],
    services: ["Venue", "Character Performers", "Bounce Houses"],
    description: "Demo indoor-outdoor play venue designed for children, family seating, simple catering, and character visits.",
    pricing: { kind: "flat", basePrice: 1200, label: "demo venue estimate" },
    availability: [{ days: [...everyDay], start: "09:00", end: "20:00" }],
    budgetTier: "standard",
    maxGuestCount: 70,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["kids", "children", "indoor-play", "outdoor", "family-friendly", "birthday"],
  },
  {
    id: 39,
    name: "Apricot Table Catering",
    type: "Catering",
    location: "Burbank, CA",
    address: "Burbank, CA",
    coordinates: { lat: 34.1808, lng: -118.309 },
    price: "$42 / guest demo estimate",
    rating: 0,
    events: ["Wedding", "Birthday", "Baby Shower", "Funeral", "Private Party"],
    services: ["Catering", "Staffing", "Cake & Desserts"],
    description: "Demo Armenian and Mediterranean catering for family celebrations, christenings, weddings, and memorial gatherings.",
    pricing: { kind: "perGuest", perGuest: 42, minimum: 1400, serviceFee: 180, label: "demo catering estimate" },
    availability: [{ days: [...everyDay], start: "08:00", end: "23:00" }],
    budgetTier: "standard",
    cultures: ["Armenian", "Mediterranean"],
    languages: ["English", "Armenian"],
    maxGuestCount: 450,
    minGuestCount: 25,
    serviceRadiusMiles: 35,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["armenian", "mediterranean", "christening", "wedding", "memorial", "family-style"],
  },
  {
    id: 40,
    name: "Luna Norte Celebration DJs",
    type: "DJ",
    location: "East Los Angeles, CA",
    address: "East Los Angeles, CA",
    coordinates: { lat: 34.0239, lng: -118.172 },
    price: "$185 / hour demo estimate",
    rating: 0,
    events: ["Birthday", "Wedding", "Graduation", "Private Party"],
    services: ["DJ", "AV Production"],
    description: "Demo bilingual DJ and emcee service for Quinceañeras, weddings, graduations, and milestone celebrations.",
    pricing: { kind: "hourly", hourlyRate: 185, minHours: 4, setupFee: 250, label: "demo DJ estimate" },
    availability: [{ days: [...weekend], start: "12:00", end: "23:30" }],
    budgetTier: "standard",
    cultures: ["Mexican", "Latine"],
    languages: ["English", "Spanish"],
    serviceRadiusMiles: 45,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["quinceanera", "latin-dj", "bilingual", "dance", "emcee", "milestone"],
  },
  {
    id: 41,
    name: "Ararat Ensemble",
    type: "Live Music",
    location: "North Hollywood, CA",
    address: "North Hollywood, CA",
    coordinates: { lat: 34.187, lng: -118.3813 },
    price: "$325 / hour demo estimate",
    rating: 0,
    events: ["Wedding", "Birthday", "Baby Shower", "Funeral", "Private Party"],
    services: ["Live Music"],
    description: "Demo Armenian ensemble for ceremonies, christenings, receptions, family celebrations, and respectful memorial music.",
    pricing: { kind: "hourly", hourlyRate: 325, minHours: 2, setupFee: 150, label: "demo ensemble estimate" },
    availability: [{ days: [...everyDay], start: "10:00", end: "22:00" }],
    budgetTier: "premium",
    cultures: ["Armenian"],
    languages: ["English", "Armenian"],
    serviceRadiusMiles: 40,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["armenian", "christening", "ceremony", "reception", "memorial", "traditional-music"],
  },
  {
    id: 42,
    name: "Gentle Table Hospitality",
    type: "Catering",
    location: "Culver City, CA",
    address: "Culver City, CA",
    coordinates: { lat: 34.0211, lng: -118.3965 },
    price: "$34 / guest demo estimate",
    rating: 0,
    events: ["Funeral", "Private Party", "Corporate"],
    services: ["Catering", "Staffing"],
    description: "Demo hospitality team for memorial receptions, celebrations of life, and calm family gatherings.",
    pricing: { kind: "perGuest", perGuest: 34, minimum: 1100, serviceFee: 140, label: "demo reception estimate" },
    availability: [{ days: [...everyDay], start: "08:00", end: "21:00" }],
    budgetTier: "standard",
    maxGuestCount: 300,
    minGuestCount: 20,
    serviceRadiusMiles: 35,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["funeral", "memorial", "celebration-of-life", "reception", "respectful", "family-gathering"],
  },
  {
    id: 43,
    name: "Nightline Sprinter Co.",
    type: "Party Bus",
    location: "Hollywood, CA",
    address: "Hollywood, CA",
    coordinates: { lat: 34.098, lng: -118.3295 },
    price: "$210 / hour demo estimate",
    rating: 0,
    events: ["Birthday", "Wedding", "Graduation", "Private Party"],
    services: ["Party Bus", "Transportation"],
    description: "Demo group transportation for bachelor and bachelorette routes, milestone birthdays, and multi-stop celebrations.",
    pricing: { kind: "hourly", hourlyRate: 210, minHours: 4, label: "demo sprinter estimate" },
    availability: [{ days: [...everyDay], start: "10:00", end: "23:30" }],
    budgetTier: "standard",
    maxGuestCount: 28,
    serviceRadiusMiles: 50,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["bachelor", "bachelorette", "party-bus", "sprinter", "multi-stop", "late-night"],
  },
  {
    id: 44,
    name: "Open Air Party Supply",
    type: "Rentals",
    location: "Van Nuys, CA",
    address: "Van Nuys, CA",
    coordinates: { lat: 34.1899, lng: -118.449 },
    price: "$950 demo package",
    rating: 0,
    events: ["Birthday", "Wedding", "Graduation", "Baby Shower", "Private Party"],
    services: ["Rentals", "Portable Restrooms", "Cleaning"],
    description: "Demo backyard package provider for tents, tables, chairs, shade, lighting, heaters, and cleanup support.",
    pricing: { kind: "flat", basePrice: 950, label: "demo backyard package" },
    availability: [{ days: [...everyDay], start: "06:00", end: "22:00" }],
    budgetTier: "standard",
    maxGuestCount: 500,
    serviceRadiusMiles: 45,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["backyard", "tables", "chairs", "tent", "shade", "lighting", "cleanup"],
  },
  {
    id: 45,
    name: "Brightside Creative Hosts",
    type: "Character Performers",
    location: "Long Beach, CA",
    address: "Long Beach, CA",
    coordinates: { lat: 33.7904, lng: -118.1582 },
    price: "$165 / hour demo estimate",
    rating: 0,
    events: ["Birthday", "Baby Shower", "Private Party", "Fundraiser"],
    services: ["Character Performers", "Magic", "Balloons"],
    description: "Demo creative entertainment with character visits, face painting, balloon art, bubble shows, and guided art activities.",
    pricing: { kind: "hourly", hourlyRate: 165, minHours: 2, label: "demo performer estimate" },
    availability: [{ days: [...everyDay], start: "09:00", end: "21:00" }],
    budgetTier: "standard",
    maxGuestCount: 180,
    serviceRadiusMiles: 40,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["kids", "character", "face-painting", "bubble-show", "painting-lesson", "balloon-artist"],
  },
  {
    id: 46,
    name: "Petal and Light Studio",
    type: "Florals",
    location: "Pasadena, CA",
    address: "Pasadena, CA",
    coordinates: { lat: 34.1519, lng: -118.1392 },
    price: "$780 demo estimate",
    rating: 0,
    events: ["Baby Shower", "Wedding", "Birthday", "Funeral", "Fundraiser"],
    services: ["Florals", "Balloons", "Rentals"],
    description: "Demo floral and soft decor studio for showers, intimate weddings, milestone tables, and memorial arrangements.",
    pricing: { kind: "flat", basePrice: 780, label: "demo floral estimate" },
    availability: [{ days: [...everyDay], start: "07:00", end: "20:00" }],
    budgetTier: "standard",
    serviceRadiusMiles: 35,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["baby-shower", "florals", "backdrop", "centerpieces", "memorial", "soft-decor"],
  },
  {
    id: 47,
    name: "Signal House Production",
    type: "AV Production",
    location: "Downtown Los Angeles, CA",
    address: "Downtown Los Angeles, CA",
    coordinates: { lat: 34.0449, lng: -118.2477 },
    price: "$1,850 demo estimate",
    rating: 0,
    events: ["Corporate", "Seminar", "Convention", "Fundraiser", "Graduation"],
    services: ["AV Production", "Live Streaming", "Registration", "Staffing"],
    description: "Demo production partner for presentations, microphones, projection, streaming, registration, and event staffing.",
    pricing: { kind: "flat", basePrice: 1850, label: "demo production estimate" },
    availability: [{ days: [...everyDay], start: "06:00", end: "23:00" }],
    budgetTier: "premium",
    maxGuestCount: 1500,
    serviceRadiusMiles: 60,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["corporate", "conference", "seminar", "av", "livestream", "registration", "production"],
  },
  {
    id: 48,
    name: "Sunset Sweets Cart",
    type: "Cake & Desserts",
    location: "Santa Monica, CA",
    address: "Santa Monica, CA",
    coordinates: { lat: 34.0242, lng: -118.4709 },
    price: "$650 demo estimate",
    rating: 0,
    events: ["Birthday", "Wedding", "Graduation", "Baby Shower", "Private Party"],
    services: ["Cake & Desserts", "Catering"],
    description: "Demo dessert service offering cake, cupcakes, chocolate fountains, ice cream carts, and candy tables.",
    pricing: { kind: "flat", basePrice: 650, label: "demo dessert estimate" },
    availability: [{ days: [...everyDay], start: "10:00", end: "22:00" }],
    budgetTier: "standard",
    maxGuestCount: 350,
    serviceRadiusMiles: 35,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["cake", "cupcakes", "chocolate-fountain", "ice-cream-cart", "dessert-table", "candy-table"],
  },
  {
    id: 49,
    name: "Apricot Sound DJs",
    type: "DJ",
    location: "Glendale, CA",
    address: "Glendale, CA",
    coordinates: { lat: 34.1536, lng: -118.2594 },
    price: "$195 / hour demo estimate",
    rating: 0,
    events: ["Birthday", "Wedding", "Graduation", "Private Party"],
    services: ["DJ", "AV Production"],
    description: "Fictional demo DJ specializing in modern Armenian sets, Top 40, live mixing, and bilingual event flow.",
    pricing: { kind: "hourly", hourlyRate: 195, minHours: 4, setupFee: 225, label: "demo DJ estimate" },
    availability: [{ days: [...everyDay], start: "11:00", end: "23:30" }],
    budgetTier: "standard",
    cultures: ["Armenian"],
    languages: ["English", "Armenian"],
    serviceRadiusMiles: 45,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["armenian-dj", "top-40", "modern-armenian", "live-mixing", "birthday"],
  },
  {
    id: 50,
    name: "Mesa Roja Catering",
    type: "Catering",
    location: "Los Angeles, CA",
    address: "Los Angeles, CA",
    coordinates: { lat: 34.0526, lng: -118.2432 },
    price: "$36 / guest demo estimate",
    rating: 0,
    events: ["Birthday", "Wedding", "Graduation", "Private Party"],
    services: ["Catering", "Staffing"],
    description: "Fictional demo Mexican caterer offering taco carts, buffets, and family-style celebration menus.",
    pricing: { kind: "perGuest", perGuest: 36, minimum: 1200, serviceFee: 150, label: "demo catering estimate" },
    availability: [{ days: [...everyDay], start: "09:00", end: "23:00" }],
    budgetTier: "standard",
    cultures: ["Mexican"],
    languages: ["English", "Spanish"],
    maxGuestCount: 400,
    minGuestCount: 25,
    serviceRadiusMiles: 40,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["mexican-catering", "taco-cart", "buffet", "family-style", "birthday"],
  },
  {
    id: 51,
    name: "Velocity Yard",
    type: "Venue",
    location: "Burbank, CA",
    address: "Burbank, CA",
    coordinates: { lat: 34.1852, lng: -118.3198 },
    price: "$1,850 demo estimate",
    capacity: "Up to 120 guests",
    rating: 0,
    events: ["Birthday", "Graduation", "Corporate", "Private Party"],
    services: ["Venue", "Catering", "AV Production"],
    description: "Fictional demo raceway and activity venue with go-karts, party rooms, food service, and teen event packages.",
    pricing: { kind: "flat", basePrice: 1850, label: "demo raceway estimate" },
    availability: [{ days: [...everyDay], start: "10:00", end: "22:30" }],
    budgetTier: "standard",
    maxGuestCount: 120,
    minGuestCount: 15,
    sourceLabel: "Fictional Demo Provider",
    sourceUrl: "/demo",
    tags: ["raceway", "go-karts", "racing", "activity-venue", "teen", "birthday"],
  },
];

export const marketplaceItems: MarketplaceItem[] = demoFixtures.map(item => ({...item, databaseSource:false, listingState:"demo", rating:0, reviewCount:0}));
// Curated showcase coverage, while retaining all legacy fixture IDs for saved Demo continuity.
export const showcaseItems = marketplaceItems.filter(item => item.id >= 60 || item.id <= 14 || item.id === 24 || (item.id >= 26 && item.id <= 31) || (item.id >= 38 && item.id <= 51));
