import type { Metadata } from "next";
import { Navigation } from "../components/Navigation";
import { ClaimSearch } from "./ClaimSearch";
export const metadata: Metadata = {
  title: "Claim Your Business | ARIVVIO",
  description:
    "Find your business on ARIVVIO and request ownership of your existing listing. Claims are reviewed before access is granted.",
};
export default function ClaimBusinessPage() {
  return (
    <main id="main-content" tabIndex={-1} className="customer-experience min-h-screen ui-page ui-text">
      <Navigation />
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="eyebrow">For business owners</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          Claim your business.
        </h1>
        <p className="mt-5 text-lg leading-8 ui-muted">
          Find your business on ARIVVIO and claim your listing.
        </p>
        <p className="mt-3 text-sm leading-7 ui-muted">
          Choose your existing profile, sign in and tell us how to verify your
          ownership. Our team reviews every claim before granting access.
        </p>
        <ClaimSearch />
      </div>
    </main>
  );
}
