"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient, hasSupabaseConfig } from "@/lib/supabase/client";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    async function logout() {
      if (hasSupabaseConfig()) {
        await createBrowserSupabaseClient().auth.signOut();
      }

      router.push("/");
      router.refresh();
    }

    logout();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F3EA] px-6 text-neutral-950">
      <p className="text-sm font-semibold text-neutral-600">Signing out...</p>
    </main>
  );
}
