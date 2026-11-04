"use client";
import Image from "next/image";
import {BusinessMark} from "@/app/components/BusinessMark";
import {BusinessStatusBadge} from "@/app/components/BusinessStatusBadge";
import {ProviderProfile} from "@/app/marketplace/components/ProviderProfile";
import {mapServiceToMarketplaceItem} from "@/lib/supabase/marketplace";
import {representativePhoto} from "@/lib/marketplace/vendorImages";
import { useEffect, useState, type FormEvent } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Json, PublicTableRow } from "@/lib/supabase/database.types";
import type { ListingWorkspace } from "@/lib/repositories/listingsRepository";
import { allServices } from "@/app/data/marketplace";

const profileFields = {business_name:"Business name", location_name:"Branch", category:"Category", website_url:"Website", phone:"Public phone", email:"Public email"};
const serviceFields = {service_name:"Service name",category:"Category",description:"Service description",event_types_supported:"Event types (comma separated)",pricing_type:"Pricing model",base_price:"Base price",hourly_rate:"Hourly rate",minimum_hours:"Minimum hours",setup_fee:"Setup fee",travel_fee:"Travel fee",active:"Active in Marketplace"};
const numbers = new Set(["base_price","hourly_rate","minimum_hours","setup_fee","travel_fee","service_radius_miles"]);
type Fields = Record<string, Json | undefined>;
type Service = PublicTableRow<"vendor_services">;
const fieldClass="w-full rounded-lg border ui-border ui-surface p-2";
const buttonClass="rounded-lg ui-primary px-4 py-2 disabled:opacity-50";
async function save(operation:string,payload:Fields){
 const {error}=await createBrowserSupabaseClient().rpc("profile_workspace_edit",{operation,payload});
 if(error)throw new Error(error.message);
}
function DataForm({initial,labels,operation,businessId,onSaved}:{initial:Fields;labels:Record<string,string>;operation:string;businessId:string;onSaved:()=>void}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[newId,setNewId]=useState(()=>crypto.randomUUID());
 const [version,setVersion]=useState(0);
 const [quoteOnly,setQuoteOnly]=useState(initial.base_price==null&&initial.hourly_rate==null);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const form=e.currentTarget, data=new FormData(form), changes:Fields={},before:Fields={};
  for(const key of Object.keys(labels)){
   const raw=String(data.get(key)??"").trim();
   const value=key==="pricing_type"&&raw==="quote"?(initial.pricing_type||"flat"):key==="active"?data.has(key):key==="event_types_supported"?raw.split(",").map(x=>x.trim()).filter(Boolean):numbers.has(key)?(raw?Number(raw):["setup_fee","travel_fee"].includes(key)?0:null):raw||null;
   if(operation==="new_service"||JSON.stringify(value)!==JSON.stringify(initial[key]??null)){changes[key]=value;before[key]=initial[key]??null;}
  }
  if(!Object.keys(changes).length){setMessage("No changes to save.");return;}
  setBusy(true);
  try{await save(operation,{vendor_id:businessId,id:operation==="new_service"?newId:initial.id,changes,before});setMessage("Saved to this business.");if(operation==="new_service"){setNewId(crypto.randomUUID());setVersion(x=>x+1);}onSaved();}
  catch(error){setMessage(error instanceof Error?error.message:"Save failed.");}finally{setBusy(false);}
 }
 return <form key={version} onSubmit={submit} className="grid gap-3 py-3 sm:grid-cols-2">{Object.entries(labels).map(([key,label])=>{
 const value=initial[key], attr={name:key,className:fieldClass,defaultValue:key==="pricing_type"&&initial.base_price==null&&initial.hourly_rate==null?"quote":Array.isArray(value)?value.join(", "):String(value??""),required:["business_name","service_name","category"].includes(key)};
 return <label key={key} className={key==="description"?"grid gap-1 sm:col-span-2":"grid gap-1"}>{label}
 {key==="description"?<textarea {...attr} rows={7}/>:key==="active"?<input name={key} type="checkbox" defaultChecked={value===true}/>:key==="pricing_type"||key==="category"?<select {...attr} onChange={key==="pricing_type"?e=>setQuoteOnly(e.target.value==="quote"):undefined}>{key==="pricing_type"&&<option value="quote">Request a quote</option>}{Array.from(new Set([...(key==="category"?allServices:["flat","hourly","per_guest"]),...(value?[String(value)]:[])])).map(x=><option key={x}>{x}</option>)}</select>:<input {...attr} disabled={quoteOnly&&["base_price","hourly_rate"].includes(key)} type={numbers.has(key)?"number":key==="website_url"?"url":key==="email"?"email":"text"} min={numbers.has(key)?0:undefined} step={numbers.has(key)?"0.01":undefined}/>}</label>})}
 <div className="sm:col-span-2"><button className={buttonClass} disabled={busy}>{busy?"Saving…":operation==="new_service"?"Add service":"Save changes"}</button> <span role="status">{message}</span></div></form>;
}

