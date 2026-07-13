import { Suspense } from "react";
import { AuthForm } from "../AuthForm";
import { Footer } from "../../components/Footer";
import { Navigation } from "../../components/Navigation";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-[#F6F3EA] text-neutral-950">
      <Navigation />
      <section className="px-6 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B88A1D]">
            Create account
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
            Create your Arivvio account.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-600">
            Start as a planner. You can list services later from your account.
          </p>
          <Suspense fallback={<div className="mt-10 text-sm font-semibold text-neutral-500">Loading signup...</div>}>
            <AuthForm mode="signup" />
          </Suspense>
        </div>
      </section>
      <Footer />
    </main>
  );
}
