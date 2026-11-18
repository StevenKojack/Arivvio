import { notFound } from "next/navigation";
import { Occasion } from "../../Surfaces";
import { events } from "../../model";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = events.find((e) => e.slug === slug);
  if (!event) notFound();
  return <Occasion event={event} />;
}
