import Link from "next/link";

type LogoProps = {
  inverted?: boolean;
};

export function Logo({ inverted }: LogoProps) {
  return (
    <Link href="/" className="group inline-flex items-center gap-3">
      <span
        className={`relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-[18px] shadow-[0_18px_38px_rgba(13,19,33,0.18)] ring-1 transition duration-300 group-hover:-translate-y-0.5 ${
          inverted
            ? "bg-white/8 text-[#D4AF37] ring-white/15"
            : "bg-[linear-gradient(135deg,#0D1321,#16233B)] text-[#D4AF37] ring-[#D4AF37]/20"
        }`}
      >
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_34%_24%,rgba(255,255,255,0.16),transparent_34%)]" />
        <svg
          aria-hidden="true"
          className="relative h-8 w-8 drop-shadow-[0_4px_10px_rgba(212,175,55,0.24)]"
          viewBox="0 0 48 48"
          fill="none"
        >
          <path
            d="M7 35 20.8 9.8c1.4-2.6 5-2.6 6.4 0L41 35"
            stroke="currentColor"
            strokeWidth="5.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 35 17.5 28.5M39 35 30.5 28.5"
            stroke="currentColor"
            strokeWidth="5.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="m17.8 21.2 6.2 8.2 6.2-8.2"
            stroke="currentColor"
            strokeWidth="4.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="m18.8 30.4 5.2 6.8 5.2-6.8"
            stroke="currentColor"
            strokeWidth="4.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.86"
          />
        </svg>
      </span>
      <span
        className={`hidden text-[1.08rem] font-semibold uppercase tracking-[0.34em] sm:inline ${
          inverted ? "text-white" : "text-neutral-950"
        }`}
      >
        Arivvio
      </span>
    </Link>
  );
}
