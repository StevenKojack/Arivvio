"use client";
import { useEffect, useState } from "react";
import type { MarketplaceItem } from "../data/marketplace";
import { getMarketplaceProviders } from "@/lib/repositories/marketplaceRepository";
import {
  createBrowserSupabaseClient,
  hasSupabaseConfig,
} from "@/lib/supabase/client";
export function usePublicRecords() {
  const [records, setRecords] = useState<MarketplaceItem[]>([]),
    [status, setStatus] = useState("Loading business listings…");
  useEffect(() => {
    let live = true;
    async function read() {
      if (!hasSupabaseConfig()) throw Error();
      const items = await getMarketplaceProviders(
        createBrowserSupabaseClient(),
      );
      if (live) {
        setRecords(items);
        setStatus("");
      }
    }
    read().catch(() => {
      if (live) setStatus("Live business listings are unavailable.");
    });
    return () => {
      live = false;
    };
  }, []);
  return { records, status };
}
