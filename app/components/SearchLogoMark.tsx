import Image from "next/image";

type SearchLogoMarkProps = {
  theme?: "dark" | "light";
};

export function SearchLogoMark({ theme = "dark" }: SearchLogoMarkProps) {
  return (
    <span
      className={`hidden h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-[0_12px_28px_rgba(13,19,33,0.16)] sm:flex ${
        theme === "dark" ? "bg-[#0D1321]" : "bg-white"
      }`}
      aria-hidden="true"
    >
      <Image
        src={
          theme === "dark"
            ? "/logo-assets/web/arivvio-mark-dark.png"
            : "/logo-assets/web/arivvio-mark-light.png"
        }
        alt=""
        width={575}
        height={570}
        className="h-6 w-6 object-contain"
        priority={false}
      />
    </span>
  );
}
