import { notFound } from "next/navigation";
import { Profile,RecordProfile } from "../../Surfaces";
import { studios } from "../../model";
export default async function Page({
  params,searchParams,
}: {
  searchParams:Promise<{eventId?:string}>;params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = studios.find((s) => String(s.id) === id);
  const {eventId}=await searchParams; if(!item&&/^[0-9a-f-]{36}$/i.test(id))return <RecordProfile id={id} eventId={eventId}/>;
  if (!item) notFound();
  return <Profile item={item} eventId={eventId}/>;
}
