"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isAdminEmail } from "@/lib/auth/roles";
import { getCurrentProfile } from "@/lib/repositories/profilesRepository";
import { getVendorBusinessesByOwner } from "@/lib/repositories/vendorsRepository";
import { createBrowserSupabaseClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { Logo } from "./Logo";

type SessionNavState = {
  email: string | null;
  hasVendorProfile: boolean;
  isAdmin: boolean;
  isLoggedIn: boolean;
};

const centerLinks = [
  { href: "/plan", label: "Plan Your Event" },
  { href: "/vendors", label: "Vendors" },
];

export function Navigation() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navState, setNavState] = useState<SessionNavState>({
    email: null,
    hasVendorProfile: false,
    isAdmin: false,
    isLoggedIn: false,
  });

  useEffect(() => {
    async function loadNavigationState() {
      if (!hasSupabaseConfig()) {
        return;
      }

      try {
        const supabase = createBrowserSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;

        if (!user) {
          return;
        }

        const profile = await getCurrentProfile(supabase, user);
        const vendorRows = profile
          ? await getVendorBusinessesByOwner(supabase, profile.id)
          : [];

        setNavState({
          email: user.email ?? null,
          hasVendorProfile: vendorRows.length > 0,
          isAdmin: isAdminEmail(user.email),
          isLoggedIn: true,
        });
      } catch {
        setNavState({
          email: null,
          hasVendorProfile: false,
          isAdmin: false,
          isLoggedIn: false,
        });
      }
    }

    loadNavigationState();
  }, []);

  const menuLinks = navState.isLoggedIn
    ? [
        { href: "/account", label: "Account", show: true },
        { href: "/account", label: "My events", show: true },
        {
          href: "/vendor/dashboard",
          label: "Vendor dashboard",
          show: navState.hasVendorProfile,
        },
        { href: "/admin", label: "Admin", show: navState.isAdmin },
        { href: "/auth/logout", label: "Log out", show: true },
      ]
    : [
        { href: "/auth/login", label: "Log in", show: true },
        { href: "/auth/signup", label: "Sign up", show: true },
        { href: "/?info=1", label: "Pre-Beta information", show: true },
        { href: "/support-project", label: "Contact Arivvio", show: true },
      ];
  const isInternalDemoRoute = pathname !== "/";

  useEffect(() => {
    if (isInternalDemoRoute) {
      window.sessionStorage.setItem("arivvio-demo-entered", "true");
    }
  }, [isInternalDemoRoute]);

  return (
    <header className="sticky top-0 z-30 border-b border-[#D4AF37]/10 bg-[#FFFCF7]/86 px-5 shadow-[0_10px_40px_rgba(13,19,33,0.055)] backdrop-blur-xl sm:px-8 lg:px-12">
      <nav className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4">
        <Logo />

        <div className="hidden items-center rounded-full border border-[#D4AF37]/18 bg-white/82 p-1 text-sm font-semibold text-neutral-700 shadow-[0_12px_34px_rgba(13,19,33,0.06)] backdrop-blur md:flex">
          {centerLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-5 py-2 transition hover:-translate-y-0.5 hover:bg-[#FFF8E1] hover:text-[#0D1321]"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {isInternalDemoRoute ? (
          <Link
            href="/?info=1"
            className="hidden rounded-full border border-[#D4AF37]/18 bg-[#FFF8E1] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#8A6A16] transition hover:-translate-y-0.5 hover:border-[#D4AF37]/50 lg:inline-flex"
          >
            Pre-Beta Demo
          </Link>
        ) : null}

        <div className="flex items-center gap-2">
          <Link
            href="/vendor/onboarding"
            className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[#0D1321] transition hover:-translate-y-0.5 hover:bg-white/80 md:inline-flex"
          >
            List your service
          </Link>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="inline-flex h-11 items-center gap-3 rounded-full border border-[#D4AF37]/20 bg-white/92 px-4 text-sm font-semibold text-[#0D1321] shadow-[0_12px_30px_rgba(13,19,33,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(13,19,33,0.12)]"
              aria-expanded={menuOpen}
            >
              <span className="grid gap-1">
                <span className="h-0.5 w-4 rounded-full bg-[#0D1321]" />
                <span className="h-0.5 w-4 rounded-full bg-[#0D1321]" />
                <span className="h-0.5 w-4 rounded-full bg-[#0D1321]" />
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0D1321] text-xs font-semibold text-[#D4AF37]">
                {navState.email?.[0]?.toUpperCase() ?? "A"}
              </span>
            </button>
            {menuOpen ? (
              <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-[24px] border border-[#D4AF37]/16 bg-white py-2 shadow-[0_24px_70px_rgba(13,19,33,0.14)]">
                {navState.email ? (
                  <p className="border-b border-neutral-100 px-4 py-3 text-xs font-semibold text-neutral-500">
                    {navState.email}
                  </p>
                ) : null}
                {menuLinks
                  .filter((item) => item.show)
                  .map((item) => (
                    <Link
                      key={`${item.href}-${item.label}`}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-[#FFF8E1] hover:text-[#0D1321]"
                    >
                      {item.label}
                    </Link>
                  ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            className="inline-flex h-11 items-center rounded-full border border-[#D4AF37]/25 bg-white/80 px-4 text-sm font-semibold text-[#0D1321] md:hidden"
          >
            Menu
          </button>
        </div>
      </nav>

      {mobileOpen ? (
        <div className="mx-auto grid max-w-7xl gap-2 border-t border-neutral-100 py-4 md:hidden">
          {[
            ...centerLinks,
            { href: "/vendor/onboarding", label: "List your service" },
            { href: "/?info=1", label: "Pre-Beta information" },
            { href: "/support-project", label: "Contact Arivvio" },
          ]
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
              >
                {item.label}
              </Link>
            ))}
        </div>
      ) : null}
    </header>
  );
}
