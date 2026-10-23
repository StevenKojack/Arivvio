import type { MarketplaceItem, ServiceName } from '@/app/data/marketplace';
import { listingPresentation } from './listing-state';
import { selectMatchingTiers, type MatchAssessment } from './matching-tiers';
export type MarketplaceMode = 'showcase' | 'real' | 'demo';
export type ListingType = 'all' | 'verified' | 'unclaimed' | 'demo' | 'pending';
export function marketplaceMode(value = process.env.NEXT_PUBLIC_MARKETPLACE_MODE): MarketplaceMode {
 return value === 'real' || value === 'demo' ? value : 'showcase';
}
export function listingType(item: Pick<MarketplaceItem,'databaseSource'|'listingState'|'verificationStatus'>): Exclude<ListingType,'all'> {
 if(item.databaseSource === false || item.listingState === 'demo') return 'demo';
 if(item.listingState === 'unclaimed') return 'unclaimed';
 return item.listingState === 'claimed' && item.verificationStatus === 'verified' ? 'verified' : 'pending';
}
export function providerKey(item: MarketplaceItem) {
 return item.databaseSource ? `business:${item.vendorId}:service:${item.serviceId ?? 'profile'}` : `demo:${item.id}`;
}
export function sourcePriority(item: MarketplaceItem) { return {verified:0,unclaimed:1,pending:2,demo:3}[listingType(item)]; }
// UUID-qualified keys are canonical. Numeric IDs are compatibility handles for maps and old carts.
// Resolve collisions deterministically within the loaded catalogue. Persistence always retains UUIDs/keys.
export function composeProviders(real: MarketplaceItem[], demo: MarketplaceItem[], mode: MarketplaceMode) {
 const used = new Set<number>(demo.map(i=>i.id));
 const seen = new Set<string>();
 const actual = [...real].sort((a,b)=>providerKey(a).localeCompare(providerKey(b))).flatMap(item=>{
  const key=providerKey(item);if(seen.has(key))return [];seen.add(key);
  let hash=0;for(const c of key)hash=(hash*31+c.charCodeAt(0))%4503599627370495;
  let id=-(hash+1);while(used.has(id))id--;used.add(id);
  return [{...item,id,sourceKey:key}];
 });
 const fictional=demo.map(item=>({...item,databaseSource:false,listingState:'demo' as const,sourceKey:`demo:${item.id}`}));
 return mode==='real'?actual:mode==='demo'?fictional:[...actual,...fictional];
}
export function selectMarketplaceMatches(items:MarketplaceItem[],assessments:Map<number,MatchAssessment>) {
 // Known fictional schedules must not hide genuine businesses with unconfirmed schedules.
 const real=selectMatchingTiers(items.filter(i=>listingType(i)!=='demo'),assessments);
 const demo=selectMatchingTiers(items.filter(i=>listingType(i)==='demo'),assessments);
 return {items:[...real.items,...demo.items].sort((a,b)=>sourcePriority(a)-sourcePriority(b)),exactCount:real.exactCount+demo.exactCount,details:{...real.details,...demo.details}};
}
export function requestRoute(item:MarketplaceItem) {
 const type=listingType(item);
 return type==='demo'?'demo':type==='unclaimed'?'concierge':listingPresentation(item).canRequest?'direct':'blocked';
}
export function cartGroups<T extends {item:MarketplaceItem}>(lines:T[]) {
 return {demo:lines.filter(l=>requestRoute(l.item)==='demo'),real:lines.filter(l=>requestRoute(l.item)==='direct'),blocked:lines.filter(l=>!['demo','direct'].includes(requestRoute(l.item)))};
}
export const discoveryGroups: {title:string;services:ServiceName[]}[] = [
 {title:'Explore event spaces',services:['Venue']},
 {title:'Music & entertainment',services:['DJ','Live Music','Magic','Character Performers','Bounce Houses']},
 {title:'Food & celebrations',services:['Catering','Cake & Desserts','Bartending']},
 {title:'Capture the moment',services:['Photography','Photo Booth','Live Streaming']},
 {title:'Bring it all together',services:['Rentals','Florals','Balloons','AV Production','Security','Staffing','Transportation','Party Bus','Valet','Portable Restrooms','Cleaning','Registration','Booth Rentals']},
];
export function discoveryGroup(item:MarketplaceItem) { return discoveryGroups.find(g=>g.services.includes(item.type))??discoveryGroups[4]; }