function SectionsForm({businessId,initial,onSaved}:{businessId:string;initial:{title:string;body:string}[];onSaved:()=>void}){
 const [rows,setRows]=useState(initial),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 function move(index:number,offset:number){
  const next=[...rows];[next[index],next[index+offset]]=[next[index+offset],next[index]];setRows(next);
 }
 async function submit(e:FormEvent){
  e.preventDefault();setBusy(true);
  try{await save("profile",{vendor_id:businessId,before:{profile_sections:initial},changes:{profile_sections:rows}});setMessage("Sections saved.");onSaved();}
  catch(e){setMessage(e instanceof Error?e.message:"Unable to save sections.");}finally{setBusy(false);}
 }
 return <form onSubmit={submit} className="space-y-3 py-3"><p>Choose your own headings, wording and order. Everything in these sections is public.</p>
 {rows.map((row,i)=><fieldset key={i} className="grid gap-2 rounded-lg border p-3"><legend>Section {i+1}</legend>
 <label>Heading<input className={fieldClass} required maxLength={100} value={row.title} onChange={e=>setRows(rows.map((r,j)=>j===i?{...r,title:e.target.value}:r))}/></label>
 <label>Details<textarea className={fieldClass} rows={4} required maxLength={4000} value={row.body} onChange={e=>setRows(rows.map((r,j)=>j===i?{...r,body:e.target.value}:r))}/></label>
 <div className="flex gap-4"><button type="button" disabled={!i} onClick={()=>move(i,-1)}>Move up</button><button type="button" disabled={i===rows.length-1} onClick={()=>move(i,1)}>Move down</button><button type="button" onClick={()=>setRows(rows.filter((_,j)=>j!==i))}>Remove section</button></div></fieldset>)}
 <button type="button" className="mr-4 underline" disabled={rows.length>=24} onClick={()=>setRows([...rows,{title:"",body:""}])}>Add section</button>
 <button className={buttonClass} disabled={busy}>Save sections</button><span role="status">{message}</span></form>;
}

function UploadForm({businessId,onSaved,admin}:{businessId:string;onSaved:()=>void;admin:boolean}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const [photos,setPhotos]=useState<PublicTableRow<"vendor_photos">[]>([]),[revision,setRevision]=useState(0);
 useEffect(()=>{let live=true;createBrowserSupabaseClient().from("vendor_photos").select("*").eq("vendor_id",businessId).eq("media_status","approved").order("sort_order").then(({data,error})=>{if(live){setPhotos(data??[]);if(error)setMessage(error.message);}});return()=>{live=false;};},[businessId,revision]);
 async function changePhoto(operation:string,id:string,extra:Fields={}){
   setBusy(true);try{await save(operation,{vendor_id:businessId,id,...extra});onSaved();setRevision(n=>n+1);setMessage("Photo changes saved.");}
   catch(e){setMessage(e instanceof Error?e.message:"Unable to update photo.");}finally{setBusy(false);}
 }
 const [pending,setPending]=useState<{file:File;path:string}|null>(null);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const form=e.currentTarget,d=new FormData(form),file=d.get("file");
  if(!(file instanceof File)||!file.size||file.size>5*1024*1024||!["image/png","image/jpeg","image/webp"].includes(file.type)){setMessage("Choose a JPG, PNG or WebP up to 5 MB.");return;}
  setBusy(true);
  try{const storage=createBrowserSupabaseClient().storage.from("vendor-photos");
   let path=pending?.file===file?pending.path:null;
   if(!path){const ext={"image/png":"png","image/jpeg":"jpg","image/webp":"webp"}[file.type];path=businessId+(admin?"/admin/":"/editor/")+crypto.randomUUID()+"."+ext;
    const {error}=await storage.upload(path,file,{contentType:file.type,upsert:false});if(error)throw new Error(error.message);setPending({file,path});}
   const placement=String(d.get("placement"));await save("upload",{vendor_id:businessId,path,url:storage.getPublicUrl(path).data.publicUrl,kind:placement==="logo"?"logo":"business_photo",placement,alt:String(d.get("alt")),rights:String(d.get("rights")),credit:String(d.get("credit")),rights_confirmed:d.has("confirmed")});
   setPending(null);onSaved();setRevision(n=>n+1);form.reset();setMessage("Published. Open the public profile to see your image.");
  }catch(error){setMessage(error instanceof Error?error.message:"Upload failed.");}finally{setBusy(false);}
 }
 return <><form onSubmit={submit} className="grid gap-3 py-3"><label>Image file (JPG, PNG or WebP, up to 5 MB)<input required type="file" name="file" accept="image/jpeg,image/png,image/webp" className={fieldClass}/></label>
 <label>Placement<select name="placement" className={fieldClass}><option value="cover">Cover photo</option><option value="logo">Business logo</option><option value="gallery">Gallery photo</option></select></label>
 <label>Image description<input required minLength={3} name="alt" className={fieldClass}/></label>
 <label>Ownership or permission details<input required minLength={10} name="rights" placeholder="For example, I took this photograph for ARIVVIO." className={fieldClass}/></label>
 <label>Credit, if required<input name="credit" className={fieldClass}/></label>
 <label><input type="checkbox" name="confirmed" required/> I own this image or have permission to publish it on this business profile.</label>
 <button className={buttonClass} disabled={busy}>{busy?"Uploading…":"Upload and publish image"}</button><p role="status">{message}</p></form>
 {photos.map(p=><div key={p.id} className="my-2 flex flex-wrap items-center gap-3"><a className="underline" href={p.image_url} target="_blank" rel="noreferrer">{p.alt_text||p.media_kind}</a>{p.media_kind==="business_photo"&&<button disabled={busy} onClick={()=>void changePhoto("cover",p.id)}>Make cover</button>}<button disabled={busy} onClick={()=>void changePhoto("earlier",p.id)}>Move earlier</button><button disabled={busy} onClick={()=>void changePhoto("later",p.id)}>Move later</button><form onSubmit={e=>{e.preventDefault();void changePhoto("caption",p.id,{alt:String(new FormData(e.currentTarget).get("caption")),before_alt:p.alt_text});}}><label>Image description<input required minLength={3} name="caption" defaultValue={p.alt_text||""}/></label><button disabled={busy}>Save description</button></form><button disabled={busy} onClick={()=>void changePhoto("unpublish",p.id)}>Unpublish</button></div>)}</>;
}

