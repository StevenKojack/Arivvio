'use client';

import type { ReactNode } from "react";
import { useEffect, useState } from 'react';
import { listServicePackages } from '@/lib/repositories/serviceCatalogRepository';
import { pricingLabel, type ServicePackage } from '@/lib/service-catalog/model';

export function PackageOfferings({ packages, action }: { packages: ServicePackage[]; action?: (item: ServicePackage) => ReactNode }) {
  const active = packages.filter(item => item.active).sort((a, b) => a.display_order - b.display_order);
  if (!active.length) return null;
  return <section className="mt-3 space-y-2">
    <h4 className="font-semibold">Packages</h4>
    {active.map(item => <details key={item.id} className="rounded-lg border ui-border p-3">
      <summary className="cursor-pointer break-words">{item.name} · {pricingLabel(item.pricing_model, item.amount, item.minimum_hours, item.minimum_guests)}</summary>
      {item.description && <p className="mt-2 whitespace-pre-line break-words">{item.description}</p>}
      {!!item.inclusions.length && <ul className="mt-2 list-disc space-y-1 pl-5">{item.inclusions.map((entry, index) => <li key={index}>{entry}</li>)}</ul>}
      {action?.(item)}
    </details>)}
    <p className="text-sm ui-muted">Final price and inclusions are confirmed in the provider quote.</p>
  </section>;
}

export function PublicServicePackages({ business, service, action }: { business: string; service: string; action?: (item: ServicePackage) => ReactNode }) {
  return <PublicPackageLoader key={business + '/' + service} business={business} service={service} action={action}/>;
}

function PublicPackageLoader({ business, service, action }: { business: string; service: string; action?: (item: ServicePackage) => ReactNode }) {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  useEffect(() => {
    let current = true;
    listServicePackages(business, service).then(rows => {
      if (current) setPackages(rows);
    }).catch(() => { if (current) setPackages([]); });
    return () => { current = false; };
  }, [business, service]);
  return <PackageOfferings packages={packages} action={action}/>;
}
