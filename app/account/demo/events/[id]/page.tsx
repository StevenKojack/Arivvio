import { Navigation } from "@/app/components/Navigation";
import { CustomerDemoHub } from "../../CustomerDemoHub";
export default async function CustomerEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main id="main-content" tabIndex={-1} className="min-h-screen ui-soft ui-text"><Navigation /><CustomerDemoHub eventId={id} /></main>;
}
