import type { Metadata } from "next";
import "./globals.css";
import "./experience.css";
import { ExperienceProvider } from "./components/Experience";
import { Footer } from "./components/Footer";
import { EventAssistant } from "./components/EventAssistant";
import { ThemeInitializer } from "./components/ThemeControl";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.arivvio.com"),
  title: "Arivvio | Plan your event, keep it together",
  openGraph: { title: "Arivvio | Your event, together", description: "Find venues and vendors, compare estimates, and keep your event in one plan.", siteName: "Arivvio", type: "website" },
  twitter: { card: "summary_large_image" },
  applicationName: "Arivvio",
  appleWebApp: { capable: true, title: "Arivvio", statusBarStyle: "default" },
  description:
    "Find venues and vendors, compare estimates, and keep your event details together with Arivvio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const enabled = process.env.ARIVVIO_NEXT_EXPERIENCE === "true" ||
    (process.env.ARIVVIO_NEXT_EXPERIENCE === undefined &&
      process.env.VERCEL_ENV === "preview" &&
      process.env.VERCEL_GIT_COMMIT_REF === "codex/arivvio-next-generation-revamp");
  return (
    <html
      lang="en" data-experience={enabled ? "next" : undefined}
      className="h-full antialiased"
      data-build-commit={process.env.VERCEL_GIT_COMMIT_SHA ?? "local"}
    >
      <body className="min-h-full flex flex-col"><a className="skip-link" href="#main-content">Skip to main content</a><ExperienceProvider enabled={enabled}>{children}</ExperienceProvider><Footer /><ThemeInitializer /><EventAssistant /></body>
    </html>
  );
}
