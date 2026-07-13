"use client";

import { FormEvent, useMemo, useState } from "react";
import { createProjectInquiry } from "@/lib/repositories/projectInquiriesRepository";
import {
  createBrowserSupabaseClient,
  hasSupabaseConfig,
} from "@/lib/supabase/client";

const CONTACT_EMAIL = "stevenkojack2003@gmail.com";

const interestOptions = [
  "Invest",
  "Fund",
  "Collaborate",
  "Become an early vendor",
  "Offer professional services",
  "Join as a contributor",
  "Provide feedback",
  "General contact",
];

type SupportProjectFormProps = {
  sourcePage?: string;
};

export function SupportProjectForm({
  sourcePage = "prebeta_gateway",
}: SupportProjectFormProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [interestTypes, setInterestTypes] = useState<string[]>([]);
  const [preferredContactMethod, setPreferredContactMethod] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mailtoHref = useMemo(() => {
    const subject = encodeURIComponent("Arivvio project inquiry");
    const body = encodeURIComponent(
      [
        `Name: ${fullName}`,
        `Email: ${email}`,
        `Organization: ${organization || "Not provided"}`,
        `Interest: ${interestTypes.join(", ") || "Not selected"}`,
        `Preferred contact: ${preferredContactMethod || "Not provided"}`,
        "",
        message,
      ].join("\n"),
    );

    return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  }, [email, fullName, interestTypes, message, organization, preferredContactMethod]);

  function toggleInterest(interest: string) {
    setInterestTypes((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
    );
  }

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");

    if (!fullName.trim()) {
      setError("Please add your full name.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please add a valid email address.");
      return;
    }

    if (!interestTypes.length) {
      setError("Please choose at least one reason for contacting Arivvio.");
      return;
    }

    if (message.trim().length < 10) {
      setError("Please add a short message so the team knows how to help.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (!hasSupabaseConfig()) {
        throw new Error("Supabase is not configured for inquiries yet.");
      }

      await createProjectInquiry(createBrowserSupabaseClient(), {
        email: email.trim(),
        fullName: fullName.trim(),
        interestTypes,
        message: message.trim(),
        organization: organization.trim(),
        preferredContactMethod: preferredContactMethod.trim(),
        sourcePage,
      });

      setStatus(
        "Thank you. Your inquiry was received. The Arivvio team can follow up from here.",
      );
      setFullName("");
      setEmail("");
      setOrganization("");
      setInterestTypes([]);
      setPreferredContactMethod("");
      setMessage("");
    } catch {
      setStatus(
        "The inquiry database is not ready yet. Your email app will open with the message prepared.",
      );
      window.location.href = mailtoHref;
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={submitInquiry} className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-neutral-800">
          Full name
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="h-12 rounded-2xl border border-[#D4AF37]/20 bg-white px-4 text-sm outline-none transition focus:border-[#D4AF37]"
            placeholder="Your name"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-neutral-800">
          Email
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-12 rounded-2xl border border-[#D4AF37]/20 bg-white px-4 text-sm outline-none transition focus:border-[#D4AF37]"
            placeholder="you@example.com"
            type="email"
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-semibold text-neutral-800">
        Organization <span className="font-medium text-neutral-500">Optional</span>
        <input
          value={organization}
          onChange={(event) => setOrganization(event.target.value)}
          className="h-12 rounded-2xl border border-[#D4AF37]/20 bg-white px-4 text-sm outline-none transition focus:border-[#D4AF37]"
          placeholder="Company, fund, studio, venue, or team"
        />
      </label>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-semibold text-neutral-800">
          How would you like to help?
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {interestOptions.map((interest) => {
            const selected = interestTypes.includes(interest);

            return (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition hover:-translate-y-0.5 ${
                  selected
                    ? "border-[#0D1321] bg-[#0D1321] text-white"
                    : "border-[#D4AF37]/16 bg-[#FFFCF7] text-neutral-700 hover:border-[#D4AF37]/50"
                }`}
                aria-pressed={selected}
              >
                {interest}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="grid gap-2 text-sm font-semibold text-neutral-800">
        Preferred contact method <span className="font-medium text-neutral-500">Optional</span>
        <input
          value={preferredContactMethod}
          onChange={(event) => setPreferredContactMethod(event.target.value)}
          className="h-12 rounded-2xl border border-[#D4AF37]/20 bg-white px-4 text-sm outline-none transition focus:border-[#D4AF37]"
          placeholder="Email, phone, video call, or other"
        />
      </label>

      <label className="grid gap-2 text-sm font-semibold text-neutral-800">
        Short message
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="min-h-32 resize-y rounded-2xl border border-[#D4AF37]/20 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#D4AF37]"
          placeholder="Tell us who you are and what you would like to discuss."
        />
      </label>

      {error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="rounded-2xl bg-[#FFF8E1] px-4 py-3 text-sm font-semibold text-[#8A6A16]">
          {status}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-neutral-500">
          If the inquiry database is unavailable, this form opens a prepared
          email instead.
        </p>
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-12 rounded-full bg-[#0D1321] px-6 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(13,19,33,0.18)] transition hover:-translate-y-0.5 hover:bg-[#111A2E] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {isSubmitting ? "Sending..." : "Send inquiry"}
        </button>
      </div>
    </form>
  );
}
