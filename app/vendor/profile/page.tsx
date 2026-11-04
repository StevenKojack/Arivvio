import {Navigation} from "@/app/components/Navigation";
import {VendorProfileWorkspace} from "./VendorProfileWorkspace";
export default async function Page({searchParams}:{searchParams:Promise<{business?:string}>}){
 const {business}=await searchParams;
 return <main id="main-content" className="min-h-screen ui-page ui-text"><Navigation/><div className="mx-auto max-w-5xl p-5"><VendorProfileWorkspace initial={business}/></div></main>;
}
