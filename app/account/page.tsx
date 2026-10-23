import Link from "next/link";
import { Navigation } from "../components/Navigation";
import { AccountDashboard } from "./AccountDashboard";

export default function AccountPage() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen ui-soft ui-text">
      <Navigation />
      <section className="px-6 py-16 sm:px-8 lg:px-12">

        <AccountDashboard /><p className="mx-auto mt-8 max-w-7xl text-sm ui-muted">Planning on this device? <Link href="/account/demo" className="underline">Open your demo events</Link></p>
      </section>
    </main>
  );
}
