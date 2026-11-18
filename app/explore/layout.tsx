import { notFound } from "next/navigation";
import { directionEnabled } from "./model";
export default function Layout({ children }: { children: React.ReactNode }) {
  if (!directionEnabled()) notFound();
  return children;
}
