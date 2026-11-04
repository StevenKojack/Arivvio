import references from '@/app/data/businessReferences.json';

/** Links only. External business media is never embedded without approval. */
export function OfficialBusinessWork({businessId}: {businessId?: string | null}) {
  const reference = businessId ? (references as Record<string, {url:string;label:string}>)[businessId] : undefined;
  if (!reference) return null;
  return <p className="mt-3 text-sm"><a className="underline" href={reference.url} target="_blank" rel="noopener noreferrer">{reference.label} (opens in a new tab)</a></p>;
}
