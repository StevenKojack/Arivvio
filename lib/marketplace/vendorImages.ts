import type { MarketplaceItem } from "@/app/data/marketplace";
const scenes: Record<string,string> = {Venue:"ballroom",DJ:"dj",Florals:"floral",Rentals:"rentals","Cake & Desserts":"bakery",Catering:"catering",Photography:"photo",Videography:"photo","Live Music":"music",Transportation:"transport",Magic:"magic",Security:"security","AV Production":"production",Staffing:"staff","Bounce Houses":"play"};

export function representativePhoto(category:string,summary="") {
 let theme=scenes[category]||"neutral";
 if(category==="Venue"){
   if(/inflatable|indoor play|play arena/i.test(summary))theme="play";
   else if(/garden|courtyard/i.test(summary))theme="garden";
 }
 return "/photography/"+theme+".webp";
}
export function profileCover(item:MarketplaceItem) {
 const photo=item.media?.filter(m=>m.status==="approved"&&m.kind==="business_photo").sort((a,b)=>{
   if(a.order<0||b.order<0)return a.order-b.order;
   return Number(b.vendorAttested)-Number(a.vendorAttested)||a.order-b.order;
 })[0];
 if(photo)return {src:photo.url,alt:photo.alt,illustrative:false,label:"Business photograph",attribution:photo.attribution};
 return {src:representativePhoto(item.type,item.businessSummary||item.description),alt:"Representative "+item.type.toLowerCase()+" scene, not a photograph of "+item.name,illustrative:true,label:"AI-generated representative photo",attribution:null};
}
export const getVendorMedia=profileCover;
export function getVendorImage(item:MarketplaceItem){return profileCover(item).src;}
