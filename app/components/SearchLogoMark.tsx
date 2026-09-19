import { ArivvioSymbol } from "./Logo";
export function SearchLogoMark({ theme = "light" }: { theme?: "dark" | "light" }) {
  return <span className={`search-symbol hidden shrink-0 sm:block search-symbol-${theme}`} aria-hidden="true"><ArivvioSymbol /></span>;
}
