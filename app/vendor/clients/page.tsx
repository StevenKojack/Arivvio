import { Navigation } from '@/app/components/Navigation';
import { ClientsWorkspace } from './ClientsWorkspace';

export default async function ClientsPage({ searchParams }: {
  searchParams: Promise<{ business?: string; client?: string }>;
}) {
  const { business, client } = await searchParams;
  return <main id="main-content" className="min-h-screen ui-page ui-text">
    <Navigation/>
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <ClientsWorkspace business={typeof business === 'string' ? business : undefined}
        client={typeof client === 'string' ? client : undefined}/>
    </div>
  </main>;
}
