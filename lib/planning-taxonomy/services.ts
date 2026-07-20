import { preferenceGroup } from "./factory";

export const venuePreferences = preferenceGroup(
  [
    "Banquet hall", "Church", "Community center", "Restaurant", "Private dining room",
    "Backyard", "Park", "Beach", "Hotel ballroom", "Rooftop", "Warehouse", "Art gallery",
    "Museum", "Raceway", "Bowling alley", "Arcade", "Escape room", "Kids activity center",
    "Country club", "Winery", "Ranch", "Garden", "Theater", "Convention center",
  ],
  { category: "Venue types", description: "A preferred kind of place for the event.", linkedService: "Venue", type: "location" },
);

export const entertainmentPreferences = [
  ...preferenceGroup(
    ["Disc jockey", "Cultural DJ", "Armenian DJ", "Persian DJ", "Latin DJ"],
    { category: "Music", description: "Music and event flow led by a DJ.", linkedService: "DJ", type: "service" },
  ),
  ...preferenceGroup(
    ["Live band", "Singer", "Mariachi", "Armenian band", "Jazz band", "String quartet", "Ceremony music"],
    { category: "Live music", description: "Live musicians matched to the event.", linkedService: "Live Music", type: "service" },
  ),
  ...preferenceGroup(
    ["Magician", "Mentalist"],
    { category: "Entertainment", description: "A featured interactive performance.", linkedService: "Magic", type: "service" },
  ),
  ...preferenceGroup(
    ["Character performers", "Princess performers", "Superhero performers", "Clown", "Face painting", "Balloon artist", "Caricature artist", "Temporary tattoos", "Henna artist"],
    { category: "Performers", description: "Interactive entertainment for guests.", linkedService: "Character Performers", type: "service" },
  ),
  ...preferenceGroup(
    ["Photo booth", "360 photo booth", "Video booth"],
    { category: "Interactive media", description: "A guest-facing photo or video experience.", linkedService: "Photo Booth", type: "service" },
  ),
  ...preferenceGroup(
    ["Comedian", "Emcee", "Karaoke", "Trivia host", "Casino games", "Arcade games", "Go-karts", "Bowling", "Escape room", "Painting lesson", "Dance lesson", "Cooking lesson", "Foam cannon", "Bubble show", "Fire dancers", "Belly dancers", "Folk dancers", "Live painter"],
    { category: "Activities and entertainment", description: "An activity or performance to shape the guest experience.", type: "activity" },
  ),
];

export const rentalPreferences = preferenceGroup(
  [
    "Tables", "Chairs", "Linens", "Lounge furniture", "Tents", "Canopies", "Heaters", "Fans",
    "Lighting", "String lights", "Stage", "Dance floor", "Sound system", "Microphones",
    "Projectors", "Screens", "Generators", "Portable restrooms", "Luxury restroom trailer",
    "Bounce house", "Water slide", "Mechanical bull", "Carnival games", "Inflatable games",
    "Red carpet", "Stanchions", "Bars", "Serving equipment",
  ],
  { category: "Rentals and equipment", description: "Equipment delivered or installed for the event.", linkedService: "Rentals", type: "rental" },
);

export const productionPreferences = preferenceGroup(
  ["AV Production", "Audio production", "Video production", "Event lighting", "Technical director", "Booth rentals"],
  { category: "Production", description: "Technical production support for sound, video, staging, and lighting.", linkedService: "AV Production", type: "equipment" },
).map((item) => item.label === "Booth rentals" ? { ...item, linkedService: "Booth Rentals" as const } : item);

export const transportationPreferences = preferenceGroup(
  [
    "Limousine", "Party bus", "Shuttle", "Charter bus", "Sprinter van", "Luxury vehicle",
    "Classic car", "Valet", "Parking coordination", "Guest transportation", "Airport transportation",
    "Pickup and drop-off", "Video game bus", "VIP transportation",
  ],
  { category: "Transportation", description: "Movement, arrival, or parking support for the event.", linkedService: "Transportation", type: "transportation" },
).map((item) => item.label === "Party bus" ? { ...item, linkedService: "Party Bus" as const } : item.label === "Valet" ? { ...item, linkedService: "Valet" as const } : item);

export const staffingPreferences = preferenceGroup(
  [
    "Security", "Event staff", "Servers", "Bartenders", "Coat check", "Valet attendants",
    "Cleanup", "Setup crew", "Breakdown crew", "Event coordinator", "Day-of coordinator", "Registration staff",
    "Childcare", "Lifeguard", "Parking attendant", "Restroom attendant", "Medical staff", "Permit support",
  ],
  { category: "Staffing and logistics", description: "People or operational support for the event.", linkedService: "Staffing", type: "staffing" },
).map((item) => item.label === "Security" ? { ...item, linkedService: "Security" as const } : item.label === "Registration staff" ? { ...item, linkedService: "Registration" as const } : item.label === "Bartenders" ? { ...item, linkedService: "Bartending" as const } : item.label === "Cleanup" ? { ...item, linkedService: "Cleaning" as const } : item);

export const designMediaPreferences = [
  ...preferenceGroup(
    ["Florals", "Floral arrangements", "Balloons", "Backdrop", "Stage design", "Centerpieces", "Draping", "Lighting design", "Custom signage", "Invitations", "Place cards", "Table numbers", "Party favors", "Themed decor", "Cultural decor", "Religious decor", "Memorial printing"],
    { category: "Design and decor", description: "A visual or guest-facing design detail.", type: "service" },
  ),
  ...preferenceGroup(
    ["Photographer", "Videographer", "Drone footage", "Livestream", "Content creator", "Social-media coverage", "Same-day edit", "Event recap video"],
    { category: "Photo and video", description: "Coverage or content created for the event.", linkedService: "Photography", type: "service" },
  ),
].map((item) => ["Florals", "Floral arrangements"].includes(item.label) ? { ...item, linkedService: "Florals" as const } : item.label === "Balloons" ? { ...item, linkedService: "Balloons" as const } : item.label === "Invitations" ? { ...item, linkedService: "Invitations" as const } : item.label === "Memorial printing" ? { ...item, linkedService: "Printed Programs" as const } : item.label === "Livestream" ? { ...item, linkedService: "Live Streaming" as const } : item);
