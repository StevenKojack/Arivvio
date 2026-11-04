"use client";
import { useEffect, useState, type FormEvent } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Json, PublicTableRow } from "@/lib/supabase/database.types";
import type { ListingWorkspace } from "@/lib/repositories/listingsRepository";
import { allServices } from "@/app/data/marketplace";

const profileFields = {business_name:"Business name", location_name:"Branch", category:"Category", description:"Public profile text", service_area_city:"Operating city", base_address:"Street address", postal_code:"ZIP code", website_url:"Website", phone:"Public phone", email:"Public email"};
const serviceFields = {service_name:"Service name",category:"Category",description:"Service description",event_types_supported:"Event types (comma separated)",pricing_type:"Pricing model",base_price:"Base price",hourly_rate:"Hourly rate",minimum_hours:"Minimum hours",setup_fee:"Setup fee",travel_fee:"Travel fee",active:"Active in Marketplace"};
const numbers = new Set(["base_price","hourly_rate","minimum_hours","setup_fee","travel_fee"]);
type Fields = Record<string, Json | undefined>;
type Service = PublicTableRow<"vendor_services">;
const fieldClass="w-full rounded-lg border ui-border ui-surface p-2";
const buttonClass="rounded-lg ui-primary px-4 py-2 disabled:opacity-50";
async function save(operation:string,payload:Fields){
 const {error}=await createBrowserSupabaseClient().rpc("admin_profile_edit",{operation,payload});
 if(error)throw new Error(error.message);
}
function DataForm({initial,labels,operation,businessId,onSaved}:{initial:Fields;labels:Record<string,string>;operation:string;businessId:string;onSaved:()=>void}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[newId,setNewId]=useState(()=>crypto.randomUUID());
 const [version,setVersion]=useState(0);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const form=e.currentTarget, data=new FormData(form), changes:Fields={},before:Fields={};
  for(const key of Object.keys(labels)){
   const raw=String(data.get(key)??"").trim();
   const value=key==="active"?data.has(key):key==="event_types_supported"?raw.split(",").map(x=>x.trim()).filter(Boolean):numbers.has(key)?(raw?Number(raw):["setup_fee","travel_fee"].includes(key)?0:null):raw||null;
   if(operation==="new_service"||JSON.stringify(value)!==JSON.stringify(initial[key]??null)){changes[key]=value;before[key]=initial[key]??null;}
  }
  if(!Object.keys(changes).length){setMessage("No changes to save.");return;}
  setBusy(true);
  try{await save(operation,{vendor_id:businessId,id:operation==="new_service"?newId:initial.id,changes,before});setMessage("Saved to this business.");if(operation==="new_service"){setNewId(crypto.randomUUID());setVersion(x=>x+1);}onSaved();}
  catch(error){setMessage(error instanceof Error?error.message:"Save failed.");}finally{setBusy(false);}
 }
 return <form key={version} onSubmit={submit} className="grid gap-3 py-3 sm:grid-cols-2">{Object.entries(labels).map(([key,label])=>{
 const value=initial[key], attr={name:key,className:fieldClass,defaultValue:Array.isArray(value)?value.join(", "):String(value??""),required:["business_name","service_name","category"].includes(key)};
 return <label key={key} className={key==="description"?"grid gap-1 sm:col-span-2":"grid gap-1"}>{label}
 {key==="description"?<textarea {...attr} rows={7}/>:key==="active"?<input name={key} type="checkbox" defaultChecked={value===true}/>:key==="pricing_type"||key==="category"?<select {...attr}>{Array.from(new Set([...(key==="category"?allServices:["flat","hourly","per_guest"]),...(value?[String(value)]:[])])).map(x=><option key={x}>{x}</option>)}</select>:<input {...attr} type={numbers.has(key)?"number":key==="website_url"?"url":key==="email"?"email":"text"} min={numbers.has(key)?0:undefined} step={numbers.has(key)?"0.01":undefined}/>}</label>})}
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

