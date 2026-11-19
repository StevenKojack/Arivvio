"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Navigation } from "../components/Navigation";
import { BookVendor } from "./Journey";
import { usePublicRecords } from "./records";
import { BusinessMark } from "../components/BusinessMark";
import { BusinessStatusBadge } from "../components/BusinessStatusBadge";
import { PublicServicePackages } from "../marketplace/components/ServicePackages";

import type { MarketplaceItem, ServiceName } from "../data/marketplace";
import { matchesListingRequirements } from "@/lib/marketplace/matching-tiers";
import { profileCover } from "@/lib/marketplace/vendorImages";
import { events, studios, type PublicOccasion } from "./model";
import "./studio.css";

function Photo({
  src,
  alt = "",
  priority = false,
}: {
  src: string;
  alt?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      unoptimized={src.startsWith("https:")}
      fill
      priority={priority}
      sizes="(max-width:640px) 100vw, (max-width:1000px) 60vw, 800px"
      style={{ objectFit: "cover" }}
    />
  );
}
export function Frame({
  children,
  eventId,
}: {
  children: React.ReactNode;
  eventId?: string;
}) {
  return (
    <main className="studio" id="main-content" tabIndex={-1}>
      <Navigation discovery eventId={eventId} />
      {children}
      <footer className="studio-foot">
        Demo and fallback images are AI illustrations.
        <Link href="/vendor/login">For businesses ↗</Link>
      </footer>
    </main>
  );
}
function Poster({
  event,
  large = false,
}: {
  event: PublicOccasion;
  large?: boolean;
}) {
  return (
    <div className={"poster " + event.color + (large ? " large" : "")}>
      <Photo priority={large} src={"/photography/" + event.art + ".webp"} />
      <div className="poster-ink">
        <span>{event.subtitle}</span>
        <strong>{event.title}</strong>
        <time dateTime={event.date}>
          {event.month} {event.day} <i>/</i> Pasadena
        </time>
      </div>
    </div>
  );
}
function StudioCard({
  item,
  eventId,
}: {
  item: MarketplaceItem;
  eventId?: string;
}) {
  const media = profileCover(item);
  return (
    <Link
      className="studio-tile"
      href={
        "/explore/studios/" +
        (item.serviceId || item.id) +
        (eventId ? "?eventId=" + encodeURIComponent(eventId) : "")
      }
    >
      <figure>
        <Photo src={media.src} alt={media.alt} />
      </figure>
      <small>
        {item.type} · {item.location}
      </small>
      <h3>{item.businessName || item.name}</h3>
      <p>{item.tags?.slice(0, 2).join(" · ")}</p>
      <b>
        {item.price.replace(" demo estimate", "")}{" "}
        <small>{item.databaseSource ? "" : "sample pricing"}</small>
      </b>
    </Link>
  );
}
export function Home() {
  const { records } = usePublicRecords();
  return (
    <Frame>
      <section className="planning-entry">
        <Photo src="/photography/garden.webp" priority />
        <div>
          <h1>What’s the occasion?</h1>
          <p>Plan your event and find the people to make it happen.</p>
          <form action="/plan">
            <input
              name="idea"
              aria-label="Your event idea"
              required
              placeholder="A graduation party for 80 in Santa Clarita…"
              maxLength={2000}
            />
            <button className="solid">Start planning</button>
          </form>
          <Link href="/plan?mode=advanced">Describe your full plan ↗</Link>
        </div>
      </section>
      <section className="studio-section service-discovery">
        <h2>Find your event team</h2>
        <div>
          {[
            ["Venue", "Venues", "garden"],
            ["Catering", "Catering", "catering"],
            ["DJ", "Entertainment", "dj"],
            ["Photography", "Photography", "photo"],
          ].map(([type, label, img]) => (
            <Link key={type} href={"/explore?category=" + type}>
              <Photo src={"/photography/" + img + ".webp"} />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="studio-section">
        <div className="section-line">
          <h2>Meet the event makers</h2>
          <Link href="/explore">See all ↗</Link>
        </div>
        <div className="tile-grid">
          {[
            ...records,
            ...[60, 64, 62, 66].map((id) => studios.find((s) => s.id === id)!),
          ]
            .slice(0, 4)
            .map((item) => (
              <StudioCard key={item.serviceId || item.id} item={item} />
            ))}
        </div>
      </section>
      <section className="studio-section">
        <div className="section-line">
          <h2>Community events</h2>
          <Link href="/explore?view=events">See events ↗</Link>
        </div>
        <div className="event-grid">
          {events.map((e) => (
            <Link key={e.slug} href={"/explore/events/" + e.slug}>
              <Poster event={e} />
            </Link>
          ))}
        </div>
      </section>
    </Frame>
  );
}
// Show a different service in each opening slot, then the remaining studios.
const discoveryOrder = [
  ...studios.filter(
    (s, i) => studios.findIndex((other) => other.type === s.type) === i,
  ),
  ...studios.filter(
    (s, i) => studios.findIndex((other) => other.type === s.type) !== i,
  ),
];
export function Explore({
  initialEvents = false,
  initialCategory = "",
  eventId,
}: {
  initialEvents?: boolean;
  initialCategory?: ServiceName | "";
  eventId?: string;
}) {
  const [view, setView] = useState(initialEvents ? "Public events" : "Vendors"),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState<ServiceName | "">(initialCategory),
    [guests, setGuests] = useState(""),
    [language, setLanguage] = useState("");
  const { records, status } = usePublicRecords();
  const directory = [...records, ...discoveryOrder];
  const results = directory.filter((item) =>
    matchesListingRequirements(item, {
      event: "All",
      services: category ? [category] : [],
      excluded: [],
      query,
      language,
      specialty: "",
      estimate: 0,
      guests: Number(guests),
    }),
  );
  const occasions = events.filter((e) =>
    [e.title, e.subtitle, e.place, studios.find((s) => s.id === e.host)?.name]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );
  return (
    <Frame eventId={eventId}>
      <section className="studio-section market">
        <span className="local">Los Angeles &amp; nearby</span>
        <h1>Explore Marketplace</h1>
        <div className="market-tools">
          <div className="view-switch">
            {["Vendors", "Public events"].map((v) => (
              <button
                key={v}
                aria-pressed={v === view}
                onClick={() => {
                  setView(v);
                  setQuery("");
                }}
              >
                {v}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={"Search " + view}
            placeholder={
              view === "Vendors"
                ? "Search names, places or specialties"
                : "Search events or hosts"
            }
          />
        </div>
        {view === "Vendors" ? (
          <>
            <div className="rail" aria-label="Service categories">
              {(["", ...new Set(directory.map((s) => s.type))] as const).map(
                (c) => (
                  <button
                    key={c}
                    aria-pressed={c === category}
                    onClick={() => setCategory(c)}
                  >
                    {c || "All vendors"}
                  </button>
                ),
              )}
            </div>
            <details className="filters">
              <summary>Filters {guests || language ? "· Applied" : ""}</summary>
              <label>
                Guests
                <input
                  type="number"
                  min="0"
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                />
              </label>
              <label>
                Language
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="">Any language</option>
                  {Array.from(
                    new Set(directory.flatMap((s) => s.languages ?? [])),
                  ).map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
            </details>
            <div className="section-line">
              <p>{results.length} listings · Demo businesses labeled</p>
              <Link
                href={
                  "/marketplace?entryMode=browse&workspace=1" +
                  (eventId ? "&eventId=" + encodeURIComponent(eventId) : "")
                }
              >
                Full vendor directory ↗
              </Link>
            </div>
            {status && <small role="status">{status}</small>}
            <div className="tile-grid">
              {results.map((s) => (
                <StudioCard
                  key={s.serviceId || s.id}
                  item={s}
                  eventId={eventId}
                />
              ))}
            </div>
            {!results.length && (
              <button
                className="text-action"
                onClick={() => {
                  setQuery("");
                  setCategory("");
                  setGuests("");
                  setLanguage("");
                }}
              >
                Clear filters
              </button>
            )}
          </>
        ) : (
          <>
            <p className="event-count">
              {occasions.length} demonstration events
            </p>
            <div className="event-grid">
              {occasions.map((e) => (
                <Link key={e.slug} href={"/explore/events/" + e.slug}>
                  <Poster event={e} />
                  <p>{e.when}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </Frame>
  );
}
const portfolio: Record<number, string[]> = {
  60: ["garden", "floral", "rentals"],
  64: ["dj", "production", "music"],
};
const updates: Record<number, { title: string; body: string }> = {
  60: {
    title: "A table for the whole courtyard",
    body: "An example of a venue sharing a dinner layout with space for speeches and dancing.",
  },
  64: {
    title: "Inside the listening session",
    body: "An example of a DJ sharing a set announcement and inviting guests to an upcoming session.",
  },
};
export function Profile({
  item,
  eventId,
}: {
  item: MarketplaceItem;
  eventId?: string;
}) {
  const [section, setSection] = useState("Overview"),
    [slide, setSlide] = useState(0);
  const media = profileCover(item),
    gallery = item.databaseSource
      ? (item.media ?? [])
          .filter((m) => m.kind === "business_photo" && m.status === "approved")
          .sort((a, b) => a.order - b.order)
          .map((m) => m.url)
      : (portfolio[item.id] ?? []).map(
          (scene) => "/photography/" + scene + ".webp",
        ),
    hostEvents = item.databaseSource
      ? []
      : events.filter((e) => e.host === item.id),
    update = item.databaseSource ? undefined : updates[item.id];
  return (
    <Frame eventId={eventId}>
      <article className="profile-sheet">
        <div className="profile-cover">
          <Photo src={media.src} alt={media.alt} priority />
          <Link
            className="back"
            href={
              eventId
                ? "/explore?eventId=" + encodeURIComponent(eventId)
                : "/explore"
            }
          >
            ← Vendors
          </Link>
        </div>
        <header className="profile-head">
          <BusinessMark
            large
            name={item.businessName || item.name}
            logo={
              item.media?.find(
                (m) => m.status === "approved" && m.kind === "logo",
              )?.url
            }
          />
          <div>
            <small>
              {item.type} · {item.location}
            </small>
            <h1>{item.businessName || item.name}</h1>
            <p>{item.shortIntro || item.description.split(". ")[0]}</p>
            <b>{item.price}</b>
            {item.databaseSource && (
              <>
                <BusinessStatusBadge item={item} />
                {media.illustrative ? (
                  <small>Illustrative cover</small>
                ) : (
                  media.attribution && <small>{media.attribution}</small>
                )}
              </>
            )}
          </div>
          <BookVendor item={item} currentEvent={eventId} />
        </header>
        <nav aria-label="Business content" className="rail">
          {["Overview", "Portfolio", "Posts", "Services", "Events", "About"]
            .filter((t) =>
              t === "Portfolio"
                ? gallery.length
                : t === "Posts"
                  ? update
                  : t === "Events"
                    ? hostEvents.length
                    : t === "Services"
                      ? item.serviceOptions?.length || item.serviceId
                      : true,
            )
            .map((t) => (
              <button
                key={t}
                aria-pressed={section === t}
                onClick={() => setSection(t)}
              >
                {t}
              </button>
            ))}
        </nav>
        <section key={section} className="profile-content">
          <div>
            <h2>{section}</h2>
            {section === "Overview" && (
              <>
                <p>{item.description}</p>
                {gallery.length > 0 && (
                  <button
                    className="portfolio-peek"
                    onClick={() => setSection("Portfolio")}
                  >
                    <Photo src={gallery[1] || gallery[0]} />
                    <span>Explore portfolio ↗</span>
                  </button>
                )}
              </>
            )}
            {section === "Portfolio" &&
              (gallery.length ? (
                <>
                  <div className="gallery-photo" key={slide}>
                    <Photo
                      src={gallery[slide]}
                      alt={
                        item.databaseSource
                          ? "Business portfolio photograph"
                          : "Illustrative event scene"
                      }
                    />
                  </div>
                  <div className="gallery-controls">
                    <button
                      onClick={() =>
                        setSlide((slide + gallery.length - 1) % gallery.length)
                      }
                    >
                      ← Previous
                    </button>
                    <span>
                      {slide + 1} / {gallery.length}
                    </span>
                    <button
                      onClick={() => setSlide((slide + 1) % gallery.length)}
                    >
                      Next →
                    </button>
                  </div>
                </>
              ) : (
                <p>This business has no portfolio photos yet.</p>
              ))}
            {section === "Posts" &&
              (update ? (
                <>
                  <div className="gallery-photo">
                    <Photo src={media.src} alt={media.alt} />
                  </div>
                  <small>Example business update</small>
                  <h3>{update.title}</h3>
                  <p>{update.body}</p>
                </>
              ) : (
                <p>No updates yet.</p>
              ))}
            {section === "Services" &&
              item.databaseSource &&
              item.serviceId &&
              item.vendorId && (
                <>
                  <h3>{item.serviceTitle}</h3>
                  <p>{item.description}</p>
                  <PublicServicePackages
                    business={item.vendorId}
                    service={item.serviceId}
                  />
                </>
              )}
            {section === "Services" &&
              item.serviceOptions?.map((o) => (
                <div key={o.title}>
                  <h3>{o.title}</h3>
                  <p>{o.description}</p>
                  <b>{o.estimateLabel}</b>
                </div>
              ))}
            {section === "Events" &&
              (hostEvents.length ? (
                hostEvents.map((e) => (
                  <Link key={e.slug} href={"/explore/events/" + e.slug}>
                    <Poster event={e} />
                  </Link>
                ))
              ) : (
                <p>No upcoming events listed.</p>
              ))}
            {section === "About" && (
              <p>
                {item.description} Languages: {item.languages?.join(", ")}.
              </p>
            )}
          </div>
          <aside>
            <small>Booking details</small>
            <h3>{item.price.replace(" demo estimate", "")}</h3>
            <p>
              {item.databaseSource
                ? "Confirm availability with the business"
                : "Sample estimate · Confirm availability"}
            </p>
            <p>
              {item.capacity ||
                "Service area · " + (item.serviceRadiusMiles ?? 0) + " miles"}
            </p>
          </aside>
        </section>
      </article>
    </Frame>
  );
}
export function Occasion({ event }: { event: PublicOccasion }) {
  const host = studios.find((s) => s.id === event.host)!;
  const [open, setOpen] = useState(false);
  return (
    <Frame>
      <section className="occasion-layout">
        <div>
          <Link href="/explore?view=events" className="text-action">
            ← Explore events
          </Link>
          <Poster event={event} large />
        </div>
        <div className="occasion-info">
          <span className="local">Public event · Demo</span>
          <h1>{event.title}</h1>
          <p>{event.subtitle}</p>
          <dl>
            <dt>When</dt>
            <dd>{event.when}</dd>
            <dt>Where</dt>
            <dd>{event.place}</dd>
            <dt>Host</dt>
            <dd>
              <Link href={"/explore/studios/" + host.id}>{host.name} ↗</Link>
            </dd>
          </dl>
          <p>{event.description}</p>
          <button
            className="solid"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            RSVP information {open ? "↑" : "↓"}
          </button>
          {open && (
            <div className="registration" role="status">
              <b>{event.admission}</b>
              <p>
                This is a sample event. Registration is closed for this preview.
              </p>
            </div>
          )}
        </div>
      </section>
    </Frame>
  );
}

export function RecordProfile({
  id,
  eventId,
}: {
  id: string;
  eventId?: string;
}) {
  const { records, status } = usePublicRecords();
  const item = records.find((r) => r.serviceId === id);
  return item ? (
    <Profile item={item} eventId={eventId} />
  ) : (
    <Frame>
      <section className="studio-section">
        <p role="status">{status || "This listing is no longer available."}</p>
        <Link href="/explore">Back to vendors</Link>
      </section>
    </Frame>
  );
}
