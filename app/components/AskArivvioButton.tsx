'use client';
import { assistantName, assistantEvents } from '@/lib/assistant/config';
export function AskArivvioButton({ attached = false }: { attached?: boolean }) { return <button type="button" className={attached ? "hub-button event-search-ask" : "hub-button mt-4"} onClick={()=>window.dispatchEvent(new Event(assistantEvents.open))}>{assistantName}</button>; }
