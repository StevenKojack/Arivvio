'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { assistantName, assistantEvents, clearlyOffTopic, scopeRedirect } from '@/lib/assistant/config';
import { applyPlanActions, type PlanAction } from '@/lib/assistant/actions';
import { activeAssistantEvent, getAssistantContext, loadConversation, saveConversation, saveAssistantProfile } from '@/lib/assistant/session';
import { understandEvent } from '@/lib/event-intelligence/understanding';
import type { ChatMessage } from '@/lib/assistant/provider';
import type { EventIntelligenceProfile } from '@/lib/event-intelligence/types';
import { previewPlanningTurn } from '@/lib/assistant/preview';

type Proposal = {actions:PlanAction[];base:string;key:string;changes:string[]};
export function EventAssistant() {
 const path=usePathname();
 if (!['/','/demo','/discover','/plan','/marketplace','/requests','/providers'].some(p=>path===p || p!=='/'&&path.startsWith(p+'/'))) return null;
 return <AssistantSurface key={path} path={path} />;
}
function AssistantSurface({path}:{path:string}) {
 const router=useRouter(); const dialog=useRef<HTMLDialogElement>(null); const abort=useRef<AbortController|null>(null); const end=useRef<HTMLDivElement>(null);
 const [open,setOpen]=useState(false); const [confirmNew,setConfirmNew]=useState(false); const [profile,setProfile]=useState<EventIntelligenceProfile|null>(null); const [messages,setMessages]=useState<ChatMessage[]>([]); const [input,setInput]=useState(''); const [available,setAvailable]=useState(false); const [checked,setChecked]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [notice,setNotice]=useState(''); const [proposal,setProposal]=useState<Proposal|null>(null);
 const key=useRef('draft'); const readOnly=path.startsWith('/requests/');
 useEffect(()=>{
  const refresh=()=>{const active=activeAssistantEvent(path); setProfile(active.profile); if(key.current!==active.key){setMessages(loadConversation(active.key));setProposal(null);} key.current=active.key;};
  queueMicrotask(()=>{refresh();setMessages(loadConversation(activeAssistantEvent(path).key));});
  const show=()=>{setOpen(true);};
  window.addEventListener(assistantEvents.open,show); window.addEventListener(assistantEvents.profile,refresh);window.addEventListener('storage',refresh);
  fetch('/api/assistant').then(r=>r.json()).then(v=>{setAvailable(v.available===true);setChecked(true);}).catch(()=>setChecked(true));
  return()=>{abort.current?.abort();window.removeEventListener(assistantEvents.open,show);window.removeEventListener(assistantEvents.profile,refresh);window.removeEventListener('storage',refresh);};
 },[path]);
 useEffect(()=>{if(open){dialog.current?.showModal();}else dialog.current?.close();},[open]);
 useEffect(()=>{end.current?.scrollIntoView({block:'nearest'});},[messages,busy,proposal]);
 function persist(next:ChatMessage[]) {setMessages(next);try{saveConversation(key.current,next);}catch{setError('Conversation could not be saved in this browser.');}}
 function review(actions:PlanAction[]) {
  const active=activeAssistantEvent(path); const preview=applyPlanActions(active.profile,actions);
  setProposal({actions,base:JSON.stringify(active.profile),key:active.key,changes:preview.changes});
 }
 function previewDetails() {
  setError('');setNotice('');
  if(!input.trim())return;
  if(clearlyOffTopic(input)){setNotice(scopeRedirect);return;}
  try {
   const preview=previewPlanningTurn(input.trim(),profile);
   if(preview.clarification)setNotice(preview.clarification);
   if(preview.actions.length)review(preview.actions);
  }catch(e){setError(e instanceof Error?e.message:'Unable to preview these details.');}
 }
 async function send() {
  if(!input.trim()||busy)return;setError('');setNotice('');setProposal(null);
  const active=activeAssistantEvent(path);const text=input.trim();const next:ChatMessage[]=[...messages,{role:'user',content:text}];persist(next);setInput('');setBusy(true);
  const base=JSON.stringify(active.profile); const controller=new AbortController();abort.current=controller;
  try {
   let session=sessionStorage.getItem('arivvio:assistant-session');if(!session){session=crypto.randomUUID();sessionStorage.setItem('arivvio:assistant-session',session);}
   const page={...getAssistantContext(path),readOnly:active.readOnly,requestStatus:active.status};
   const r=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({session,messages:next.slice(-10).map(m=>({...m,content:m.content.slice(0,2000)})),profile:active.profile,page})});
   const data=await r.json(); if(!r.ok){if(data.unavailable)setAvailable(false);throw new Error(data.error||'Unable to complete this turn.');}
   if(controller.signal.aborted)return;
   const now=activeAssistantEvent(path);if(now.key!==active.key || JSON.stringify(now.profile)!==base)throw new Error('Your event changed during this response. Please ask again using the current plan.');
   persist([...next,{role:'assistant',content:data.reply}]);
   if(data.actions?.length&&!active.readOnly)review(data.actions);
  }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}
 }
 function newEvent() {
  abort.current?.abort();setBusy(false);
  try {
   localStorage.removeItem('arivvio:event-intelligence');sessionStorage.removeItem('arivvio:event-intelligence');
   localStorage.removeItem('arivvio:demo-planner:v1');localStorage.removeItem('arivvio:demo-cart:v1');sessionStorage.removeItem('arivvio:assistant-intake');
   key.current='draft';saveConversation('draft',[]);setMessages([]);setProfile(null);setProposal(null);setConfirmNew(false);setInput('');setNotice('Describe your new occasion. Saved requests remain available.');
   window.dispatchEvent(new Event(assistantEvents.profile));
   router.push('/demo');
  }catch{setError('Unable to start a new draft. Browser storage is unavailable.');}
 }
 function apply() {
  if(!proposal)return;setError('');
  try {
   const active=activeAssistantEvent(path);if(active.key!==proposal.key||JSON.stringify(active.profile)!==proposal.base)throw new Error('Your plan changed. Preview these changes again before applying.');
   const result=applyPlanActions(active.profile,proposal.actions);saveAssistantProfile(result.profile);
   const newActive=activeAssistantEvent(path);key.current=newActive.key;setProfile(newActive.profile);saveConversation(key.current,messages);
   setNotice(`Updated: ${result.changes.join(' · ')}`);setProposal(null);setInput('');
  }catch(e){setError(e instanceof Error?e.message:'Unable to save your plan.');}
 }
 const understanding=profile?understandEvent(profile):null;
 return <>
  <button type="button" className="assistant-launch hub-button" onClick={()=>setOpen(true)} aria-haspopup="dialog">{assistantName}</button>
  <dialog ref={dialog} className="assistant-dialog ui-surface ui-text" aria-labelledby="assistant-title" onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)}>
   <header className="flex items-start justify-between gap-4 border-b ui-border p-5"><div><h2 id="assistant-title" className="text-xl font-semibold">{assistantName}</h2><p className="mt-1 text-xs ui-muted">{profile?.eventType.value || 'Start with your occasion'} · Saved in this browser only</p></div><button className="hub-button" aria-label="Close event planner" onClick={()=>setOpen(false)}>Close</button></header>
   <div className="assistant-scroll p-5">
    <p className="text-sm leading-6 ui-muted">{available?'Talk through your ideas. Review proposed changes before they enter your plan. Relevant event details and recent messages are sent to our AI provider when you send.':'Live conversation is not connected yet. You can preview details from your description using the existing event parser, then continue in guided planning.'}</p>
    {readOnly&&<p className="mt-3 text-sm ui-muted">You are reviewing this saved request. Its submitted details and provider responses will not be changed here.</p>}
    {!readOnly&&profile&&<div className="mt-3 text-xs">{confirmNew?<><p>Start a new draft and clear the active planner and cart? Saved requests and their conversations stay available.</p><button type="button" className="hub-button mt-2" onClick={newEvent}>Start new draft</button><button type="button" className="ml-3 underline" onClick={()=>setConfirmNew(false)}>Keep current event</button></>:<button type="button" className="underline" onClick={()=>setConfirmNew(true)}>Plan a different event</button>}</div>}
    {messages.map((m,i)=><article key={i} className={`mt-4 rounded-2xl p-4 ${m.role==='user'?'ui-soft':'border ui-border'}`}><p className="mb-2 text-xs font-semibold">{m.role==='user'?'You':assistantName}</p><p className="whitespace-pre-wrap text-sm leading-6">{m.content}</p></article>)}
    {profile&&<details className="my-4 rounded-xl border ui-border p-4"><summary className="cursor-pointer text-sm font-semibold">Your current plan · {understanding?.readiness}</summary><dl className="mt-3 space-y-2 text-sm">{[['Guests',profile.planning?.guestCount?`${profile.approximateGuests?'About ':''}${profile.planning.guestCount}`:'To confirm'],['Date',profile.planning?.date||profile.dateHint||'To confirm'],['Location',profile.planning?.location||(profile.homeEvent?'At home, city to confirm':'To confirm')],['Budget',profile.planning?.budget?`$${profile.planning.budget.toLocaleString()}`:'To confirm'],['Services',profile.requestedServices.join(', ')||'None selected']].map(([k,v])=><div key={k}><dt className="ui-muted">{k}</dt><dd>{v}</dd></div>)}</dl>{understanding?.nextBestQuestion&&<p className="mt-4 text-sm">Next to resolve: {understanding.nextBestQuestion.question}</p>}</details>}
    {understanding&&understanding.logistics.length>0&&<details className="my-4 rounded-xl border ui-border p-4"><summary className="cursor-pointer text-sm font-semibold">Things to think through</summary><ul className="mt-3 space-y-3 text-sm">{understanding.logistics.map(item=><li key={item.detail}><span className="font-semibold">{item.priority}: </span>{item.detail}</li>)}{understanding.recommended.map(item=><li key={item.service}><span className="font-semibold">Optional: {item.service}. </span>{item.reason}</li>)}</ul><p className="mt-3 text-xs ui-muted">These are considerations, not services added to your plan.</p></details>}
    {proposal&&<section className="my-4 rounded-2xl border ui-border p-4"><h3 className="font-semibold">Review plan changes</h3><ul className="my-3 list-inside list-disc text-sm">{proposal.changes.map((c,i)=><li key={i}>{c}</li>)}</ul>{proposal.actions[0]?.kind==='create'&&<p className="mb-3 text-xs ui-muted">Only recognized facts are prefilled. Incomplete dates and uncertain timing still need confirmation.</p>}<div className="flex gap-3"><button className="hub-button" onClick={apply}>Apply to plan</button><button className="hub-button" onClick={()=>setProposal(null)}>Dismiss</button></div></section>}
    {notice&&<p role="status" className="my-3 text-sm">{notice}</p>}{error&&<p role="alert" className="my-3 text-sm">{error}</p>}{busy&&<p role="status" className="text-sm ui-muted">Thinking through your event…</p>}
    <div ref={end}/>
   </div>
   <form className="border-t ui-border p-4" onSubmit={e=>{e.preventDefault();if(available)void send();else previewDetails();}}>
    <label className="text-xs font-semibold" htmlFor="assistant-message">{available?'Tell your planner':'Describe your event to preview details'}</label>
    <textarea id="assistant-message" className="hub-input mt-2 w-full resize-none" rows={3} maxLength={2000} value={input} onChange={e=>setInput(e.target.value)} placeholder="An anniversary in October for about 100 guests, Armenian food and a DJ…" disabled={busy||!available&&readOnly}/>
    <div className="mt-3 flex flex-wrap gap-2"><button className="hub-button" type="submit" disabled={!checked||busy||!input.trim()||!available&&readOnly}>{available?'Send':'Preview details'}</button><button className="hub-button" type="button" onClick={()=>{setOpen(false);router.push(readOnly?'/requests':'/discover?assistant=1');}}>{readOnly?'Saved requests':'Open guided planner'}</button>{messages.length>0&&<button type="button" className="text-xs underline" onClick={()=>{persist([]);setProposal(null);}}>Clear conversation</button>}</div>
   </form>
  </dialog>
 </>;
}
