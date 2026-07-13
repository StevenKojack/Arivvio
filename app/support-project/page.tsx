import type { Metadata } from "next";
import Link from "next/link";
import { SupportProjectForm } from "../components/SupportProjectForm";

export const metadata: Metadata = {
  title: "Contact Arivvio | Pre-Beta Demo",
  description:
    "Contact the Arivvio team about investing, funding, collaboration, early vendor participation, feedback, or professional support.",
};

export default function SupportProjectPage() {
  return (
    <main className="min-h-screen bg-[#F7F4EC] px-5 py-8 text-[#0D1321] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/?info=1"
          className="inline-flex rounded-full border border-[#D4AF37]/20 bg-white px-4 py-2 text-sm font-semibold text-[#0D1321] shadow-[0_12px_30px_rgba(13,19,33,0.06)] transition hover:-translate-y-0.5 hover:border-[#D4AF37]/50"
        >
          Back to Pre-Beta information
        </Link>

        <section className="mt-8 rounded-[34px] border border-[#D4AF37]/16 bg-[#FFFCF7] p-6 shadow-[0_28px_90px_rgba(13,19,33,0.08)] sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8A6A16]">
            Contact Arivvio
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
            Help build the future of event planning.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-600">
            Use this form for investment, funding, collaboration, early vendor
            interest, feedback, professional services, contributor interest, or
            general contact.
          </p>
          <div className="mt-8">
            <SupportProjectForm sourcePage="support_project_page" />
          </div>
        </section>
      </div>
    </main>
  );
}
