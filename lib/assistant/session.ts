import { loadEventIntelligenceProfile, saveEventIntelligenceProfile } from '@/lib/event-intelligence/storage';
import { loadDemoQuoteRequests } from '@/lib/event-intelligence/demo-quotes';
import { loadCustomerEvents } from '@/lib/customer-demo/events';
import { assistantEvents } from './config';
import type { PageContext } from './context';
import type { ChatMessage } from './provider';
let currentPage: PageContext | null = null;
export function publishAssistantContext(context: PageContext) { currentPage=context; window.dispatchEvent(new Event(assistantEvents.context)); }
export function getAssistantContext(path: string): PageContext { return currentPage?.path === path ? currentPage : {path}; }
export function activeAssistantEvent(path: string) {
 const eventId=path.match(/^\/account\/demo\/events\/([^/]+)$/)?.[1];
 if(eventId) { const event=loadCustomerEvents().find(e=>e.id===decodeURIComponent(eventId)); return {key:event?.profile?.eventId ?? `event:${eventId}`,profile:event?.profile ?? null,readOnly:!event?.profile,status:event ? `${event.requests.length} saved requests. Submitted snapshots are separate from the current plan.` : 'Event unavailable in this browser'}; }
 const requestId=path.match(/^\/requests\/([^/]+)$/)?.[1];
 if(requestId) { const request=loadDemoQuoteRequests().find(r=>r.id===requestId); return {key:`request:${requestId}`,profile:request?.event.profile ?? null,readOnly:true,status:request ? request.opportunities.map(o=>`${o.providerName}: ${o.response?.status ?? o.status}`).join(', ') : 'Request unavailable in this browser'}; }
 const profile=loadEventIntelligenceProfile(); return {key:profile?.eventId ?? 'draft',profile,readOnly:false,status:''};
}
export function loadConversation(key:string):ChatMessage[] { try { const value=JSON.parse(localStorage.getItem(`arivvio:conversation:${key}`) ?? '[]'); return Array.isArray(value)?value.filter(m=>['user','assistant'].includes(m.role)&&typeof m.content==='string').slice(-30):[]; } catch {return [];} }
export function saveConversation(key:string,messages:ChatMessage[]) { localStorage.setItem(`arivvio:conversation:${key}`,JSON.stringify(messages.slice(-30))); }
export function saveAssistantProfile(profile: NonNullable<ReturnType<typeof loadEventIntelligenceProfile>>) {
 const active = loadEventIntelligenceProfile();
 if (profile.eventId && active?.eventId !== profile.eventId) {
  if(active?.eventId)localStorage.setItem(`arivvio:cart:${active.eventId}`,localStorage.getItem('arivvio:demo-cart:v1') ?? '[]');
  localStorage.setItem('arivvio:demo-cart:v1',localStorage.getItem(`arivvio:cart:${profile.eventId}`) ?? '[]');
  localStorage.removeItem('arivvio:demo-planner:v1');
 }
 saveEventIntelligenceProfile(profile);
 // Intake restoration consumes the canonical profile, not a second chat model.
 sessionStorage.setItem('arivvio:assistant-intake','1');
 window.dispatchEvent(new CustomEvent('arivvio:assistant-plan',{detail:loadEventIntelligenceProfile()}));
}
