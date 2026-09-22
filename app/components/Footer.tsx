import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-[#D4AF37]/16 bg-[#0D1321] px-6 py-10 text-white sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Logo inverted />
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#D4AF37]">
            Elevate every event
          </p>
          <p className="mt-2 text-sm text-neutral-400">
            The modern marketplace for planning every event.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-neutral-300">
          <Link className="transition hover:text-[#D4AF37]" href="/demo#categories">
            Categories
          </Link>
          <Link className="transition hover:text-[#D4AF37]" href="/plan">
            Plan Your Event
          </Link>
          <Link className="transition hover:text-[#D4AF37]" href="/vendors">
            Vendors
          </Link>
          <Link className="transition hover:text-[#D4AF37]" href="/account">
            Account
          </Link>
          <Link className="transition hover:text-[#D4AF37]" href="/">
            Home
          </Link>
          <Link className="transition hover:text-[#D4AF37]" href="/marketplace">
            Marketplace
          </Link>
        </div>
      </div>
      <div className="mx-auto mt-8 flex max-w-7xl flex-wrap justify-between gap-4 border-t border-white/15 pt-6 text-xs text-neutral-300"><p>Copyright © 2026 Arivvio. All rights reserved.</p><nav aria-label="Legal"><Link className="mr-5" href="/privacy">Privacy Policy</Link><Link className="mr-5" href="/terms">Terms of Use</Link><Link href="/legal">Legal</Link></nav></div>
    </footer>
  );
}
