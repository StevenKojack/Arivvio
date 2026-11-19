import {allServices} from "../data/marketplace";
import { Explore } from "./Surfaces";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string;category?:string;eventId?:string }>;
}) {
  const q=await searchParams; return <Explore key={JSON.stringify(q)} initialCategory={allServices.find(s=>s===q.category)||""} eventId={q.eventId} initialEvents={q.view === "events"} />;
}
