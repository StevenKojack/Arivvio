import Link from "next/link";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";
import { AccountDashboard } from "./AccountDashboard";

export default function AccountPage() {
  return (
    <main className="min-h-screen bg-[#F6F3EA] text-neutral-950">
      <Navigation />
      <section className="px-6 py-16 sm:px-8 lg:px-12">
        <div className="hub-card mx-auto mb-6 max-w-7xl p-5"><h2 className="text-lg font-semibold">Your demo event requests</h2><p className="mt-2 text-sm ui-muted">Your browser-saved requests are available with or without an account.</p><Link className="hub-button mt-4" href="/requests">Open saved requests</Link></div>
        <AccountDashboard />
      </section>
      <Footer />
    </main>
  );
}