const tabs=["Business Details","About","Services & Pricing","Photos & Branding","Specialties & Service Area","Preview"] as const;
type EditorData=Pick<ListingWorkspace,"listings"|"services"|"tags">;
export function ManualProfileEditor({data,onSaved,selected,onDirty,admin=true}:{data:EditorData;onSaved:()=>void;selected:string;onDirty?:(dirty:boolean)=>void;admin?:boolean}){
 const b=data.listings.find(b=>b.id===selected);
 const [tab,setTab]=useState<string>(tabs[0]),[dirty,setDirty]=useState(false),[notice,setNotice]=useState(""),[service,setService]=useState(""),[sub,setSub]=useState(false);
 const [preview,setPreview]=useState(false),[media,setMedia]=useState<PublicTableRow<"vendor_photos">[]>([]),[revision,setRevision]=useState(0);
 useEffect(()=>{let live=true;createBrowserSupabaseClient().from("vendor_photos").select("*").eq("vendor_id",selected).eq("media_status","approved").order("sort_order").then(({data})=>{if(live)setMedia(data??[]);});return()=>{live=false;};},[selected,revision]);
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue="";};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[dirty]);
 function mark(value:boolean){setDirty(value);onDirty?.(value);}
 function change(action:()=>void){if(dirty&&!window.confirm("Discard unsaved changes?"))return;mark(false);setNotice("");action();}
 function saved(){mark(false);setNotice("Changes saved.");setRevision(n=>n+1);onSaved();}
 if(!b)return null;
 const services=(data.services as Service[]).filter(s=>s.vendor_id===selected),active=services.filter(s=>s.active);
 const tags=data.tags.filter(t=>t.vendor_id===selected).map(t=>t.tag);
 const logo=media.find(m=>m.media_kind==="logo")?.image_url, fallback=representativePhoto(b.category,b.description||"");
 const props={businessId:b.id,onSaved:saved};
 const chosen=services.find(s=>s.id===service);
 const privateDraft=b.approval_status!=="approved";
 const item=active[0]?mapServiceToMarketplaceItem(b as PublicTableRow<"vendor_businesses">,active[0],[],media,tags,active):null;
 return <section className="hub-card my-5 p-4 sm:p-7"><p className="text-sm ui-muted">Edit Business Profile</p><header className="my-4 flex flex-wrap items-center gap-4"><BusinessMark large name={b.business_name} logo={logo}/><div><h2 className="text-2xl font-semibold">{b.business_name}</h2><p>{b.location_name||b.service_area_city}</p>{privateDraft?<small>Private candidate</small>:<BusinessStatusBadge item={{databaseSource:true,listingState:b.owner_id?"claimed":"unclaimed",verificationStatus:b.verification_status}}/>}</div>{!privateDraft&&<a className="hub-button ml-auto" href={"/business/"+b.id} target="_blank" rel="noreferrer">View public profile</a>}</header>
 <div className="grid gap-5 md:grid-cols-[190px_minmax(0,1fr)]"><nav aria-label="Profile sections" className="flex gap-2 overflow-x-auto md:flex-col">{tabs.map(t=><button key={t} type="button" className={(tab===t?"ui-primary ":"ui-soft ")+"shrink-0 rounded-lg px-3 py-2 text-left text-sm"} aria-current={tab===t?"page":undefined} onClick={()=>{if(t!==tab)change(()=>{setTab(t);setSub(false);});}}>{t}</button>)}</nav>
 <section key={tab} className="min-w-0"><h3 className="text-xl font-semibold">{tab}</h3><p role="status" className="my-2 text-sm ui-muted">{dirty?"Unsaved changes. ":""}{notice}</p>
 {tab==="About"&&<button type="button" className="hub-button" onClick={()=>change(()=>setSub(!sub))}>{sub?"Edit introduction and description":"Edit custom sections"}</button>}
 {tab==="Services & Pricing"&&<div className="my-3 grid gap-2">{services.map(s=><button key={s.id} className="hub-button text-left" onClick={()=>change(()=>setService(s.id))}>{s.service_name} · {s.category} · {s.base_price==null&&s.hourly_rate==null?"Request quote":s.pricing_type} · {s.active?"Active":"Inactive"}</button>)}<button className="underline" onClick={()=>change(()=>setService("new"))}>Add service</button></div>}
 <div onChangeCapture={()=>mark(true)}>
 {tab==="Business Details"&&<><p className="text-sm ui-muted">Verified identity changes require Admin review.</p><DataForm initial={b} key={JSON.stringify(b)} labels={profileFields} operation="profile" {...props}/></>}
 {tab==="About"&&(sub?<div onClickCapture={e=>{if((e.target as HTMLElement).closest('button[type="button"]'))mark(true);}}><SectionsForm key={JSON.stringify(b.profile_sections)} initial={b.profile_sections??[]} {...props}/></div>:<DataForm key={JSON.stringify(b)} initial={b} labels={{short_intro:"Short introduction (up to 300 characters)",description:"Business description"}} operation="profile" {...props}/>)}
 {tab==="Services & Pricing"&&(chosen||service==="new")&&<><p className="text-sm ui-muted">For quote-based services, leave base price and hourly rate blank.</p><DataForm key={chosen?JSON.stringify(chosen):"new"} initial={chosen||{category:b.category,pricing_type:"flat",active:true}} labels={serviceFields} operation={chosen?"service":"new_service"} {...props}/></>}
 {tab==="Photos & Branding"&&<><Image width={508} height={380} unoptimized src={media.find(p=>p.media_kind==="business_photo")?.image_url||fallback} alt="Current cover" className="my-3 aspect-video w-full rounded-xl object-cover"/>{!media.some(m=>m.media_kind==="business_photo")&&<small>AI-generated representative photo</small>}{privateDraft?<p>Upload official media after publication. This candidate preview stays private.</p>:<UploadForm admin={admin} {...props}/>}</>}
 {tab==="Specialties & Service Area"&&<><button className="hub-button" type="button" onClick={()=>change(()=>setSub(!sub))}>{sub?"Edit service area":"Edit specialties"}</button>{sub?<form className="grid gap-3 py-4" onSubmit={async e=>{e.preventDefault();const values=String(new FormData(e.currentTarget).get("tags")).split(",").map(x=>x.trim()).filter(Boolean);try{await save("specialties",{vendor_id:b.id,before_tags:tags,tags:values});saved();}catch(err){setNotice(err instanceof Error?err.message:"Save failed");}}}><label>Specialties, comma separated<input className={fieldClass} name="tags" defaultValue={tags.join(", ")}/></label><button className={buttonClass}>Save specialties</button></form>:<DataForm initial={b} key={JSON.stringify(b)} labels={{service_area_city:"Operating city",base_address:"Public address",postal_code:"ZIP code",service_radius_miles:"Service radius (miles)"}} operation="profile" {...props}/>}</>}
 {tab==="Preview"&&<><p className="my-4">{privateDraft?"Private preview of saved information.":"Preview uses your saved listing and active services."}</p>{item?<button className="hub-primary" onClick={()=>setPreview(true)}>Open Marketplace preview</button>:<><BusinessMark name={b.business_name} logo={logo}/><h4>{b.business_name}</h4><p>{b.short_intro||b.description}</p><p>Add an active service to preview the full Marketplace card.</p></>}{preview&&item&&<ProviderProfile item={item} preview quote={0} selected={false} onAdd={()=>{}} onClose={()=>setPreview(false)} matchReason=""/>}</>}
 </div></section></div></section>;
}
