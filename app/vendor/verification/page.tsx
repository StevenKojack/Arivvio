import { Navigation } from "@/app/components/Navigation";
import { VerificationCenter } from "./VerificationCenter";
export const metadata = { title: "Business Verification | ARIVVIO" };
export default function Page() {
  return (
    <main className="customer-experience min-h-screen ui-page ui-text">
      <Navigation />
      <div className="mx-auto max-w-4xl px-5 py-12">
        <h1 className="text-4xl font-semibold">Business verification</h1>
        <VerificationCenter />
      </div>
    </main>
  );
}
