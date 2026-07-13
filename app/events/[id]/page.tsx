import { Footer } from "../../components/Footer";
import { Navigation } from "../../components/Navigation";
import { EventDetail } from "./EventDetail";

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-[#F6F3EA] text-neutral-950">
      <Navigation />
      <section className="px-6 py-16 sm:px-8 lg:px-12">
        <EventDetail eventId={id} />
      </section>
      <Footer />
    </main>
  );
}
