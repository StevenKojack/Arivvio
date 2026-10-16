"use client";
import { useEffect, useState } from "react";
import { loadDemoQuoteRequests, type DemoQuoteRequest } from "@/lib/event-intelligence/demo-quotes";
export function useVendorInquiries() {
  const [requests, setRequests] = useState<DemoQuoteRequest[]>([]);
  useEffect(() => {
    const refresh = () => setRequests(loadDemoQuoteRequests());
    queueMicrotask(refresh);
    for (const name of ["arivvio:customer-changed", "focus", "storage"]) window.addEventListener(name, refresh);
    return () => { for (const name of ["arivvio:customer-changed", "focus", "storage"]) window.removeEventListener(name, refresh); };
  }, []);
  return requests.flatMap(request => request.opportunities.filter(item => item.providerId === "49").map(item => ({request,item})));
}
