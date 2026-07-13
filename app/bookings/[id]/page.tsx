import { Footer } from "@/app/components/Footer";
import { Navigation } from "@/app/components/Navigation";
import { BookingDetail } from "./BookingDetail";

type BookingPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function BookingPage({ params }: BookingPageProps) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-[#F6F3EA] text-neutral-950">
      <Navigation />
      <section className="px-6 py-16 sm:px-8 lg:px-12">
        <BookingDetail bookingId={id} />
      </section>
      <Footer />
    </main>
  );
}
