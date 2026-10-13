import Link from "next/link";
import { UiIcon } from "./UiIcon";
const steps = [
  ["Idea", "Describe your occasion", "Start with a birthday, wedding, company dinner or something of your own.", "/demo"],
  ["Plan", "Work out the details", "Keep dates, guests, budget and each part of your event together.", "/discover"],
  ["Marketplace", "Find your event team", "Compare services, specialties and estimates before choosing vendors.", "/marketplace?entryMode=browse"],
  ["Vendors", "Review your requests", "Keep selections and responses connected to the right event.", "/requests"],
  ["Event Hub", "Know what comes next", "Return to your event for its details, requests and next planning step.", "/account/demo"],
];
export function HowItWorks() {
 return <section className="workflow-section px-6 py-16 sm:px-8"><div className="mx-auto max-w-7xl">
 <p className="eyebrow">How Arivvio works</p><h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">One plan, from the first idea.</h2>
 <ol className="workflow-steps mt-10">{steps.map(([label,title,body,href],i)=><li key={label}><Link href={href} className="workflow-step"><span className="eyebrow">0{i+1} / {label}</span><h3 className="mt-5 text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 ui-muted">{body}</p><UiIcon name="arrow" className="mt-5" /></Link></li>)}</ol>
 </div></section>;
}
