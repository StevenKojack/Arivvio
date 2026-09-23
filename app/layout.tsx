import type { Metadata } from "next";
import "./globals.css";
import { Footer } from "./components/Footer";
import { EventAssistant } from "./components/EventAssistant";
import { ThemeControl } from "./components/ThemeControl";

export const metadata: Metadata = {
  title: "Arivvio | Plan any event in one place",
  applicationName: "Arivvio",
  appleWebApp: { capable: true, title: "Arivvio", statusBarStyle: "default" },
  description:
    "Find venues, vendors, entertainment, rentals, invitations, and more with Arivvio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      data-build-commit={process.env.VERCEL_GIT_COMMIT_SHA ?? "local"}
    >
      <body className="min-h-full flex flex-col">{children}<Footer /><ThemeControl /><EventAssistant /></body>
    </html>
  );
}
