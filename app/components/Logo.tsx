import Link from "next/link";

type LogoProps = {
  inverted?: boolean;
};

export function Logo({ inverted }: LogoProps) {
  return (
    <Link href="/" className="group inline-flex items-center gap-3">
      <span
        className={`relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl shadow-[0_18px_38px_rgba(20,20,20,0.18)] ring-1 ring-white/40 transition duration-300 group-hover:-translate-y-0.5 ${
          inverted
            ? "bg-white text-neutral-950"
            : "bg-[linear-gradient(135deg,#111111,#3a2522)] text-white"
        }`}
      >
        <span className="absolute inset-x-2 top-2 h-2 rounded-full bg-[#ff6b61]" />
        <span className="absolute -bottom-4 -right-3 h-8 w-8 rounded-full bg-white/10" />
        <span className="relative text-lg font-semibold tracking-tight">A</span>
      </span>
      <span
        className={`text-2xl font-semibold tracking-tight ${
          inverted ? "text-white" : "text-neutral-950"
        }`}
      >
        Arivvio
      </span>
    </Link>
  );
}
