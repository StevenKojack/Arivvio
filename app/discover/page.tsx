import { Suspense } from "react";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";
import { EventWizard } from "./EventWizard";

export default function DiscoverPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#FFFCF7,#F6F3EA)] text-neutral-950">
      <Navigation />
      <Suspense fallback={<DiscoveryLoading />}>
        <EventWizard />
      </Suspense>
      <Footer />
    </main>
  );
}

function DiscoveryLoading() {
  return (
    <section className="px-6 py-16 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl rounded-[24px] border border-[#D4AF37]/16 bg-white p-8 text-sm font-semibold text-neutral-500 shadow-[0_18px_48px_rgba(13,19,33,0.06)]">
        Loading event discovery...
      </div>
    </section>
  );
}
