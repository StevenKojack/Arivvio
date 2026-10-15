import Image from "next/image";
import { atmosphereImage, eventAtmospheres, type Atmosphere } from "@/lib/event-intelligence/atmosphere";

export function EventAtmosphere({ priority = false, atmosphere = eventAtmospheres[0], sizes = "100vw" }: { priority?: boolean; atmosphere?: Atmosphere; sizes?: string }) {
  return <Image src={atmosphereImage(atmosphere)} alt={atmosphere.alt} fill unoptimized priority={priority} sizes={sizes} className="object-cover" style={{ objectPosition: atmosphere.position }} />;
}
