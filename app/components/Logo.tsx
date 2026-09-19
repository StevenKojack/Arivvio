import Link from "next/link";

// The existing A / double-V mark, expressed as transparent vector strokes.
// No background, cropping, or decorative container; wordmark inherits contrast.
export function ArivvioSymbol() {
  return <svg viewBox="220 10 520 560" fill="none" aria-hidden="true" className="brand-symbol">
    <g stroke="currentColor" strokeWidth="42" strokeLinecap="round" strokeLinejoin="round">
      <path d="M358 500 L300 535 Q241 557 256 502 L452 69 Q480 12 506 69 L701 502 Q723 557 661 535 L601 502" />
      <path d="M291 324 Q393 382 480 533 Q564 393 670 324" />
      <path d="M438 326 L479 386 L521 326" />
    </g>
  </svg>;
}
export function BrandMark({ inverted = false }: { inverted?: boolean }) {
  return <span className={`brand-wordmark ${inverted ? "brand-inverted" : ""}`}><ArivvioSymbol /><span>ARIVVIO</span></span>;
}
export function Logo({ inverted }: { inverted?: boolean }) {
  return <Link href="/" className="inline-flex items-center" aria-label="Arivvio home"><BrandMark inverted={inverted} /></Link>;
}
