import Link from "next/link";
import Image from "next/image";
export function BrandMark({ inverted = false }: { inverted?: boolean }) {
  return <span className="inline-flex items-center gap-3">
    <Image src="/logo-assets/web/arivvio-mark-light.png" alt="" width={48} height={48} className={`brand-logo ${inverted ? "hidden" : "brand-light"}`} />
    <Image src="/logo-assets/web/arivvio-mark-dark.png" alt="" width={48} height={48} className={`brand-logo ${inverted ? "" : "brand-dark"}`} />
    <span className="text-xl font-semibold tracking-[.12em]">ARIVVIO</span>
  </span>;
}
export function Logo({ inverted }: { inverted?: boolean }) {
  return <Link href="/" className="inline-flex items-center" aria-label="Arivvio home"><BrandMark inverted={inverted} /></Link>;
}
