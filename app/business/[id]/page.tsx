import { BusinessListing } from "./BusinessListing";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    eventId?: string;
    serviceId?: string;
    mode?: string;
  }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return (
    <BusinessListing
      id={id}
      initialEventId={query.eventId}
      initialServiceId={query.serviceId}
      initialMode={query.mode}
    />
  );
}
