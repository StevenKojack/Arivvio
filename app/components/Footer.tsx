import Link from "next/link";
import { Logo } from "./Logo";
import {
  configuredLinkedInUrl,
  footerGroups,
} from "@/lib/public-navigation/links";
export function Footer() {
  const linkedIn = configuredLinkedInUrl(
    process.env.NEXT_PUBLIC_ARIVVIO_LINKEDIN_URL,
  );
  return (
    <footer className="site-footer px-6 py-12 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="footer-grid">
          <div>
            <Logo inverted />
            <p className="mt-5 max-w-xs text-sm leading-6 text-slate-300">
              Find your event team.
              <br />
              Keep the details together.
            </p>
          </div>
          {footerGroups.map(([title, links]) => (
            <nav key={title} aria-label={title} className="min-w-0">
              <h2 className="text-sm font-semibold">{title}</h2>
              <ul className="mt-4 space-y-1">
                {links.map(([name, href]) => (
                  <li key={name}>
                    <Link
                      href={href}
                      className="inline-flex min-h-11 items-center py-2 text-sm text-slate-300 hover:text-white"
                    >
                      {name}
                    </Link>
                  </li>
                ))}
                {title === "Company" && linkedIn && (
                  <li>
                    <a
                      className="inline-flex min-h-11 items-center py-2 text-sm text-slate-300 hover:text-white"
                      href={linkedIn}
                      target="_blank"
                      rel="noreferrer"
                    >
                      LinkedIn
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                )}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap justify-between gap-3 border-t border-white/15 pt-6 text-xs text-slate-300">
          <p>© 2026 Arivvio</p>
          <p>Pre-beta. Payments are not connected.</p>
        </div>
      </div>
    </footer>
  );
}
