"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "../components/Logo";
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
      fill
      priority={priority}
      sizes="(max-width:640px) 100vw, (max-width:1000px) 60vw, 800px"
      style={{ objectFit: "cover" }}
    />
  );
}
function Frame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <main className="studio" id="main-content" tabIndex={-1}>
      <header className="studio-nav">
        <Logo />
        <nav aria-label="Main">
          <Link
            href="/explore"
            aria-current={path === "/explore" ? "page" : undefined}
          >
            Explore
          </Link>
          <Link href="/account">My events</Link>
        </nav>
        <Link className="plan-link" href="/plan">
          Plan an event <span>↗</span>
        </Link>
      </header>
      {children}
      <footer className="studio-foot">
        Design preview · Fictional hosts and events · AI-generated photography
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
function StudioCard({ item }: { item: MarketplaceItem }) {
  const media = profileCover(item);
  return (
    <Link className="studio-tile" href={"/explore/studios/" + item.id}>
      <figure>
        <Photo src={media.src} alt={media.alt} />
      </figure>
      <small>
        {item.type} · {item.location}
      </small>
      <h3>{item.name}</h3>
      <p>{item.tags?.slice(0, 2).join(" · ")}</p>
      <b>
        {item.price.replace(" demo estimate", "")} <small>sample pricing</small>
      </b>
    </Link>
  );
}
export function Home() {
  const [index, setIndex] = useState(0);
  const event = events[index];
  return (
    <Frame>
      <div className="home-stage">
        <div className="home-intro">
          <span className="local">Los Angeles &amp; nearby</span>
          <h1>
            Find your <br />
            next <em>occasion.</em>
          </h1>
          <p>
            Discover local events, find your vendors, and pull your own event
            together.
          </p>
          <Link className="solid" href="/plan">
            Start planning ↗
          </Link>
          <Link className="text-action" href="/explore">
            Browse Marketplace
          </Link>
        </div>
        <section className="feature-stage" aria-label="Featured events">
          <Link key={event.slug} href={"/explore/events/" + event.slug}>
            <Poster event={event} large />
          </Link>
          <div className="switcher">
            <span>Featured events · Demo</span>
            {events.map((e, i) => (
              <button
                key={e.slug}
                aria-label={"Show " + e.title}
                aria-pressed={index === i}
                onClick={() => setIndex(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </section>
      </div>
      <section className="studio-section">
        <div className="section-line">
          <h2>Meet the event makers</h2>
          <Link href="/explore">See all ↗</Link>
        </div>
        <div className="tile-grid">
          {[60, 64, 62, 66].map((id) => (
            <StudioCard key={id} item={studios.find((s) => s.id === id)!} />
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
}: {
  initialEvents?: boolean;
}) {
  const [view, setView] = useState(initialEvents ? "Public events" : "Vendors"),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState<ServiceName | "">(""),
    [guests, setGuests] = useState(""),
    [language, setLanguage] = useState("");
  const results = discoveryOrder.filter((item) =>
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
    <Frame>
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
              {(["", ...new Set(studios.map((s) => s.type))] as const).map(
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
                    new Set(studios.flatMap((s) => s.languages ?? [])),
                  ).map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
            </details>
            <div className="section-line">
              <p>{results.length} demonstration vendors</p>
              <Link href="/marketplace?entryMode=browse&workspace=1">
                Full vendor directory ↗
              </Link>
            </div>
            <div className="tile-grid">
              {results.map((s) => (
                <StudioCard key={s.id} item={s} />
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
export function Profile({ item }: { item: MarketplaceItem }) {
  const [section, setSection] = useState("Overview"),
    [slide, setSlide] = useState(0);
  const media = profileCover(item),
    gallery = portfolio[item.id] ?? [],
    hostEvents = events.filter((e) => e.host === item.id),
    update = updates[item.id];
  const quote =
    "/marketplace?mode=demo&entryMode=browse&workspace=1&quoteDemo=" + item.id;
  return (
    <Frame>
      <article className="profile-sheet">
        <div className="profile-cover">
          <Photo src={media.src} alt={media.alt} priority />
          <Link className="back" href="/explore">
            ← Vendors
          </Link>
        </div>
        <header className="profile-head">
          <span className="avatar">
            {item.name
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0])
              .join("")}
          </span>
          <div>
            <small>
              {item.type} · {item.location}
            </small>
            <h1>{item.name}</h1>
            <p>{item.tags?.join(" · ")}</p>
          </div>
          <Link className="solid" href={quote}>
            Build demo quote ↗
          </Link>
        </header>
        <nav aria-label="Business content" className="rail">
          {[
            "Overview",
            "Portfolio",
            "Posts",
            "Services",
            "Events",
            "About",
          ].map((t) => (
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
                    <Photo src={"/photography/" + gallery[1] + ".webp"} />
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
                      src={"/photography/" + gallery[slide] + ".webp"}
                      alt={"Illustrative " + gallery[slide] + " scene"}
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
            <p>Sample estimate · Confirm availability</p>
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
