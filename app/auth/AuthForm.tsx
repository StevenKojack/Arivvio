"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { createBrowserSupabaseClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { upsertProfile } from "@/lib/repositories/profilesRepository";

type AuthFormProps = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/account";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSignup = mode === "signup";

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");

    if (!hasSupabaseConfig()) {
      setError(
        "Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
      );
      return;
    }

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
            },
          },
        });

        if (signUpError) {
          throw signUpError;
        }

        if (data.user && data.session) {
          await upsertProfile(supabase, {
            email,
            fullName: fullName || null,
            userId: data.user.id,
          });
        }

        setStatus(
          "Check your email to confirm your account. After confirming, return to Arivvio and log in.",
        );
        router.refresh();
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

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
      className="mx-auto mt-10 grid max-w-xl gap-4 rounded-lg border border-neutral-200 bg-white p-6 shadow-[0_22px_60px_rgba(20,20,20,0.07)]"
    >
      {isSignup ? (
        <label className="grid gap-2 text-sm font-semibold text-neutral-800">
          Full name
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="h-12 rounded-lg border border-neutral-300 px-4 text-sm outline-none focus:border-neutral-950"
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
          className="h-12 rounded-lg border border-neutral-300 px-4 text-sm outline-none focus:border-neutral-950"
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
          className="h-12 rounded-lg border border-neutral-300 px-4 text-sm outline-none focus:border-neutral-950"
          placeholder="At least 6 characters"
        />
      </label>
      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {status}
        </p>
      ) : null}
      <button
        disabled={isSubmitting}
        className="h-12 rounded-full bg-[#ff5a5f] px-6 text-sm font-semibold text-white transition hover:bg-[#e84f54] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Working..." : isSignup ? "Create account" : "Log in"}
      </button>
      {!isSignup ? (
        <Link
          href="/auth/login"
          className="text-center text-sm font-semibold text-neutral-500"
        >
          Forgot password?
        </Link>
      ) : null}
      <p className="text-center text-sm text-neutral-500">
        {isSignup ? "Already have an account?" : "New to Arivvio?"}{" "}
        <Link
          className="font-semibold text-neutral-950"
          href={isSignup ? "/auth/login" : "/auth/signup"}
        >
          {isSignup ? "Log in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
