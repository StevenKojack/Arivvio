"use client";
import {useEffect,useState} from "react";
import {BusinessMark} from "@/app/components/BusinessMark";
import {activationOperation,mediaOperation} from "@/lib/repositories/acquisitionRepository";
import type {ListingWorkspace} from "@/lib/repositories/listingsRepository";
import type {ActivationRow} from "@/lib/acquisition/activation";
import {ManualProfileEditor} from "./ManualProfileEditor";

type MediaRow={vendor_id:string;media_status:string;media_kind:string;sort_order:number;image_url:string};
export function BusinessQueue({data,revision,onSaved}:{data:ListingWorkspace;revision:number;onSaved:()=>void}){
 const [selected,setSelected]=useState(""),[search,setSearch]=useState(""),[filter,setFilter]=useState("All");
 const [dirty,setDirty]=useState(false);
 const [activity,setActivity]=useState<ActivationRow[]>([]),[logos,setLogos]=useState<MediaRow[]>([]),[error,setError]=useState("");
 useEffect(()=>{let live=true;activationOperation<ActivationRow[]>("list").then(rows=>{if(live){setActivity(rows);setError("");}}).catch(()=>{if(live)setError("Contact status could not be loaded.");});
 mediaOperation<MediaRow[]>("list").then(rows=>{if(live)setLogos(rows.filter(m=>m.media_status==="approved"&&m.media_kind==="logo").sort((a,b)=>a.sort_order-b.sort_order));}).catch(()=>{if(live)setLogos([]);});return()=>{live=false;};},[revision]);
 if(selected)return <><button className="mt-3 underline" onClick={()=>{if(!dirty||window.confirm("Discard unsaved changes?")){setDirty(false);setSelected("");}}}>← Business queue</button><ManualProfileEditor key={selected} onDirty={setDirty} data={data} selected={selected} onSaved={onSaved}/></>;
 const rows=data.listings.map(b=>{const a=activity.find(x=>x.id===b.id);const status=b.owner_id?"Claimed":b.approval_status==="rejected"||a?.state==="not_interested"?"Denied":!a?"Contact history unavailable":a.attempts.length?"Contacted":"Uncontacted";return {b,a,status};}).filter(({b,status})=>(filter==="All"||filter===status)&&[b.business_name,b.location_name,b.service_area_city,b.email,b.phone].join(" ").toLowerCase().includes(search.toLowerCase())).sort((x,y)=>x.b.business_name.localeCompare(y.b.business_name));
 return <section aria-label="Business queue"><div className="my-4 flex flex-wrap gap-3"><input aria-label="Search businesses" type="search" className="hub-input" placeholder="Search name, branch or contact" value={search} onChange={e=>setSearch(e.target.value)}/><select className="hub-input" aria-label="Queue status" value={filter} onChange={e=>setFilter(e.target.value)}>{["All","Uncontacted","Contacted","Claimed","Denied"].map(s=><option key={s}>{s}</option>)}</select></div>
 {error&&<p role="status">{error}</p>}<div className="business-queue"><div aria-hidden="true" className="queue-row queue-heading"><span/><span>Business</span><span>Email</span><span>Phone</span><span>Status</span></div>
 {rows.map(({b,a,status})=><button key={b.id} className="queue-row" onClick={()=>setSelected(b.id)}><BusinessMark name={b.business_name} logo={logos.find(m=>m.vendor_id===b.id)?.image_url}/><span><strong>{b.business_name}</strong><small>{b.location_name||b.service_area_city}</small></span><span>{b.email||"No email listed"}</span><span>{b.phone||"No phone listed"}</span><span><b className="queue-status">{status}</b>{a?.suppressed&&<small>Do not contact</small>}</span></button>)}</div>{!rows.length&&<p className="py-4">No businesses match this search.</p>}</section>;
}
