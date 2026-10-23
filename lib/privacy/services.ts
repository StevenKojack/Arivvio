export type ServiceDisclosure = { name: string; purpose: string; data: string; trigger: string };
export const services: ServiceDisclosure[] = [
 {name:"Supabase",purpose:"Accounts, authentication, saved plans, requests and business operations",data:"Account identifiers and contact details, event and optional guest data, messages, quotes, bookings, vendor media, claims, evidence, memberships, audit and privacy requests",trigger:"Account use and submitted forms. Public listings are read when browsing."},
 {name:"Vercel",purpose:"Hosting and operating ARIVVIO",data:"Page and API requests, technical connection information and runtime logs",trigger:"Visiting or using ARIVVIO"},
 {name:"Mapbox",purpose:"Maps, place search and geocoding",data:"Typed location queries, selected addresses or coordinates, map requests and technical connection information",trigger:"Using location search or loading maps. Device location requires browser permission."},
 {name:"OpenAI API",purpose:"Ask ARIVVIO live planning assistance",data:"Recent conversation and relevant event and provider context",trigger:"Sending a message when live AI is enabled. Responses use store: false. This setting does not promise zero provider retention."},
 {name:"Upstash",purpose:"AI usage limits",data:"Hashed IP/session identifiers and usage counters",trigger:"Live AI requests. ARIVVIO rate-limit keys do not contain raw IP addresses."},
 {name:"Unsplash image hosting",purpose:"Generic event and category illustrations",data:"Image requests and technical connection information",trigger:"Viewing pages with externally hosted illustrations"},
];
export const storageInventory = [
 ["ARIVVIO localStorage", "arivvio:… and arivvio.…", "Demo plans, carts, saved Demo requests, conversations, Vendor Demo edits and theme. Persists until cleared."],
 ["ARIVVIO sessionStorage", "arivvio:… and arivvio-demo-entered", "Active location/planning context, Demo entry and assistant session. Usually ends when the tab session closes."],
 ["Supabase authentication", "sb-<project>-auth-token", "Sign-in session in localStorage, managed by Supabase. Signing out removes the current stored session."],
 ["Mapbox", "mapbox.eventData… / mapbox SKU state where used", "Mapbox GL can store operational map-usage state. Maps and location requests reach Mapbox when those features load."],
] as const;
