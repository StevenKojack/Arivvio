import type { Metadata } from "next";
import "./globals.css";
import localFont from "next/font/local";

const arivvioSans = localFont({ src: "../node_modules/next/dist/next-devtools/server/font/geist-latin.woff2", variable: "--font-arivvio", display: "swap", weight: "100 900" });
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
  return (
    <html
      lang="en"
      className={`${arivvioSans.variable} h-full antialiased`}
      data-build-commit={process.env.VERCEL_GIT_COMMIT_SHA ?? "local"}
    >
      <body className="min-h-full flex flex-col">{children}<Footer /><ThemeInitializer /><EventAssistant /></body>
    </html>
  );
}
