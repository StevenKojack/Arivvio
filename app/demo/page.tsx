import type { Metadata } from "next";
import { DemoHomePage } from "../components/DemoHomePage";

export const metadata: Metadata = {
  title: "Arivvio Demo | Event Planning Workspace",
  description:
    "Explore the Arivvio pre-beta demo workspace for event planning, vendor discovery, quote concepts, and maps.",
  robots: {
    follow: false,
    index: false,
  },
};

export default function DemoPage() {
  return <DemoHomePage />;
}
