import Link from "next/link";
import { Navigation } from "../components/Navigation";
export function LegalPage({ title, sections }: { title: string; sections: [string, string][] }) {
  return <main className="min-h-screen ui-page ui-text"><Navigation /><article className="mx-auto max-w-3xl px-5 py-12 sm:px-8"><p className="text-xs uppercase tracking-widest ui-muted">Arivvio pre-beta · Updated September 22, 2026</p><h1 className="mt-4 text-4xl font-semibold">{title}</h1><p className="mt-5 text-sm leading-7 ui-muted">These starter terms and notices describe the current demonstration. They are not an attorney-reviewed compliance certification and will need review before a commercial launch.</p>{sections.map(([heading,text]) => <section className="mt-8" key={heading}><h2 className="text-xl font-semibold">{heading}</h2><p className="mt-3 text-base leading-7 ui-muted">{text}</p></section>)}<Link href="/support-project" className="hub-button mt-8">Contact Arivvio</Link></article></main>;
}
