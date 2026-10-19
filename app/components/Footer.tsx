import Link from "next/link";
import { Logo } from "./Logo";
const groups = [
 ["Plan", [["Start an event","/demo"],["Browse vendors","/marketplace?entryMode=browse"],["Your events","/account/demo"]]],
 ["Vendors", [["Vendor workspace","/vendor/demo"],["Join Arivvio","/vendor/login"]]],
 ["Company", [["About the preview","/?info=1"],["Contact the team","/support-project"]]],
 ["Legal", [["Privacy","/privacy"],["Terms of use","/terms"],["Demo terms","/legal"]]],
] as const;
export function Footer() {
 const linkedIn=process.env.NEXT_PUBLIC_ARIVVIO_LINKEDIN_URL;
 const officialLinkedIn=linkedIn && /^https:\/\/(www\.)?linkedin\.com\/company\/[^\s]+$/.test(linkedIn) ? linkedIn : null;
 return <footer className="site-footer px-6 py-12 sm:px-8"><div className="mx-auto max-w-7xl"><div className="footer-grid"><div><Logo inverted/><p className="mt-5 max-w-xs text-sm leading-6 text-slate-300">Find your event team.<br/>Keep the details together.</p>{officialLinkedIn&&<a className="mt-5 inline-block text-sm underline" href={officialLinkedIn} target="_blank" rel="noreferrer">LinkedIn</a>}</div>{groups.map(([title,links])=><nav key={title} aria-label={title}><h2 className="text-sm font-semibold">{title}</h2><ul className="mt-5 space-y-3">{links.map(([name,href])=><li key={name}><Link href={href} className="text-sm text-slate-300 hover:text-white">{name}</Link></li>)}</ul></nav>)}</div><div className="mt-12 flex flex-wrap justify-between gap-3 border-t border-white/15 pt-6 text-xs text-slate-300"><p>© 2026 Arivvio</p><p>Pre-beta preview. Payments are not connected.</p></div></div></footer>;
}
