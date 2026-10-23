import { Navigation } from "@/app/components/Navigation";
import { PrivacyCenter } from "./PrivacyCenter";
export const metadata = { title: "Privacy & Data | ARIVVIO" };
export default function Page() { return <main id="main-content" tabIndex={-1} className="ui-page ui-text min-h-screen"><Navigation/><div className="mx-auto max-w-3xl px-5 py-10"><h1 className="text-3xl font-semibold">Privacy & Data</h1><PrivacyCenter/></div></main>; }
