import { Suspense } from "react";
import { Navigation } from "../components/Navigation";
import { MarketplaceBrowser } from "./MarketplaceBrowser";

export default function MarketplacePage() {
  return (
    <main className="customer-experience min-h-screen ui-page">
      <Navigation />
      <section className="mx-auto max-w-[1600px] px-4 pb-4 pt-5 sm:px-8">
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
