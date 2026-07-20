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
      basePrice: number;
      label: string;
    }
  | {
      kind: "hourly";
      hourlyRate: number;
      minHours: number;
      setupFee?: number;
      label: string;
    }
  | {
      kind: "perGuest";
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
  id: number;
  databaseSource?: boolean;
  name: string;
  type: ServiceName;
  location: string;
  photoUrl?: string | null;
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
    return item.pricing.basePrice;
  }

  if (item.pricing.kind === "hourly") {
    const billableHours = Math.max(durationHours, item.pricing.minHours);

    return billableHours * item.pricing.hourlyRate + (item.pricing.setupFee ?? 0);
  }

  return Math.max(
    context.guests * item.pricing.perGuest + (item.pricing.serviceFee ?? 0),
    item.pricing.minimum,
  );
}

export function isAvailableAt(
  item: MarketplaceItem,
  date?: string,
  startTime?: string,
  endTime?: string,
) {
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

export const marketplaceItems: MarketplaceItem[] = [
  {
    id: 1,
    name: "The Ebell of Los Angeles",
    type: "Venue",
    location: "Mid-Wilshire, Los Angeles",
    address: "743 S Lucerne Blvd, Los Angeles, CA 90005",
    coordinates: { lat: 34.0607, lng: -118.3246 },
    price: "$5,500 estimate",
    capacity: "1,238 theatre seats",
    rating: 4.9,
    events: ["Wedding", "Corporate", "Fundraiser", "Private Party"],
    services: ["Venue"],
    description: "Historic event campus and theatre in Mid-Wilshire for polished large gatherings.",
    pricing: { kind: "flat", basePrice: 5500, label: "venue estimate" },
    availability: [{ days: [...everyDay], start: "08:00", end: "23:00" }],
    budgetTier: "premium",
    maxGuestCount: 1200,
    reviewCount: 220,
    sourceLabel: "Official site / venue page",
    sourceUrl: "https://ebellofla.org/special-events/",
    tags: ["wedding", "corporate", "gala", "formal", "historic", "theatre"],
  },
  {
    id: 2,
    name: "Shrine Auditorium & Expo Hall",
    type: "Venue",
    location: "University Park, Los Angeles",
    address: "665 W Jefferson Blvd, Los Angeles, CA 90007",
    coordinates: { lat: 34.0237, lng: -118.2811 },
    price: "$8,400 estimate",
    capacity: "Large auditorium and expo hall",
    rating: 4.8,
    events: ["Convention", "Corporate", "Seminar", "Fundraiser", "Graduation"],
    services: ["Venue", "AV Production", "Booth Rentals"],
    description: "Large landmark venue suited to conferences, shows, graduations, and expos.",
    pricing: { kind: "flat", basePrice: 8400, label: "large venue estimate" },
    availability: [{ days: [...everyDay], start: "08:00", end: "22:00" }],
    budgetTier: "premium",
    maxGuestCount: 6000,
    reviewCount: 310,
    sourceLabel: "Official venue info",
    sourceUrl: "https://www.shrineauditorium.com/venue-info",
    tags: ["conference", "convention", "expo", "graduation", "av", "large-format"],
  },
  {
    id: 3,
    name: "The Magic Castle",
    type: "Venue",
    location: "Hollywood, Los Angeles",
    address: "7001 Franklin Ave, Hollywood, CA 90028",
    coordinates: { lat: 34.1046, lng: -118.3427 },
    price: "$3,200 estimate",
    capacity: "Private groups",
    rating: 4.9,
    events: ["Birthday", "Private Party", "Corporate", "Fundraiser"],
    services: ["Venue", "Magic", "Catering"],
    description: "World-famous private clubhouse with dining, shows, and private group options.",
    pricing: { kind: "flat", basePrice: 3200, label: "private group estimate" },
    availability: [{ days: [...everyDay], start: "17:00", end: "23:30" }],
    budgetTier: "premium",
    maxGuestCount: 300,
    reviewCount: 480,
    sourceLabel: "Official site",
    sourceUrl: "https://www.magiccastle.com/",
    serviceOptions: [
      {
        description: "Private room or group admission anchored around the club.",
        estimateLabel: "$3,200 venue estimate",
        service: "Venue",
        title: "Venue access",
      },
      {
        description: "Magic-forward entertainment package for birthdays and private groups.",
        estimateLabel: "$950 show package estimate",
        priceAdjustment: -2250,
        service: "Magic",
        title: "Entertainment/show package",
      },
      {
        description: "Dinner and hospitality package for guests before or after shows.",
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
    name: "SmogShoppe",
    type: "Venue",
    location: "Culver City, CA",
    address: "2651 S La Cienega Blvd, Los Angeles, CA 90034",
    coordinates: { lat: 34.0319, lng: -118.3777 },
    price: "$4,900 estimate",
    capacity: "Indoor-outdoor venue",
    rating: 4.8,
    events: ["Wedding", "Corporate", "Private Party", "Fundraiser"],
    services: ["Venue"],
    description: "Indoor-outdoor event space in Culver City with a distinctive design-forward feel.",
    pricing: { kind: "flat", basePrice: 4900, label: "venue estimate" },
    availability: [{ days: [...everyDay], start: "09:00", end: "23:00" }],
    budgetTier: "premium",
    maxGuestCount: 250,
    reviewCount: 185,
    sourceLabel: "Official site",
    sourceUrl: "https://www.smogshoppe.com/",
    tags: ["wedding", "corporate", "indoor-outdoor", "sustainable", "private-party"],
  },
  {
    id: 5,
    name: "Wolfgang Puck Catering",
    type: "Catering",
    location: "Beverly Grove, Los Angeles",
    address: "8687 Melrose Ave, West Hollywood, CA 90069",
    coordinates: { lat: 34.0811, lng: -118.3824 },
    price: "$115 / guest estimate",
    rating: 4.9,
    events: ["Wedding", "Corporate", "Fundraiser", "Birthday", "Private Party"],
    services: ["Catering", "Staffing"],
    description: "Real LA catering brand for social, wedding, corporate, and private chef events.",
    pricing: { kind: "perGuest", perGuest: 115, minimum: 2500, label: "per guest estimate" },
    availability: [{ days: [...everyDay], start: "08:00", end: "23:00" }],
    averageResponseMinutes: 240,
    budgetTier: "luxury",
    maxGuestCount: 1200,
    minGuestCount: 25,
    repeatClientRate: 72,
    reviewCount: 260,
    sourceLabel: "Official site",
    sourceUrl: "https://wolfgangpuckcatering.com/",
    tags: ["catering", "premium", "wedding", "corporate", "gala", "staffing"],
  },
  {
    id: 6,
    name: "VOX DJs",
    type: "DJ",
    location: "Santa Monica, CA",
    address: "Santa Monica, CA",
    coordinates: { lat: 34.0278, lng: -118.4712 },
    price: "$300 / 3 hours estimate",
    rating: 4.8,
    events: ["Birthday", "Wedding", "Graduation", "Corporate", "Private Party"],
    services: ["DJ", "AV Production"],
    description: "Los Angeles DJ and MC service for weddings, parties, school, and corporate events.",
    pricing: { kind: "hourly", hourlyRate: 100, minHours: 3, label: "$300 for 3 hours estimate" },
    availability: [
      { days: [...weekdays], start: "14:00", end: "23:00" },
      { days: [...weekend], start: "10:00", end: "23:30" },
    ],
    averageResponseMinutes: 120,
    budgetTier: "standard",
    maxGuestCount: 400,
    repeatClientRate: 68,
    reviewCount: 190,
    sourceLabel: "Official site",
    sourceUrl: "https://www.voxdjs.com/",
    tags: ["dj", "dance", "birthday", "graduation", "wedding", "corporate", "mc"],
  },
  {
    id: 7,
    name: "Rent For Event LA",
    type: "AV Production",
    location: "Glendale, CA",
    address: "Glendale, CA",
    coordinates: { lat: 34.1467, lng: -118.2551 },
    price: "$180 / hour estimate",
    rating: 4.7,
    events: ["Corporate", "Convention", "Seminar", "Wedding", "Private Party"],
    services: ["AV Production", "Live Streaming", "Rentals"],
    description: "Audio, video, lighting, staging, and event production rental provider.",
    pricing: { kind: "hourly", hourlyRate: 180, minHours: 3, setupFee: 250, label: "production crew estimate" },
    availability: [{ days: [...everyDay], start: "07:00", end: "23:00" }],
    averageResponseMinutes: 180,
    budgetTier: "premium",
    maxGuestCount: 1000,
    repeatClientRate: 61,
    reviewCount: 130,
    sourceLabel: "Official site",
    sourceUrl: "https://www.rentforevent.com/",
    tags: ["av", "conference", "seminar", "trade-show", "live-streaming", "production"],
  },
  {
    id: 8,
    name: "LA PartyWorks",
    type: "Rentals",
    location: "North Hollywood, CA",
    address: "North Hollywood, CA",
    coordinates: { lat: 34.1722, lng: -118.379 },
    price: "$1,250 estimate",
    rating: 4.7,
    events: ["Birthday", "Baby Shower", "Private Party", "Wedding", "Corporate"],
    services: ["Rentals", "Photo Booth", "Staffing"],
    description: "Party rentals and entertainment equipment for social and corporate events.",
    pricing: { kind: "flat", basePrice: 1250, label: "rental package estimate" },
    availability: [{ days: [...everyDay], start: "07:00", end: "20:00" }],
    averageResponseMinutes: 300,
    budgetTier: "standard",
    maxGuestCount: 300,
    repeatClientRate: 58,
    reviewCount: 115,
    sourceLabel: "Official site",
    sourceUrl: "https://www.lapartyworks.com/",
    tags: ["rentals", "photo-booth", "birthday", "party", "family-friendly", "corporate"],
  },
  {
    id: 9,
    name: "Lark Cake Shop",
    type: "Cake & Desserts",
    location: "Silver Lake, Los Angeles",
    address: "3337 W Sunset Blvd, Los Angeles, CA 90026",
    coordinates: { lat: 34.0852, lng: -118.2755 },
    price: "$380 estimate",
    rating: 4.7,
    events: ["Birthday", "Wedding", "Baby Shower", "Graduation", "Private Party"],
    services: ["Cake & Desserts"],
    description: "Los Angeles bakery for cakes and desserts; useful for birthday and shower proof-of-concept.",
    pricing: { kind: "flat", basePrice: 380, label: "custom dessert estimate" },
    availability: [{ days: [...weekdays, ...weekend], start: "09:00", end: "18:00" }],
    averageResponseMinutes: 360,
    budgetTier: "standard",
    reviewCount: 145,
    sourceLabel: "Official site",
    sourceUrl: "https://www.larkcakeshop.com/",
    tags: ["cake", "dessert", "birthday", "baby-shower", "wedding", "custom"],
  },
  {
    id: 10,
    name: "Town & Country Event Rentals",
    type: "Rentals",
    location: "Van Nuys, CA",
    address: "7722 Gloria Ave, Van Nuys, CA 91406",
    coordinates: { lat: 34.2116, lng: -118.4793 },
    price: "$1,600 estimate",
    rating: 4.8,
    events: ["Wedding", "Corporate", "Private Party", "Birthday", "Fundraiser"],
    services: ["Rentals"],
    description: "Event rental company for tables, seating, tabletop, and larger rental needs.",
    pricing: { kind: "flat", basePrice: 1600, label: "rental order estimate" },
    availability: [{ days: [...everyDay], start: "07:00", end: "20:00" }],
    averageResponseMinutes: 240,
    budgetTier: "premium",
    maxGuestCount: 800,
    repeatClientRate: 65,
    reviewCount: 150,
    sourceLabel: "Official site",
    sourceUrl: "https://www.tacer.biz/",
    tags: ["rentals", "wedding", "corporate", "gala", "tables", "seating"],
  },
  {
    id: 11,
    name: "Mark's Garden",
    type: "Florals",
    location: "Sherman Oaks, CA",
    address: "13838 Ventura Blvd, Sherman Oaks, CA 91423",
    coordinates: { lat: 34.1485, lng: -118.4357 },
    price: "$900 estimate",
    rating: 4.8,
    events: ["Wedding", "Baby Shower", "Funeral", "Fundraiser", "Private Party"],
    services: ["Florals"],
    description: "Los Angeles floral studio for weddings, parties, memorials, and upscale arrangements.",
    pricing: { kind: "flat", basePrice: 900, label: "floral design estimate" },
    availability: [{ days: [...everyDay], start: "07:00", end: "18:00" }],
    averageResponseMinutes: 420,
    budgetTier: "premium",
    repeatClientRate: 70,
    reviewCount: 175,
    sourceLabel: "Official site",
    sourceUrl: "https://marksgarden.com/",
    tags: ["florals", "wedding", "funeral", "memorial", "baby-shower", "gala"],
  },
  {
    id: 12,
    name: "The Bash - Los Angeles Magicians",
    type: "Magic",
    location: "Hollywood, Los Angeles",
    address: "Hollywood, Los Angeles, CA",
    coordinates: { lat: 34.1019, lng: -118.3269 },
    price: "$275 / hour estimate",
    rating: 4.6,
    events: ["Birthday", "Baby Shower", "Private Party", "Corporate"],
    services: ["Magic"],
    description: "Public marketplace page for Los Angeles magicians used as a real-provider proof source.",
    pricing: { kind: "hourly", hourlyRate: 275, minHours: 1, label: "magic performance estimate" },
    availability: [{ days: [...weekend], start: "10:00", end: "20:00" }],
    averageResponseMinutes: 480,
    budgetTier: "standard",
    maxGuestCount: 120,
    reviewCount: 90,
    sourceLabel: "Marketplace page",
    sourceUrl: "https://www.thebash.com/search/magician-los-angeles-ca",
    tags: ["magic", "birthday", "family-friendly", "kids", "entertainment"],
  },
  {
    id: 13,
    name: "The Bash - Los Angeles Princess Parties",
    type: "Character Performers",
    location: "Burbank, CA",
    address: "Burbank, CA",
    coordinates: { lat: 34.1808, lng: -118.309 },
    price: "$150 / hour estimate",
    rating: 4.6,
    events: ["Birthday", "Baby Shower", "Private Party"],
    services: ["Character Performers"],
    description: "Public marketplace page for princess and character party performers near Los Angeles.",
    pricing: { kind: "hourly", hourlyRate: 150, minHours: 2, label: "character performer estimate" },
    availability: [{ days: [...weekend], start: "09:00", end: "19:00" }],
    averageResponseMinutes: 480,
    budgetTier: "standard",
    maxGuestCount: 80,
    reviewCount: 72,
    sourceLabel: "Marketplace page",
    sourceUrl: "https://www.thebash.com/search/princess-party-los-angeles-ca",
    tags: ["character", "kids", "birthday", "family-friendly", "costume", "entertainment"],
  },
  {
    id: 14,
    name: "Yelp - Los Angeles Photo Booth Rentals",
    type: "Photo Booth",
    location: "Culver City, CA",
    address: "Culver City, CA",
    coordinates: { lat: 34.0211, lng: -118.3965 },
    price: "$500 / 3 hours estimate",
    rating: 4.5,
    events: ["Birthday", "Wedding", "Graduation", "Corporate", "Private Party"],
    services: ["Photo Booth"],
    description: "Public Yelp category page used to validate real local photo booth options.",
    pricing: { kind: "hourly", hourlyRate: 125, minHours: 3, setupFee: 125, label: "booth rental estimate" },
    availability: [{ days: [...everyDay], start: "10:00", end: "23:00" }],
    averageResponseMinutes: 360,
    budgetTier: "standard",
    maxGuestCount: 500,
    reviewCount: 120,
    sourceLabel: "Yelp category",
    sourceUrl: "https://www.yelp.com/search?find_desc=Photo+Booth+Rentals&find_loc=Los+Angeles%2C+CA",
    tags: ["photo-booth", "birthday", "wedding", "graduation", "corporate", "party"],
  },
  {
    id: 15,
    name: "Scooter's Jungle El Segundo",
    type: "Venue",
    location: "El Segundo, CA",
    address: "606 Hawaii St, El Segundo, CA 90245",
    coordinates: { lat: 33.9236, lng: -118.3948 },
    price: "$950 estimate",
    capacity: "Private kids party venue",
    rating: 4.6,
    events: ["Birthday", "Private Party", "Baby Shower"],
    services: ["Venue", "Character Performers", "Catering"],
    description: "Indoor party venue built for private kids celebrations, play time, food, and family-friendly hosting.",
    pricing: { kind: "flat", basePrice: 950, label: "private party package estimate" },
    availability: [{ days: [...everyDay], start: "10:00", end: "20:00" }],
    averageResponseMinutes: 260,
    budgetTier: "standard",
    maxGuestCount: 120,
    reviewCount: 165,
    sourceLabel: "Official site",
    sourceUrl: "https://scootersjungle.com/",
    serviceOptions: [
      {
        description: "Private indoor kids venue for the core party window.",
        estimateLabel: "$950 venue estimate",
        service: "Venue",
        title: "Kids party venue",
      },
      {
        description: "Play and bounce entertainment for the active part of the party.",
        estimateLabel: "$420 play package estimate",
        priceAdjustment: -530,
        service: "Character Performers",
        title: "Bounce/play entertainment",
      },
      {
        description: "Party host support for setup, flow, and guest help.",
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
    name: "MB2 Raceway Sylmar",
    type: "Venue",
    location: "Sylmar, CA",
    address: "13943 Balboa Blvd, Sylmar, CA 91342",
    coordinates: { lat: 34.3203, lng: -118.4992 },
    price: "$1,450 estimate",
    capacity: "Racing parties and corporate groups",
    rating: 4.5,
    events: ["Birthday", "Corporate", "Graduation", "Private Party"],
    services: ["Venue", "Catering", "Staffing", "Character Performers"],
    description: "Indoor kart racing venue for active birthdays, team outings, and private group events.",
    pricing: { kind: "flat", basePrice: 1450, label: "group racing estimate" },
    availability: [{ days: [...everyDay], start: "11:00", end: "22:00" }],
    averageResponseMinutes: 300,
    budgetTier: "standard",
    maxGuestCount: 180,
    reviewCount: 210,
    sourceLabel: "Official site",
    sourceUrl: "https://mb2raceway.com/",
    serviceOptions: [
      {
        description: "Party room or group event space for the gathering.",
        estimateLabel: "$1,450 venue estimate",
        service: "Venue",
        title: "Party venue",
      },
      {
        description: "Go-kart racing experience for guests.",
        estimateLabel: "$900 activity estimate",
        priceAdjustment: -550,
        service: "Character Performers",
        title: "Go-kart entertainment",
      },
      {
        description: "Food package for the group after racing.",
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
    name: "NOOR Pasadena",
    type: "Venue",
    location: "Pasadena, CA",
    address: "300 E Colorado Blvd, Pasadena, CA 91101",
    coordinates: { lat: 34.1456, lng: -118.144 },
    price: "$4,200 estimate",
    capacity: "Ballroom and terrace events",
    rating: 4.7,
    events: ["Wedding", "Corporate", "Baby Shower", "Fundraiser", "Private Party"],
    services: ["Venue", "Catering", "AV Production"],
    description: "Pasadena banquet and event venue with ballroom options for weddings, showers, and formal parties.",
    pricing: { kind: "flat", basePrice: 4200, label: "banquet venue estimate" },
    availability: [{ days: [...everyDay], start: "09:00", end: "23:30" }],
    averageResponseMinutes: 240,
    budgetTier: "premium",
    maxGuestCount: 350,
    reviewCount: 195,
    sourceLabel: "Official site",
    sourceUrl: "https://noorevents.com/",
    serviceOptions: [
      {
        description: "Ballroom or terrace event space.",
        estimateLabel: "$4,200 venue estimate",
        service: "Venue",
        title: "Venue package",
      },
      {
        description: "In-house banquet food and service package.",
        estimateLabel: "$95 / guest estimate",
        priceAdjustment: 1800,
        service: "Catering",
        title: "Catering package",
      },
      {
        description: "Basic lighting and sound support for the room.",
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
    name: "Taglyan Complex",
    type: "Venue",
    location: "Hollywood, Los Angeles",
    address: "1201 Vine St, Los Angeles, CA 90038",
    coordinates: { lat: 34.0935, lng: -118.3265 },
    price: "$7,200 estimate",
    capacity: "Grand ballroom",
    rating: 4.8,
    events: ["Wedding", "Fundraiser", "Corporate", "Convention", "Private Party"],
    services: ["Venue", "Catering", "AV Production", "Staffing"],
    description: "Large Hollywood banquet hall for premium weddings, galas, and corporate events.",
    pricing: { kind: "flat", basePrice: 7200, label: "premium ballroom estimate" },
    availability: [{ days: [...everyDay], start: "09:00", end: "23:30" }],
    averageResponseMinutes: 180,
    budgetTier: "luxury",
    maxGuestCount: 500,
    reviewCount: 260,
    sourceLabel: "Official site",
    sourceUrl: "https://www.taglyancomplex.com/",
    serviceOptions: [
      {
        description: "Grand ballroom rental for the event.",
        estimateLabel: "$7,200 venue estimate",
        service: "Venue",
        title: "Ballroom venue",
      },
      {
        description: "Formal banquet catering package.",
        estimateLabel: "$135 / guest estimate",
        priceAdjustment: 2800,
        service: "Catering",
        title: "Banquet catering",
      },
      {
        description: "Room presentation, lighting, and decor support.",
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
    name: "Castaway Burbank",
    type: "Venue",
    location: "Burbank, CA",
    address: "1250 E Harvard Rd, Burbank, CA 91501",
    coordinates: { lat: 34.1978, lng: -118.3037 },
    price: "$5,900 estimate",
    capacity: "Hilltop restaurant and event spaces",
    rating: 4.6,
    events: ["Wedding", "Corporate", "Fundraiser", "Private Party", "Graduation"],
    services: ["Venue", "Catering", "Staffing"],
    description: "Hilltop venue with dining and event rooms for weddings, celebrations, and corporate dinners.",
    pricing: { kind: "flat", basePrice: 5900, label: "event space estimate" },
    availability: [{ days: [...everyDay], start: "10:00", end: "23:00" }],
    averageResponseMinutes: 220,
    budgetTier: "premium",
    maxGuestCount: 450,
    reviewCount: 310,
    sourceLabel: "Official site",
    sourceUrl: "https://www.castawayburbank.com/",
    tags: ["venue", "views", "restaurant", "wedding", "corporate"],
  },
  {
    id: 20,
    name: "Heirloom LA",
    type: "Catering",
    location: "East Hollywood, Los Angeles",
    address: "4121 Santa Monica Blvd, Los Angeles, CA 90029",
    coordinates: { lat: 34.0904, lng: -118.2826 },
    price: "$78 / guest estimate",
    rating: 4.8,
    events: ["Wedding", "Corporate", "Baby Shower", "Fundraiser", "Private Party"],
    services: ["Catering", "Staffing"],
    description: "Los Angeles catering studio for thoughtful private, wedding, and corporate menus.",
    pricing: { kind: "perGuest", perGuest: 78, minimum: 1800, serviceFee: 250, label: "per guest estimate" },
    availability: [{ days: [...everyDay], start: "08:00", end: "23:00" }],
    averageResponseMinutes: 180,
    budgetTier: "premium",
    maxGuestCount: 400,
    minGuestCount: 20,
    reviewCount: 140,
    sourceLabel: "Official site",
    sourceUrl: "https://www.heirloomla.com/",
    tags: ["catering", "seasonal", "wedding", "corporate", "private-dining"],
  },
  {
    id: 21,
    name: "Contemporary Catering",
    type: "Catering",
    location: "Santa Monica, CA",
    address: "Santa Monica, CA",
    coordinates: { lat: 34.022, lng: -118.4814 },
    price: "$64 / guest estimate",
    rating: 4.7,
    events: ["Wedding", "Corporate", "Fundraiser", "Birthday", "Private Party"],
    services: ["Catering", "Staffing"],
    description: "Catering provider for corporate events, weddings, and social celebrations around greater LA.",
    pricing: { kind: "perGuest", perGuest: 64, minimum: 1600, serviceFee: 200, label: "per guest estimate" },
    availability: [{ days: [...everyDay], start: "08:00", end: "23:00" }],
    averageResponseMinutes: 210,
    budgetTier: "standard",
    maxGuestCount: 800,
    minGuestCount: 25,
    reviewCount: 118,
    sourceLabel: "Official site",
    sourceUrl: "https://www.contemporarycatering.com/",
    tags: ["catering", "corporate", "wedding", "buffet", "staffing"],
  },
  {
    id: 22,
    name: "Joe's Mobile Music",
    type: "DJ",
    location: "Long Beach, CA",
    address: "Long Beach, CA",
    coordinates: { lat: 33.7879, lng: -118.1704 },
    price: "$425 / 3 hours estimate",
    rating: 4.6,
    events: ["Birthday", "Wedding", "Graduation", "Corporate", "Private Party"],
    services: ["DJ", "AV Production"],
    description: "Mobile DJ service for South Bay, Long Beach, and greater LA celebrations.",
    pricing: { kind: "hourly", hourlyRate: 125, minHours: 3, setupFee: 50, label: "mobile DJ estimate" },
    availability: [
      { days: [...weekdays], start: "16:00", end: "23:00" },
      { days: [...weekend], start: "11:00", end: "23:30" },
    ],
    averageResponseMinutes: 160,
    budgetTier: "standard",
    maxGuestCount: 350,
    reviewCount: 98,
    sourceLabel: "Official site",
    sourceUrl: "https://www.joesmobilemusic.com/",
    tags: ["dj", "long-beach", "mobile", "wedding", "birthday"],
  },
  {
    id: 23,
    name: "Splacer LA Live Music",
    type: "Live Music",
    location: "Downtown Los Angeles",
    address: "Downtown Los Angeles, CA",
    coordinates: { lat: 34.0449, lng: -118.2553 },
    price: "$650 estimate",
    rating: 4.5,
    events: ["Wedding", "Fundraiser", "Corporate", "Private Party", "Funeral"],
    services: ["Live Music"],
    description: "Demo live-music sourcing option for acoustic, jazz, and reception entertainment needs.",
    pricing: { kind: "flat", basePrice: 650, label: "live music estimate" },
    availability: [{ days: [...everyDay], start: "10:00", end: "22:00" }],
    averageResponseMinutes: 420,
    budgetTier: "standard",
    maxGuestCount: 260,
    reviewCount: 64,
    sourceLabel: "Marketplace reference",
    sourceUrl: "https://www.splacer.co/",
    tags: ["live-music", "jazz", "acoustic", "reception", "ceremony"],
  },
  {
    id: 24,
    name: "The Pod Photography",
    type: "Photography",
    location: "Culver City, CA",
    address: "Culver City, CA",
    coordinates: { lat: 34.0059, lng: -118.4117 },
    price: "$1,200 estimate",
    rating: 4.8,
    events: ["Wedding", "Birthday", "Baby Shower", "Corporate", "Private Party"],
    services: ["Photography", "Photo Booth"],
    description: "Photography studio option for portraits, events, and celebration coverage around Los Angeles.",
    pricing: { kind: "flat", basePrice: 1200, label: "event photo estimate" },
    availability: [{ days: [...everyDay], start: "09:00", end: "23:00" }],
    averageResponseMinutes: 200,
    budgetTier: "premium",
    maxGuestCount: 500,
    reviewCount: 150,
    sourceLabel: "Official site",
    sourceUrl: "https://www.thepodphoto.com/",
    tags: ["photography", "event-coverage", "portraits", "wedding", "corporate"],
  },
  {
    id: 25,
    name: "Jardin del Eden Florist",
    type: "Florals",
    location: "Downtown Los Angeles",
    address: "766 Wall St, Los Angeles, CA 90014",
    coordinates: { lat: 34.0398, lng: -118.2492 },
    price: "$650 estimate",
    rating: 4.6,
    events: ["Wedding", "Baby Shower", "Funeral", "Birthday", "Fundraiser"],
    services: ["Florals"],
    description: "Flower District florist option for event florals, memorial arrangements, and celebration installs.",
    pricing: { kind: "flat", basePrice: 650, label: "event florals estimate" },
    availability: [{ days: [...everyDay], start: "07:00", end: "18:00" }],
    averageResponseMinutes: 300,
    budgetTier: "standard",
    reviewCount: 120,
    sourceLabel: "Official site",
    sourceUrl: "https://www.jardindeledenflowers.com/",
    tags: ["florals", "flower-district", "wedding", "memorial", "baby-shower"],
  },
  {
    id: 26,
    name: "Gotham Security",
    type: "Security",
    location: "Los Angeles, CA",
    address: "Los Angeles, CA",
    coordinates: { lat: 34.0618, lng: -118.3005 },
    price: "$90 / hour estimate",
    rating: 4.5,
    events: ["Corporate", "Convention", "Fundraiser", "Private Party", "Wedding"],
    services: ["Security", "Staffing"],
    description: "Event security staffing option for guest flow, access control, and higher-attendance events.",
    pricing: { kind: "hourly", hourlyRate: 90, minHours: 4, label: "security staff estimate" },
    availability: [{ days: [...everyDay], start: "07:00", end: "23:30" }],
    averageResponseMinutes: 180,
    budgetTier: "standard",
    maxGuestCount: 2000,
    reviewCount: 82,
    sourceLabel: "Official site",
    sourceUrl: "https://gothamsecurity.com/",
    tags: ["security", "staffing", "access-control", "corporate", "large-event"],
  },
  {
    id: 27,
    name: "United Site Services LA",
    type: "Portable Restrooms",
    location: "Commerce, CA",
    address: "Commerce, CA",
    coordinates: { lat: 34.0006, lng: -118.1598 },
    price: "$725 estimate",
    rating: 4.4,
    events: ["Convention", "Fundraiser", "Corporate", "Private Party", "Graduation"],
    services: ["Portable Restrooms", "Staffing"],
    description: "Portable restroom and site service provider for outdoor and large-format event logistics.",
    pricing: { kind: "flat", basePrice: 725, label: "restroom logistics estimate" },
    availability: [{ days: [...everyDay], start: "06:00", end: "20:00" }],
    averageResponseMinutes: 360,
    budgetTier: "standard",
    maxGuestCount: 3000,
    reviewCount: 70,
    sourceLabel: "Official site",
    sourceUrl: "https://www.unitedsiteservices.com/",
    tags: ["restrooms", "logistics", "outdoor", "large-event", "delivery"],
  },
  {
    id: 28,
    name: "Classic Party Rentals LA",
    type: "Rentals",
    location: "Inglewood, CA",
    address: "Inglewood, CA",
    coordinates: { lat: 33.9617, lng: -118.3531 },
    price: "$1,150 estimate",
    rating: 4.6,
    events: ["Wedding", "Birthday", "Baby Shower", "Corporate", "Private Party"],
    services: ["Rentals", "Booth Rentals"],
    description: "Party rental option for seating, tables, lounges, booths, and practical event infrastructure.",
    pricing: { kind: "flat", basePrice: 1150, label: "rental package estimate" },
    availability: [{ days: [...everyDay], start: "07:00", end: "20:00" }],
    averageResponseMinutes: 240,
    budgetTier: "standard",
    maxGuestCount: 700,
    reviewCount: 104,
    sourceLabel: "Official site",
    sourceUrl: "https://classicpartyrentals.com/",
    tags: ["rentals", "tables", "chairs", "booth", "wedding", "party"],
  },
  {
    id: 29,
    name: "New Balloon Art",
    type: "Balloons",
    location: "Los Angeles, CA",
    address: "Los Angeles, CA",
    coordinates: { lat: 34.0764, lng: -118.2607 },
    price: "$750 estimate",
    rating: 4.7,
    events: ["Birthday", "Baby Shower", "Private Party", "Fundraiser", "Corporate"],
    services: ["Balloons", "Florals"],
    description: "Los Angeles balloon installation studio for sculptural decor, photo moments, and kid-friendly celebrations.",
    pricing: { kind: "flat", basePrice: 750, label: "balloon install estimate" },
    availability: [{ days: [...everyDay], start: "08:00", end: "20:00" }],
    averageResponseMinutes: 360,
    budgetTier: "premium",
    maxGuestCount: 500,
    reviewCount: 80,
    sourceLabel: "Official site",
    sourceUrl: "http://newballoonart.com/",
    tags: ["balloons", "decor", "birthday", "baby-shower", "installation"],
  },
  {
    id: 30,
    name: "Yelp - Los Angeles Bounce House Rentals",
    type: "Bounce Houses",
    location: "Los Angeles, CA",
    address: "Los Angeles, CA",
    coordinates: { lat: 34.0109, lng: -118.2913 },
    price: "$325 estimate",
    rating: 4.5,
    events: ["Birthday", "Baby Shower", "Private Party", "Fundraiser"],
    services: ["Bounce Houses", "Rentals"],
    description: "Local bounce house rental discovery source for backyard birthdays, school events, and family parties.",
    pricing: { kind: "flat", basePrice: 325, label: "inflatable rental estimate" },
    availability: [{ days: [...everyDay], start: "08:00", end: "20:00" }],
    averageResponseMinutes: 300,
    budgetTier: "economy",
    maxGuestCount: 160,
    reviewCount: 95,
    sourceLabel: "Yelp category",
    sourceUrl: "https://www.yelp.com/search?find_desc=Bounce+House+Rentals&find_loc=Los+Angeles%2C+CA",
    tags: ["bounce-house", "kids", "birthday", "backyard", "rentals"],
  },
  {
    id: 31,
    name: "Yelp - Los Angeles Mobile Bartenders",
    type: "Bartending",
    location: "Los Angeles, CA",
    address: "Los Angeles, CA",
    coordinates: { lat: 34.056, lng: -118.3725 },
    price: "$65 / hour estimate",
    rating: 4.6,
    events: ["Wedding", "Corporate", "Fundraiser", "Private Party"],
    services: ["Bartending", "Staffing"],
    description: "Local mobile bartending discovery source for staffed bars, mixers, and guest-service support.",
    pricing: { kind: "hourly", hourlyRate: 65, minHours: 4, setupFee: 150, label: "bartending staff estimate" },
    availability: [{ days: [...everyDay], start: "10:00", end: "23:30" }],
    averageResponseMinutes: 240,
    budgetTier: "standard",
    maxGuestCount: 450,
    reviewCount: 110,
    sourceLabel: "Yelp category",
    sourceUrl: "https://www.yelp.com/search?find_desc=Mobile+Bartending+Service&find_loc=Los+Angeles%2C+CA",
    tags: ["bartending", "bar-staff", "wedding", "private-party", "corporate"],
  },
  {
    id: 32,
    name: "Regent Parking",
    type: "Valet",
    location: "Los Angeles, CA",
    address: "Los Angeles, CA",
    coordinates: { lat: 34.0838, lng: -118.3537 },
    price: "$95 / hour estimate",
    rating: 4.6,
    events: ["Wedding", "Corporate", "Fundraiser", "Convention", "Private Party"],
    services: ["Valet", "Staffing"],
    description: "Los Angeles valet operator reference for guest arrival flow, private events, restaurants, and hospitality.",
    pricing: { kind: "hourly", hourlyRate: 95, minHours: 4, setupFee: 250, label: "valet team estimate" },
    availability: [{ days: [...everyDay], start: "08:00", end: "23:30" }],
    averageResponseMinutes: 240,
    budgetTier: "premium",
    maxGuestCount: 1000,
    reviewCount: 70,
    sourceLabel: "Company reference",
    sourceUrl: "https://www.bonappetit.com/people/article/tips-from-the-valet-brad-saltzman",
    tags: ["valet", "parking", "guest-arrival", "wedding", "corporate"],
  },
  {
    id: 33,
    name: "KLS Worldwide Chauffeured Services",
    type: "Transportation",
    location: "Los Angeles, CA",
    address: "Los Angeles, CA",
    coordinates: { lat: 33.9434, lng: -118.4081 },
    price: "$145 / hour estimate",
    rating: 4.7,
    events: ["Wedding", "Corporate", "Fundraiser", "Private Party", "Graduation"],
    services: ["Transportation"],
    description: "Chauffeured transportation option for VIP guest movement, airport pickup, and event transfers.",
    pricing: { kind: "hourly", hourlyRate: 145, minHours: 3, label: "chauffeured vehicle estimate" },
    availability: [{ days: [...everyDay], start: "05:00", end: "23:30" }],
    averageResponseMinutes: 180,
    budgetTier: "premium",
    maxGuestCount: 40,
    reviewCount: 160,
    sourceLabel: "Official site",
    sourceUrl: "https://www.klsla.com/",
    tags: ["transportation", "chauffeur", "vip", "airport", "wedding"],
  },
  {
    id: 34,
    name: "Yelp - Los Angeles Party Bus Rentals",
    type: "Party Bus",
    location: "Los Angeles, CA",
    address: "Los Angeles, CA",
    coordinates: { lat: 34.0428, lng: -118.3274 },
    price: "$190 / hour estimate",
    rating: 4.5,
    events: ["Birthday", "Wedding", "Graduation", "Private Party", "Corporate"],
    services: ["Party Bus", "Transportation"],
    description: "Party bus discovery source for group movement between venues, photos, afterparties, and hotels.",
    pricing: { kind: "hourly", hourlyRate: 190, minHours: 4, label: "party bus estimate" },
    availability: [{ days: [...everyDay], start: "10:00", end: "23:30" }],
    averageResponseMinutes: 300,
    budgetTier: "standard",
    maxGuestCount: 45,
    reviewCount: 125,
    sourceLabel: "Yelp category",
    sourceUrl: "https://www.yelp.com/search?find_desc=Party+Bus+Rentals&find_loc=Los+Angeles%2C+CA",
    tags: ["party-bus", "transportation", "birthday", "graduation", "afterparty"],
  },
  {
    id: 35,
    name: "Yelp - Los Angeles Event Cleaning",
    type: "Cleaning",
    location: "Los Angeles, CA",
    address: "Los Angeles, CA",
    coordinates: { lat: 34.0312, lng: -118.2508 },
    price: "$55 / hour estimate",
    rating: 4.5,
    events: ["Corporate", "Convention", "Fundraiser", "Private Party", "Graduation"],
    services: ["Cleaning", "Staffing"],
    description: "Event cleanup discovery source for post-party resets, venue turnover, and large-format logistics.",
    pricing: { kind: "hourly", hourlyRate: 55, minHours: 4, setupFee: 100, label: "cleaning crew estimate" },
    availability: [{ days: [...everyDay], start: "06:00", end: "23:30" }],
    averageResponseMinutes: 360,
    budgetTier: "standard",
    maxGuestCount: 1200,
    reviewCount: 90,
    sourceLabel: "Yelp category",
    sourceUrl: "https://www.yelp.com/search?find_desc=Event+Cleaning&find_loc=Los+Angeles%2C+CA",
    tags: ["cleaning", "cleanup", "turnover", "staffing", "logistics"],
  },
  {
    id: 36,
    name: "Yelp - Los Angeles Taco Cart Catering",
    type: "Catering",
    location: "Los Angeles, CA",
    address: "Los Angeles, CA",
    coordinates: { lat: 34.0707, lng: -118.2076 },
    price: "$22 / guest estimate",
    rating: 4.6,
    events: ["Birthday", "Graduation", "Private Party", "Fundraiser", "Corporate"],
    services: ["Catering", "Staffing"],
    description: "Taco cart catering discovery source for backyard parties, fundraisers, graduations, and casual corporate events.",
    pricing: { kind: "perGuest", perGuest: 22, minimum: 950, serviceFee: 125, label: "taco cart estimate" },
    availability: [{ days: [...everyDay], start: "10:00", end: "23:00" }],
    averageResponseMinutes: 240,
    budgetTier: "economy",
    maxGuestCount: 400,
    minGuestCount: 35,
    reviewCount: 140,
    sourceLabel: "Yelp category",
    sourceUrl: "https://www.yelp.com/search?find_desc=Taco+Cart+Catering&find_loc=Los+Angeles%2C+CA",
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
    rating: 4.8,
    events: ["Birthday", "Graduation", "Private Party", "Corporate"],
    services: ["Venue", "Catering", "AV Production"],
    description: "Demo activity venue with arcade play, lounge seating, food service, and flexible music for teen celebrations.",
    pricing: { kind: "flat", basePrice: 1650, label: "demo venue estimate" },
    availability: [{ days: [...everyDay], start: "10:00", end: "23:00" }],
    budgetTier: "standard",
    cultures: ["Armenian", "Latine"],
    maxGuestCount: 90,
    minGuestCount: 15,
    sourceLabel: "Demo provider",
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
    rating: 4.7,
    events: ["Birthday", "Baby Shower", "Private Party"],
    services: ["Venue", "Character Performers", "Bounce Houses"],
    description: "Demo indoor-outdoor play venue designed for children, family seating, simple catering, and character visits.",
    pricing: { kind: "flat", basePrice: 1200, label: "demo venue estimate" },
    availability: [{ days: [...everyDay], start: "09:00", end: "20:00" }],
    budgetTier: "standard",
    maxGuestCount: 70,
    sourceLabel: "Demo provider",
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
    rating: 4.9,
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
    sourceLabel: "Demo provider",
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
    rating: 4.8,
    events: ["Birthday", "Wedding", "Graduation", "Private Party"],
    services: ["DJ", "AV Production"],
    description: "Demo bilingual DJ and emcee service for Quinceañeras, weddings, graduations, and milestone celebrations.",
    pricing: { kind: "hourly", hourlyRate: 185, minHours: 4, setupFee: 250, label: "demo DJ estimate" },
    availability: [{ days: [...weekend], start: "12:00", end: "23:30" }],
    budgetTier: "standard",
    cultures: ["Mexican", "Latine"],
    languages: ["English", "Spanish"],
    serviceRadiusMiles: 45,
    sourceLabel: "Demo provider",
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
    rating: 4.9,
    events: ["Wedding", "Birthday", "Baby Shower", "Funeral", "Private Party"],
    services: ["Live Music"],
    description: "Demo Armenian ensemble for ceremonies, christenings, receptions, family celebrations, and respectful memorial music.",
    pricing: { kind: "hourly", hourlyRate: 325, minHours: 2, setupFee: 150, label: "demo ensemble estimate" },
    availability: [{ days: [...everyDay], start: "10:00", end: "22:00" }],
    budgetTier: "premium",
    cultures: ["Armenian"],
    languages: ["English", "Armenian"],
    serviceRadiusMiles: 40,
    sourceLabel: "Demo provider",
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
    rating: 4.8,
    events: ["Funeral", "Private Party", "Corporate"],
    services: ["Catering", "Staffing"],
    description: "Demo hospitality team for memorial receptions, celebrations of life, and calm family gatherings.",
    pricing: { kind: "perGuest", perGuest: 34, minimum: 1100, serviceFee: 140, label: "demo reception estimate" },
    availability: [{ days: [...everyDay], start: "08:00", end: "21:00" }],
    budgetTier: "standard",
    maxGuestCount: 300,
    minGuestCount: 20,
    serviceRadiusMiles: 35,
    sourceLabel: "Demo provider",
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
    rating: 4.7,
    events: ["Birthday", "Wedding", "Graduation", "Private Party"],
    services: ["Party Bus", "Transportation"],
    description: "Demo group transportation for bachelor and bachelorette routes, milestone birthdays, and multi-stop celebrations.",
    pricing: { kind: "hourly", hourlyRate: 210, minHours: 4, label: "demo sprinter estimate" },
    availability: [{ days: [...everyDay], start: "10:00", end: "23:30" }],
    budgetTier: "standard",
    maxGuestCount: 28,
    serviceRadiusMiles: 50,
    sourceLabel: "Demo provider",
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
    rating: 4.7,
    events: ["Birthday", "Wedding", "Graduation", "Baby Shower", "Private Party"],
    services: ["Rentals", "Portable Restrooms", "Cleaning"],
    description: "Demo backyard package provider for tents, tables, chairs, shade, lighting, heaters, and cleanup support.",
    pricing: { kind: "flat", basePrice: 950, label: "demo backyard package" },
    availability: [{ days: [...everyDay], start: "06:00", end: "22:00" }],
    budgetTier: "standard",
    maxGuestCount: 500,
    serviceRadiusMiles: 45,
    sourceLabel: "Demo provider",
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
    rating: 4.8,
    events: ["Birthday", "Baby Shower", "Private Party", "Fundraiser"],
    services: ["Character Performers", "Magic", "Balloons"],
    description: "Demo creative entertainment with character visits, face painting, balloon art, bubble shows, and guided art activities.",
    pricing: { kind: "hourly", hourlyRate: 165, minHours: 2, label: "demo performer estimate" },
    availability: [{ days: [...everyDay], start: "09:00", end: "21:00" }],
    budgetTier: "standard",
    maxGuestCount: 180,
    serviceRadiusMiles: 40,
    sourceLabel: "Demo provider",
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
    rating: 4.8,
    events: ["Baby Shower", "Wedding", "Birthday", "Funeral", "Fundraiser"],
    services: ["Florals", "Balloons", "Rentals"],
    description: "Demo floral and soft decor studio for showers, intimate weddings, milestone tables, and memorial arrangements.",
    pricing: { kind: "flat", basePrice: 780, label: "demo floral estimate" },
    availability: [{ days: [...everyDay], start: "07:00", end: "20:00" }],
    budgetTier: "standard",
    serviceRadiusMiles: 35,
    sourceLabel: "Demo provider",
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
    rating: 4.9,
    events: ["Corporate", "Seminar", "Convention", "Fundraiser", "Graduation"],
    services: ["AV Production", "Live Streaming", "Registration", "Staffing"],
    description: "Demo production partner for presentations, microphones, projection, streaming, registration, and event staffing.",
    pricing: { kind: "flat", basePrice: 1850, label: "demo production estimate" },
    availability: [{ days: [...everyDay], start: "06:00", end: "23:00" }],
    budgetTier: "premium",
    maxGuestCount: 1500,
    serviceRadiusMiles: 60,
    sourceLabel: "Demo provider",
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
    rating: 4.7,
    events: ["Birthday", "Wedding", "Graduation", "Baby Shower", "Private Party"],
    services: ["Cake & Desserts", "Catering"],
    description: "Demo dessert service offering cake, cupcakes, chocolate fountains, ice cream carts, and candy tables.",
    pricing: { kind: "flat", basePrice: 650, label: "demo dessert estimate" },
    availability: [{ days: [...everyDay], start: "10:00", end: "22:00" }],
    budgetTier: "standard",
    maxGuestCount: 350,
    serviceRadiusMiles: 35,
    sourceLabel: "Demo provider",
    sourceUrl: "/demo",
    tags: ["cake", "cupcakes", "chocolate-fountain", "ice-cream-cart", "dessert-table", "candy-table"],
  },
];
