import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";
import { VendorsEntry } from "./VendorsEntry";

export default function VendorsPage() {
  return (
    <main className="min-h-screen overflow-x-clip bg-[#FFFCF7] text-[#0D1321]">
      <Navigation />
      <VendorsEntry />
      <Footer />
    </main>
  );
}