function UploadForm({businessId}:{businessId:string}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const [photos,setPhotos]=useState<PublicTableRow<"vendor_photos">[]>([]),[revision,setRevision]=useState(0);
 useEffect(()=>{let live=true;createBrowserSupabaseClient().from("vendor_photos").select("*").eq("vendor_id",businessId).eq("media_status","approved").order("sort_order").then(({data,error})=>{if(live){setPhotos(data??[]);if(error)setMessage(error.message);}});return()=>{live=false;};},[businessId,revision]);
 async function changePhoto(operation:string,id:string){
   setBusy(true);try{await save(operation,{vendor_id:businessId,id});setRevision(n=>n+1);setMessage(operation==="cover"?"Cover updated.":"Removed from public display.");}
   catch(e){setMessage(e instanceof Error?e.message:"Unable to update photo.");}finally{setBusy(false);}
 }
 const [pending,setPending]=useState<{file:File;path:string}|null>(null);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const form=e.currentTarget,d=new FormData(form),file=d.get("file");
  if(!(file instanceof File)||!file.size||file.size>5*1024*1024||!["image/png","image/jpeg","image/webp"].includes(file.type)){setMessage("Choose a JPG, PNG or WebP up to 5 MB.");return;}
  setBusy(true);
  try{const storage=createBrowserSupabaseClient().storage.from("vendor-photos");
   let path=pending?.file===file?pending.path:null;
   if(!path){const ext={"image/png":"png","image/jpeg":"jpg","image/webp":"webp"}[file.type];path=businessId+"/admin/"+crypto.randomUUID()+"."+ext;
    const {error}=await storage.upload(path,file,{contentType:file.type,upsert:false});if(error)throw new Error(error.message);setPending({file,path});}
   const placement=String(d.get("placement"));await save("upload",{vendor_id:businessId,path,url:storage.getPublicUrl(path).data.publicUrl,kind:placement==="logo"?"logo":"business_photo",placement,alt:String(d.get("alt")),rights:String(d.get("rights")),credit:String(d.get("credit")),rights_confirmed:d.has("confirmed")});
   setPending(null);setRevision(n=>n+1);form.reset();setMessage("Published. Open the public profile to see your image.");
  }catch(error){setMessage(error instanceof Error?error.message:"Upload failed.");}finally{setBusy(false);}
 }
 return <><form onSubmit={submit} className="grid gap-3 py-3"><label>Image file (JPG, PNG or WebP, up to 5 MB)<input required type="file" name="file" accept="image/jpeg,image/png,image/webp" className={fieldClass}/></label>
 <label>Placement<select name="placement" className={fieldClass}><option value="cover">Cover photo</option><option value="logo">Business logo</option><option value="gallery">Gallery photo</option></select></label>
 <label>Image description<input required minLength={3} name="alt" className={fieldClass}/></label>
 <label>Ownership or permission details<input required minLength={10} name="rights" placeholder="For example, I took this photograph for ARIVVIO." className={fieldClass}/></label>
 <label>Credit, if required<input name="credit" className={fieldClass}/></label>
 <label><input type="checkbox" name="confirmed" required/> I own this image or have permission to publish it on this business profile.</label>
 <button className={buttonClass} disabled={busy}>{busy?"Uploading…":"Upload and publish image"}</button><p role="status">{message}</p></form>
 {photos.map(p=><div key={p.id} className="my-2 flex flex-wrap items-center gap-3"><a className="underline" href={p.image_url} target="_blank" rel="noreferrer">{p.alt_text||p.media_kind}</a>{p.media_kind==="business_photo"&&<button disabled={busy} onClick={()=>void changePhoto("cover",p.id)}>Make cover</button>}<button disabled={busy} onClick={()=>void changePhoto("unpublish",p.id)}>Unpublish</button></div>)}</>;
}

export function ManualProfileEditor({data,onSaved}:{data:ListingWorkspace;onSaved:()=>void}){
 const [selected,setSelected]=useState("");const b=data.listings.find(b=>b.id===selected);
 return <section className="my-5 rounded-xl border ui-border p-4"><h3 className="text-xl font-semibold">Edit a vendor profile</h3><p className="my-2 text-sm">Select a business and branch. Each section saves independently to the live profile. Use blank lines in your description to separate sections.</p>
 <label>Business and branch<select className={fieldClass} value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Choose a business</option>{data.listings.map(b=><option key={b.id} value={b.id}>{[b.business_name,b.location_name||b.service_area_city].filter(Boolean).join(" · ")}</option>)}</select></label>
 {b&&<div key={b.id} className="mt-4 space-y-4"><a href={"/business/"+b.id} target="_blank" rel="noreferrer" className="underline">View public profile</a>
 <details open><summary>Business information</summary><DataForm key={JSON.stringify(b)} initial={b} labels={profileFields} operation="profile" businessId={b.id} onSaved={onSaved}/></details>
 <details><summary>Custom profile sections</summary><SectionsForm key={JSON.stringify(b.profile_sections)} businessId={b.id} initial={b.profile_sections??[]} onSaved={onSaved}/></details>
 <details><summary>Services and pricing</summary>{(data.services as Service[]).filter(s=>s.vendor_id===b.id).map(s=><details key={s.id} className="my-3"><summary>{s.service_name}</summary><DataForm key={JSON.stringify(s)} initial={s} labels={serviceFields} operation="service" businessId={b.id} onSaved={onSaved}/></details>)}<details><summary>Add a service</summary><DataForm initial={{category:b.category,pricing_type:"flat",active:true}} labels={serviceFields} operation="new_service" businessId={b.id} onSaved={onSaved}/></details></details>
 <details><summary>Upload logo, cover or gallery image</summary><UploadForm businessId={b.id}/></details></div>}</section>;
}
