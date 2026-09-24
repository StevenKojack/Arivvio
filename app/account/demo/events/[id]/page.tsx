import { Navigation } from "@/app/components/Navigation";
import { CustomerDemoHub } from "../../CustomerDemoHub";
export default async function CustomerEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="min-h-screen ui-soft ui-text"><Navigation /><CustomerDemoHub eventId={id} /></main>;
}
