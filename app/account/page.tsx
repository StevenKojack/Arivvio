import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";
import { AccountDashboard } from "./AccountDashboard";

export default function AccountPage() {
  return (
    <main className="min-h-screen bg-[#F6F3EA] text-neutral-950">
      <Navigation />
      <section className="px-6 py-16 sm:px-8 lg:px-12">
        <AccountDashboard />
      </section>
      <Footer />
    </main>
  );
}
