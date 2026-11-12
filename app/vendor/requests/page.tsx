import { Navigation } from '@/app/components/Navigation';
import { VendorRequests } from './VendorRequests';

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ business?: string; stage?: string }> }) {
  const { business, stage } = await searchParams;
  return <main id="main-content" className="min-h-screen ui-page ui-text">
    <Navigation/>
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <VendorRequests initialStage={stage === 'bookings' ? 'Recorded bookings' : stage === 'pending' ? 'New inquiries' : undefined} business={typeof business === 'string' ? business : undefined}/>
    </div>
  </main>;
}
