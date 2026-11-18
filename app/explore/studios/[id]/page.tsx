import { notFound } from "next/navigation";
import { Profile } from "../../Surfaces";
import { studios } from "../../model";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = studios.find((s) => String(s.id) === id);
  if (!item) notFound();
  return <Profile item={item} />;
}
