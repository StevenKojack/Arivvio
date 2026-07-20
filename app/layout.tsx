import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arivvio | Plan any event in one place",
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
