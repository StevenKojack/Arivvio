import { Suspense } from "react";
import { AuthForm } from "../AuthForm";
import { Footer } from "../../components/Footer";
import { Navigation } from "../../components/Navigation";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f5] text-neutral-950">
      <Navigation />
      <section className="px-6 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e24b44]">
            Welcome back
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
            Log in to Arivvio.
          </h1>
          <Suspense fallback={<div className="mt-10 text-sm font-semibold text-neutral-500">Loading login...</div>}>
            <AuthForm mode="login" />
          </Suspense>
        </div>
      </section>
      <Footer />
    </main>
  );
}
