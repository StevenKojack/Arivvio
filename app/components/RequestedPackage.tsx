import { pricingLabel, type PackageSnapshot } from '@/lib/service-catalog/model';

export function RequestedPackage({ item, historical = false }: { item: PackageSnapshot; historical?: boolean }) {
  return <section className="min-w-0 space-y-1 rounded-lg border ui-border p-3 text-sm">
    <h3 className="font-semibold break-words">{historical ? 'Originally requested package' : 'Selected package'} · {item.name}</h3>
    {item.description && <p className="whitespace-pre-line break-words">{item.description}</p>}
    {!!item.inclusions.length && <ul className="list-disc break-words pl-5">
      {item.inclusions.map((entry, index) => <li key={index}>{entry}</li>)}
    </ul>}
    <p className="font-medium">{historical ? 'Original listed pricing' : 'Listed pricing'} · {pricingLabel(item.pricing_model, item.amount, item.minimum_hours, item.minimum_guests)}</p>
    <p className="ui-muted">The provider confirms the final price and inclusions in their quote.</p>
  </section>;
}
