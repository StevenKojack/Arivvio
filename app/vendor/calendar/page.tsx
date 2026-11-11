import {Navigation} from '@/app/components/Navigation';
import {CalendarWorkspace} from './CalendarWorkspace';
export default async function Page({searchParams}:{searchParams:Promise<{business?:string}>}){
 const {business}=await searchParams;
 return <main id="main-content" className="min-h-screen ui-page ui-text"><Navigation/><div className="mx-auto max-w-6xl p-4 sm:p-6"><CalendarWorkspace initial={business}/></div></main>;
}
