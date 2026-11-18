import { Explore } from "./Surfaces";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  return <Explore initialEvents={(await searchParams).view === "events"} />;
}
