import { Navigation } from '@/app/components/Navigation';
import { AvailabilityWorkspace } from './AvailabilityWorkspace';

export default async function AvailabilityPage({ searchParams }: { searchParams: Promise<{ business?: string }> }) {
  const { business } = await searchParams;
  return <main id="main-content" className="min-h-screen ui-page ui-text">
    <Navigation/>
    <div className="mx-auto max-w-5xl p-4 sm:p-6"><AvailabilityWorkspace initial={typeof business === 'string' ? business : undefined}/></div>
  </main>;
}
