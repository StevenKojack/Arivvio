"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { createBrowserSupabaseClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { ensureCurrentProfile } from "@/lib/repositories/profilesRepository";

import { legalVersions } from "@/lib/privacy/config";

type AuthFormProps = {
  mode: "login" | "signup";
  defaultNext?: string;
};

export function AuthForm({ mode, defaultNext = "/account" }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get("next") ?? defaultNext;
  const nextPath = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/account";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accepted,setAccepted] = useState(false);
  const [adult,setAdult] = useState(false);
  const isSignup = mode === "signup";

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");

    if (!hasSupabaseConfig()) {
      setError(
        "Account access is not available in this preview yet. You can still explore the demo without signing in.",
      );
      return;
    }

    if (isSignup && (!accepted || !adult)) { setError("Confirm the Terms, Privacy acknowledgement and age 18+ before creating an account."); return; }
    setIsSubmitting(true);

    try {
      const supabase = createBrowserSupabaseClient();

      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              legal_acceptance: { terms_version: legalVersions.terms, privacy_version: legalVersions.privacy, accepted, adult },
            },
          },
        });

        if (signUpError) {
          throw signUpError;
        }

        if (data.user && data.session) {
          await ensureCurrentProfile(supabase, data.user);
        }

        setStatus(
          "Check your email to confirm your account, then return here to log in. Your browser plan stays on this device until you confirm saving it.",
        );
        if (data.session) router.push(nextPath);
        router.refresh();
        return;
      }

      const { data: signedIn, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (signedIn.user) await ensureCurrentProfile(supabase, signedIn.user);
      router.push(nextPath);
      router.refresh();
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "We could not complete that request. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submitAuth}
      className="mx-auto mt-10 grid max-w-xl gap-4 rounded-[28px] border border-[#D4AF37]/16 bg-white p-6 shadow-[0_22px_60px_rgba(13,19,33,0.07)]"
    >
      {isSignup ? (
        <div className="rounded-2xl border border-[#D4AF37]/18 bg-[#FFF8E1] px-4 py-3 text-left text-sm leading-6 text-[#8A6A16]">
          <p className="font-semibold text-[#0D1321]">
            Your planning account
          </p>
          <p className="mt-1">
            Save events, manage requests and message claimed providers. Demo providers and their conversations are simulated. Payments are not connected.
          </p>
        </div>
      ) : null}
      {isSignup ? (
        <label className="grid gap-2 text-sm font-semibold text-neutral-800">
          Full name
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="h-12 rounded-2xl border border-[#D4AF37]/20 px-4 text-sm outline-none focus:border-[#D4AF37]"
            placeholder="Your name"
          />
        </label>
      ) : null}
      <label className="grid gap-2 text-sm font-semibold text-neutral-800">
        Email
        <input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-12 rounded-2xl border border-[#D4AF37]/20 px-4 text-sm outline-none focus:border-[#D4AF37]"
          placeholder="you@example.com"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-neutral-800">
        Password
        <input
          required
          minLength={6}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-12 rounded-2xl border border-[#D4AF37]/20 px-4 text-sm outline-none focus:border-[#D4AF37]"
          placeholder="At least 6 characters"
        />
      </label>
      {isSignup && <fieldset className="space-y-4 text-sm"><legend className="sr-only">Account agreements</legend><label className="flex items-start gap-3"><input type="checkbox" required checked={accepted} onChange={e=>setAccepted(e.target.checked)}/><span>I accept the <Link href="/terms" target="_blank" className="underline">Terms of Use (new tab)</Link> and acknowledge the <Link href="/privacy" target="_blank" className="underline">Privacy Policy (new tab)</Link>.</span></label><label className="flex items-start gap-3"><input type="checkbox" required checked={adult} onChange={e=>setAdult(e.target.checked)}/><span>I am at least 18 years old.</span></label></fieldset>}
      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}
      {status ? (
        <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {status}
        </p>
      ) : null}
      <button
        disabled={isSubmitting}
        className="h-12 rounded-full bg-[#0D1321] px-6 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(13,19,33,0.18)] transition hover:bg-[#111A2E] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Working..." : isSignup ? "Create account" : "Log in"}
      </button>
      <Link href="/demo" className="text-center text-sm font-semibold text-neutral-500">Explore without an account</Link>
      <p className="text-center text-sm text-neutral-500">
        {isSignup ? "Already have an account?" : "New to Arivvio?"}{" "}
        <Link
          className="font-semibold text-[#8A6A16]"
          href={`${isSignup ? "/auth/login" : "/auth/signup"}?next=${encodeURIComponent(nextPath.startsWith("/vendor") && !isSignup ? "/vendor/onboarding" : nextPath)}`}
        >
          {isSignup ? "Log in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
