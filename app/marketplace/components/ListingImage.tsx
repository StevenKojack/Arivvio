"use client";

import { useState } from "react";
import Image from "next/image";

/** Keep unavailable remote photos from leaving broken images in discovery. */
export function ListingImage({ src, alt, sizes, className = "object-cover" }: { src: string; alt: string; sizes: string; className?: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const failed = failedSource === src;
  return <>
    <Image src={failed ? "/event-planning-hero.png" : src} alt={failed ? "Illustrative event setting" : alt} fill unoptimized sizes={sizes} className={className} onError={() => setFailedSource(src)} />
    {failed && <span className="absolute left-3 top-3 rounded-full ui-surface px-2 py-1 text-[10px]">Illustrative event image</span>}
  </>;
}
