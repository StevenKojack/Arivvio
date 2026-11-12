import { Navigation } from '@/app/components/Navigation';
import { VendorBookings } from './VendorBookings';

export default async function BookingsPage({ searchParams }: {
  searchParams: Promise<{ business?: string; booking?: string }>;
}) {
  const { business, booking } = await searchParams;
  return <main id="main-content" className="min-h-screen ui-page ui-text">
    <Navigation/>
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <VendorBookings business={typeof business === 'string' ? business : undefined}
        booking={typeof booking === 'string' ? booking : undefined}/>
    </div>
  </main>;
}
