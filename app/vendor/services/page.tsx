import { Navigation } from '@/app/components/Navigation';
import { ServiceCatalog } from './ServiceCatalog';

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ business?: string }> }) {
  const { business } = await searchParams;
  return <main id="main-content" className="min-h-screen ui-page ui-text">
    <Navigation/>
    <div className="mx-auto max-w-6xl p-4 sm:p-6"><ServiceCatalog business={typeof business === 'string' ? business : undefined}/></div>
  </main>;
}
