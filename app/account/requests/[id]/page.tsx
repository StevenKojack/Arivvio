import { Navigation } from "@/app/components/Navigation";
import { RequestThread } from "@/app/components/RequestThread";
export default async function RequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen ui-soft ui-text">
      <Navigation />
      <section className="px-4 py-10 sm:px-8">
        <RequestThread key={id} requestId={id} />
      </section>
    </main>
  );
}
