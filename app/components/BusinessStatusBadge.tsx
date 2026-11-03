import {listingPresentation} from '@/lib/marketplace/listing-state';
import type {MarketplaceItem} from '@/app/data/marketplace';
export function BusinessStatusBadge({item}:{item:Pick<MarketplaceItem,'listingState'|'databaseSource'|'verificationStatus'>}){
 const state=listingPresentation(item),verified=item.databaseSource!==false&&item.listingState==='claimed'&&item.verificationStatus==='verified';
 const demo=item.listingState==='demo'||item.databaseSource===false;
 return <span className="business-status" data-provider-status><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{demo?<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>:<><path d="M5 21V6l7-3 7 3v15H5Zm4 0v-6h6v6M8 8h2m4 0h2M8 11h2m4 0h2"/></>}</svg><span>{state.label}</span>{verified&&<svg className="authority-check" role="img" aria-label="Business authority verified by ARIVVIO" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><title>Business authority verified by ARIVVIO</title><path d="m12 2 3 2 4 .5.5 4 2.5 3.5-2.5 3.5-.5 4-4 .5-3 2-3-2-4-.5-.5-4L2 12l2.5-3.5.5-4L9 4Z"/><path d="m8 12 3 3 5-6"/></svg>}</span>;
}
