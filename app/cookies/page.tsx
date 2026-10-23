import { LegalPage } from "../legal/LegalPage";
import { storageInventory } from "@/lib/privacy/services";
export const metadata = { title: "Cookies & Storage | ARIVVIO" };
export default function Page(){return <LegalPage title="Cookies & Storage" sections={[
 ["Browser storage is not all cookies","ARIVVIO uses localStorage and sessionStorage for product features. The current application does not set an advertising cookie or include an analytics/advertising SDK. Hosting and third-party services may process technical requests. We have not added a banner that offers a choice without actually blocking technology."],
 ...storageInventory.map(([name,keys,purpose])=>[name,`${keys}: ${purpose}`] as [string,string]),
 ["Maps and external images","Loading a Mapbox map or entering a location sends requests to Mapbox. Optional map performance collection is disabled in our map configuration. Operational usage/billing data can still be processed. Unsplash illustrations load from external image hosting, which receives technical connection information."],
 ["Control your device data","Account → Privacy & Data includes Clear data saved on this device, with confirmation. It clears only ARIVVIO-owned product keys. It does not clear unrelated storage, Supabase sign-in or Mapbox state, and does not delete server records. Sign out to remove the current stored auth session. Browser site-data settings can remove remaining storage."],
 ["Future tracking","Nonessential advertising or analytics must undergo a separate review before release, with real blocking and changeable choices where required. No advertising consent is bundled into account signup or support inquiries."]
 ]}/>;}
