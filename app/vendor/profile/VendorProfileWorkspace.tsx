"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ManualProfileEditor} from "@/app/admin/ManualProfileEditor";
import {trustOperation,type TrustWorkspace} from "@/lib/repositories/businessTrustRepository";
import {createBrowserSupabaseClient} from "@/lib/supabase/client";
import type {ListingWorkspace} from "@/lib/repositories/listingsRepository";
type Data=Pick<ListingWorkspace,"listings"|"services"|"tags">;
export function VendorProfileWorkspace({initial}:{initial?:string}){
 const [id,setId]=useState(initial||""),[data,setData]=useState<Data|null>(null),[dirty,setDirty]=useState(false),[error,setError]=useState(""),[revision,setRevision]=useState(0);
 useEffect(()=>{let live=true;async function load(){const mine=await trustOperation<TrustWorkspace>("mine");
 const listings=mine.businesses.filter(b=>(b.applicant_id===mine.actor_id&&!b.owner_id&&b.approval_status==="pending"&&["pending","needs_more_information"].includes(b.verification_status||""))||mine.memberships.some(m=>m.vendor_id===b.id&&m.profile_id===mine.actor_id&&m.status==="active"&&["owner","admin","manager"].includes(m.role)));
 const ids=listings.map(b=>b.id),client=createBrowserSupabaseClient();
 const [s,t]=ids.length?await Promise.all([client.from("vendor_services").select("*").in("vendor_id",ids),client.from("vendor_tags").select("vendor_id,tag").in("vendor_id",ids)]):[{data:[],error:null},{data:[],error:null}];
 if(s.error||t.error)throw Error(s.error?.message||t.error?.message);
 if(live){setData({listings,services:s.data||[],tags:t.data||[]});setError("");setId(prev=>ids.includes(prev)?prev:ids.length===1?ids[0]:"");}}
 load().catch(e=>{if(live)setError(e.message||"Sign in to open your businesses.");});return()=>{live=false;};},[revision]);
 return <><h1 className="mt-5 text-3xl font-semibold">Edit Business Profile</h1>{error&&<p role="alert">{error} <Link href={"/auth/login?next="+encodeURIComponent("/vendor/profile"+(initial?"?business="+initial:""))}>Sign in</Link></p>}{data?<><label className="block py-4">Business and branch<select className="hub-input" value={id} onChange={e=>{if(!dirty||window.confirm("Discard unsaved changes and switch business?")){setDirty(false);setId(e.target.value);}}}><option value="">Select a business</option>{data.listings.map(b=><option key={b.id} value={b.id}>{b.business_name} · {b.location_name||b.service_area_city}</option>)}</select></label>{!data.listings.length&&<Link href="/vendor/onboarding">Find or create a business</Link>}{id&&<ManualProfileEditor key={id} selected={id} data={data} onDirty={setDirty} onSaved={()=>setRevision(x=>x+1)} admin={false}/>}</>:!error&&<p>Loading businesses…</p>}</>;
}
