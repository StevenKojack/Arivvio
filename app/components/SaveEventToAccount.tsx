"use client";
import Link from "next/link";
import { useState } from "react";
import type { EventIntelligenceProfile } from "@/lib/event-intelligence/types";
import { loadEventIntelligenceProfile, saveEventIntelligenceProfile } from "@/lib/event-intelligence/storage";
import { saveLocalEventToAccount } from "@/lib/customer-cloud/events";
import { createBrowserSupabaseClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { CustomerDialog } from "./CustomerDialog";
export const pendingSaveKey = "arivvio:pending-account-save";
export function SaveEventToAccount({profile, initiallyOpen=false}:{profile:EventIntelligenceProfile;initiallyOpen?:boolean}) {
 const [open,setOpen]=useState(initiallyOpen),[busy,setBusy]=useState(false),[error,setError]=useState(""),[saved,setSaved]=useState("");
 async function save(){setBusy(true);setError("");try{
  if(!hasSupabaseConfig())throw new Error("Account saving is unavailable. Your browser plan remains safe.");
  let draft=profile;
  if(!draft.eventId){saveEventIntelligenceProfile(draft);draft=loadEventIntelligenceProfile()??draft;}
  localStorage.setItem(pendingSaveKey,JSON.stringify(draft));
  const client=createBrowserSupabaseClient();const {data:{user}}=await client.auth.getUser();
  if(!user||user.is_anonymous){window.location.assign("/auth/login?next=%2Faccount%3Fsave%3D1");return;}
  const row=await saveLocalEventToAccount(client,draft);setSaved(row.id);localStorage.removeItem(pendingSaveKey);
  window.dispatchEvent(new Event("arivvio:account-events-changed"));
 }catch(e){setError(e instanceof Error?e.message:"Unable to save. Please try again.");}finally{setBusy(false);}}
 return <><button className="hub-button" onClick={()=>setOpen(true)}>Save this event to my account</button>{open&&<CustomerDialog title="Save event to your account" onClose={()=>{if(!busy)setOpen(false);}}><p className="text-lg font-semibold">{profile.recognition.identity.selectedDisplayEvent}</p><p className="my-4 text-sm ui-muted">Keep this plan, its stages and preferences in your account. Demo requests and conversations stay on this device. If you already saved this event, we’ll open it without replacing your account changes.</p>{saved?<Link className="hub-primary" href={`/events/${saved}`}>Open your account event</Link>:<button className="hub-primary" disabled={busy} onClick={()=>void save()}>{busy?"Saving…":"Confirm save to my account"}</button>}{error&&<p role="alert" className="mt-3 text-sm">{error}</p>}</CustomerDialog>}</>;
}
