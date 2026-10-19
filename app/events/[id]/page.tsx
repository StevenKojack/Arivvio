import { Navigation } from "../../components/Navigation";
import { EventDetail } from "./EventDetail";

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="min-h-screen ui-soft ui-text">
      <Navigation />
      <section className="px-6 py-16 sm:px-8 lg:px-12">
        <EventDetail key={id} eventId={id} />
      </section>
    </main>
  );
}
