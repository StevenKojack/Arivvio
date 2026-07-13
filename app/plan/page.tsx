import { EventDiscoverySearch } from "../components/EventDiscoverySearch";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";

const suggestionGroups = [
  "Birthday Party",
  "Quinceañera",
  "Wedding",
  "Armenian Christening",
  "Backyard Barbecue",
  "Graduation Party",
  "Corporate Dinner",
  "Bachelor Party",
  "Funeral Reception",
  "Family Reunion",
  "Sweet 16",
  "Pool Party",
];

export default function PlanPage() {
  return (
    <main className="min-h-screen overflow-x-clip bg-[#FFFCF7] text-[#0D1321]">
      <Navigation />
      <section className="px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#8A6A16]">
            Plan your event
          </p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight text-[#0D1321] sm:text-6xl lg:text-7xl">
            What are you planning?
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-neutral-600 sm:text-lg">
            Type it naturally. Arivvio will turn the idea into one calm,
            guided plan.
          </p>
          <div className="mt-9">
            <EventDiscoverySearch />
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-5xl">
          <p className="text-center text-sm font-semibold text-neutral-500">
            Popular starting points
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {suggestionGroups.map((suggestion) => (
              <a
                key={suggestion}
                href={`/discover?query=${encodeURIComponent(suggestion)}`}
                className="rounded-full border border-[#D4AF37]/16 bg-white/82 px-4 py-2 text-sm font-semibold text-neutral-700 shadow-[0_12px_28px_rgba(13,19,33,0.04)] transition hover:-translate-y-0.5 hover:border-[#D4AF37]/50 hover:text-[#0D1321]"
              >
                {suggestion}
              </a>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
