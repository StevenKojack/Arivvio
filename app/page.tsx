import type { Metadata } from "next";
import { Suspense } from "react";
import { PreBetaGateway } from "./components/PreBetaGateway";

export const metadata: Metadata = {
  title: "Arivvio | Pre-Beta Event Planning Demo",
  description:
    "Explore Arivvio, an early demonstration of a unified event planning marketplace for venues, vendors, quotes, maps, and event organization.",
};

export default function PreBetaGatewayPage() {
  return (
    <Suspense fallback={<GatewayFallback />}>
      <PreBetaGateway />
    </Suspense>
  );
}

function GatewayFallback() {
  return (
    <main className="min-h-screen bg-[#F7F4EC] text-[#0D1321]">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center px-6">
        <p className="rounded-full border border-[#D4AF37]/20 bg-white px-5 py-3 text-sm font-semibold shadow-[0_18px_50px_rgba(13,19,33,0.08)]">
          Loading Arivvio Pre-Beta Demo...
        </p>
      </div>
    </main>
  );
}
