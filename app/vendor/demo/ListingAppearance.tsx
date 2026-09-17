"use client";
import { useState } from "react";
import Image from "next/image";
import type { ListingMedia } from "@/lib/vendor-demo/model";

const samples = ["/event-planning-hero.png", "/logo-assets/web/arivvio-mark-dark.png", "/logo-assets/web/arivvio-mark-light.png"];
export function ListingAppearance({ media, onChange }: { media: ListingMedia; onChange: (media: ListingMedia) => void }) {
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  function assign(kind: "cover" | "profile" | "gallery", url: string) { onChange(kind === "gallery" ? {...media,gallery:[...media.gallery,url].slice(0,6)} : {...media,[kind]:url}); }
  async function upload(kind: "cover" | "profile" | "gallery", file?: File) {
    if (!file) return;
    setError("");
    if (!["image/jpeg","image/png","image/webp"].includes(file.type) || file.size > 5*1024*1024) { setError("Choose a JPG, PNG or WebP up to 5 MB."); return; }
    setBusy(true);
    const url = URL.createObjectURL(file);
    try {
      const img = new window.Image(); img.src=url; await img.decode();
      const scale = Math.min(1,1200/Math.max(img.width,img.height));
      const canvas = document.createElement("canvas"); canvas.width=Math.round(img.width*scale); canvas.height=Math.round(img.height*scale);
      const context=canvas.getContext("2d"); if(!context) throw new Error("Canvas unavailable");
      context.drawImage(img,0,0,canvas.width,canvas.height);
      const data=canvas.toDataURL("image/webp",.75);
      if(data.length>650000) { setError("This image is too detailed for browser storage. Try a smaller photo."); return; }
      assign(kind,data);
    } catch { setError("This image could not be read. Choose another file."); }
    finally { URL.revokeObjectURL(url); setBusy(false); }
  }
  return <div className="space-y-6"><p className="hub-muted text-sm">Images are saved only in this browser. JPG, PNG or WebP, up to 5 MB each. Images are resized for the demo; gallery limit: 6.</p>{(["cover","profile","gallery"] as const).map(kind=><section key={kind} className="hub-card p-4"><h3 className="font-semibold">{kind === "cover" ? "Cover / banner" : kind === "profile" ? "Business image / logo" : "Gallery photos"}</h3><p className="hub-muted my-2 text-xs">{kind === "cover" ? "Wide center crop in your card and profile hero." : kind === "profile" ? "Square image, shown without cropping your logo." : "Show customers your work. Move photos left to reorder."}</p><div className="my-3 flex flex-wrap gap-3">{(kind === "gallery" ? media.gallery : media[kind] ? [media[kind]!] : []).map((src,i)=><div key={`${i}-${src.slice(-30)}`} className={kind === "cover" ? "w-full" : "w-32"}><div className={`relative overflow-hidden rounded-xl ui-soft ${kind === "cover" ? "aspect-[3/1]" : "aspect-square"}`}><Image src={src} alt={`${kind} preview ${i+1}`} fill unoptimized sizes="600px" className={kind === "profile" ? "object-contain" : "object-cover"} /></div><div className="mt-2 flex gap-2"><button className="hub-button" aria-label={`Remove ${kind} ${i+1}`} onClick={()=>onChange(kind === "gallery" ? {...media,gallery:media.gallery.filter((_,n)=>n!==i)} : {...media,[kind]:undefined})}>Remove</button>{kind === "gallery" && i>0 && <button className="hub-button" aria-label={`Move gallery photo ${i+1} left`} onClick={()=>{const gallery=[...media.gallery];[gallery[i-1],gallery[i]]=[gallery[i],gallery[i-1]];onChange({...media,gallery});}}>←</button>}</div></div>)}</div><label className="block text-sm">{kind === "gallery" ? "Add gallery photo" : `Upload or replace ${kind}`}<input className="hub-input mt-2 block w-full" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || (kind === "gallery" && media.gallery.length>=6)} onChange={e=>{void upload(kind,e.target.files?.[0]);e.target.value="";}} /></label><div className="mt-3 flex flex-wrap gap-2">{samples.map((src,i)=><button key={src} className="hub-button" disabled={busy || (kind === "gallery" && media.gallery.length>=6)} onClick={()=>assign(kind,src)}>Use sample {i+1}</button>)}</div></section>)}{busy && <p role="status">Preparing image…</p>}{error && <p role="alert">{error}</p>}</div>;
}
