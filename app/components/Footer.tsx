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
          <Link className="transition hover:text-[#D4AF37]" href="/#categories">
            Categories
          </Link>
          <Link className="transition hover:text-[#D4AF37]" href="/marketplace">
            Marketplace
          </Link>
          <Link className="transition hover:text-[#D4AF37]" href="/account">
            Account
          </Link>
          <Link className="transition hover:text-[#D4AF37]" href="/">
            Home
          </Link>
          <Link className="transition hover:text-[#D4AF37]" href="/discover">
            Start Planning
          </Link>
        </div>
      </div>
    </footer>
  );
}
