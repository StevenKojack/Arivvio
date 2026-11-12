import { Navigation } from '@/app/components/Navigation';
import { VendorRequests } from './VendorRequests';

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ business?: string; stage?: string; request?: string }> }) {
  const { business, stage, request } = await searchParams;
  return <main id="main-content" className="min-h-screen ui-page ui-text">
    <Navigation/>
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <VendorRequests request={typeof request === 'string' ? request : undefined} initialStage={stage === 'bookings' ? 'Recorded bookings' : stage === 'pending' ? 'New inquiries' : stage === 'attention' ? 'Needs attention' : stage === 'waiting' ? 'Awaiting customer decision' : undefined} business={typeof business === 'string' ? business : undefined}/>
    </div>
  </main>;
}
