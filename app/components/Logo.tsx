import Link from "next/link";
import Image from "next/image";

type LogoProps = {
  inverted?: boolean;
};

export function Logo({ inverted }: LogoProps) {
  return (
    <Link
      href="/"
      className="group inline-flex items-center rounded-[20px] transition duration-300 hover:-translate-y-0.5"
      aria-label="Arivvio home"
    >
      <Image
        src={
          inverted
            ? "/logo-assets/web/arivvio-logo-dark.png"
            : "/logo-assets/web/arivvio-logo-light.png"
        }
        alt="Arivvio"
        width={inverted ? 190 : 202}
        height={166}
        priority
        className={`h-14 w-auto object-contain transition duration-300 md:h-16 ${
          inverted
            ? "rounded-[14px] shadow-[0_14px_34px_rgba(0,0,0,0.18)]"
            : "rounded-[14px]"
        }`}
      />
    </Link>
  );
}
