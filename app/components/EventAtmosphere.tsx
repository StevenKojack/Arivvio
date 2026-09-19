import Image from "next/image";

// Existing application photography, shared to connect the lobby and demo entry.
export function EventAtmosphere({ priority = false }: { priority?: boolean }) {
  return <Image src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1600&q=85" alt="An event table set with colorful flowers, glassware, and place settings" fill unoptimized priority={priority} sizes="(max-width: 768px) 100vw, 60vw" className="object-cover" />;
}
