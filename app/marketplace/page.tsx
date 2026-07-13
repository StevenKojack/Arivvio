import { Suspense } from "react";
import { Navigation } from "../components/Navigation";
import { MarketplaceBrowser } from "./MarketplaceBrowser";

export default function MarketplacePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#FFFCF7,#F7F4EC)] text-neutral-950">
      <Navigation />
      <section className="w-full px-3 pb-4 pt-3 sm:px-4">
        <Suspense fallback={<MarketplaceLoading />}>
          <MarketplaceBrowser />
        </Suspense>
      </section>
    </main>
  );
}

function MarketplaceLoading() {
  return (
    <div className="rounded-[24px] border border-[#D4AF37]/16 bg-white p-8 text-sm font-semibold text-neutral-500 shadow-[0_18px_48px_rgba(13,19,33,0.06)]">
      Loading marketplace...
    </div>
  );
}
