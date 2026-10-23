"use client";
import Link from "next/link";
import { PricingDisclosure } from "./PricingDisclosure";
import type { MarketplaceItem, ServiceName } from '@/app/data/marketplace';
import { listingPresentation } from '@/lib/marketplace/listing-state';
import { cartGroups } from '@/lib/marketplace/sources';
import { getTimeOptions } from '@/lib/utils/format';
export type QuoteCartLine={cartItemId?:string;id:number;item:MarketplaceItem;persisted:boolean;priceAdjustment:number;serviceEnd:string;serviceId?:string|null;serviceName:ServiceName;serviceStart:string;serviceTitle:string};
type Props={canPersistCart:boolean;cart:QuoteCartLine[];cartMessage:string;eventSummary:string;getLineQuote:(line:QuoteCartLine)=>number;isAuthLoading:boolean;isLoggedIn:boolean;isRequestingQuotes:boolean;variant?:'panel'|'compact'|'bar'|'workspace';onRemove:(id:number)=>void;onOpen?:()=>void;onRequestQuotes:(kind?:'real'|'demo')=>void;onUpdateTime:(id:number,field:'serviceStart'|'serviceEnd',value:string)=>void};
const times=getTimeOptions();
export function QuoteCartDrawer(p:Props){
 const groups=cartGroups(p.cart);
 return <aside className="min-w-0 space-y-5 ui-surface p-2"><div><h2 className="text-xl font-semibold">{p.cart.length} selections</h2><p className="mt-2 text-sm ui-muted">{p.eventSummary}</p></div>
 {p.cartMessage&&<p role="status" className="hub-card p-3 text-sm">{p.cartMessage}</p>}
 {!p.cart.length&&<p>Add a provider to explore a request. Real and Demo requests stay separate.</p>}
 {!!groups.real.length && !p.canPersistCart && <Link href="/account" className="inline-block underline">Choose an event in My events</Link>}
 {(['real','demo'] as const).map(kind=>{const lines=groups[kind];if(!lines.length)return null;return <section key={kind} className="space-y-3"><h3 className="font-semibold">{kind==='real'?'Real business requests':'Demo requests'}</h3><p className="text-sm ui-muted">{kind==='real'?'Send to verified businesses for your saved account event. A request does not confirm a booking or collect payment.':'Fictional providers. Illustrative prices and simulated responses. No real business receives these requests.'}</p>
 {lines.map(line=><article key={line.id} className="hub-card space-y-3 p-4"><p className="text-xs font-semibold">{listingPresentation(line.item).label}</p><div className="flex items-start justify-between gap-3"><div><h4 className="font-semibold">{line.item.name}</h4><p className="text-sm ui-muted">{line.serviceTitle}</p></div><button className="hub-button" aria-label={`Remove ${line.item.name}`} onClick={()=>p.onRemove(line.id)}>Remove</button></div><div className="grid grid-cols-2 gap-3">{(['serviceStart','serviceEnd'] as const).map(field=><label key={field} className="text-xs">{field==='serviceStart'?'Start':'End'}<select className="hub-input mt-1 w-full" value={line[field]} onChange={e=>p.onUpdateTime(line.id,field,e.target.value)}>{times.map(time=><option key={time.value} value={time.value}>{time.label}</option>)}</select></label>)}</div><p className="font-semibold">{line.item.pricingKnown===false?'Contact for pricing':`$${p.getLineQuote(line).toLocaleString()} ${kind==='demo'?'illustrative estimate':'estimate'}`}</p><PricingDisclosure item={line.item}/><p className="text-xs ui-muted">{kind==='demo'?'Illustrative schedule':'Confirm availability with the business'}</p></article>)}
 <button className="hub-primary w-full" disabled={p.isRequestingQuotes} onClick={()=>p.onRequestQuotes(kind)}>{kind==='real'?'Review real business requests':'Review Demo requests'}</button></section>})}
 {!!groups.blocked.length&&<p role="alert">A selection requires verification or concierge handling. Remove it and use its business profile.</p>}
 </aside>;
}
