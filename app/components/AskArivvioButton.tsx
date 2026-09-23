'use client';
import { assistantName, assistantEvents } from '@/lib/assistant/config';
export function AskArivvioButton() { return <button type="button" className="hub-button mt-4" onClick={()=>window.dispatchEvent(new Event(assistantEvents.open))}>{assistantName}<span aria-hidden="true"> ↗</span></button>; }
