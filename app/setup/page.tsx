import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";

const steps = [
  "Create a Supabase project at supabase.com.",
  "Copy the Project URL and anon public key from Project Settings > API.",
  "Create .env.local inside the app folder with those two values.",
  "Run supabase/schema.sql in the Supabase SQL Editor.",
  "Restart the local dev server.",
];

export default function SetupPage() {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return (
    <main className="min-h-screen bg-[#F6F3EA] text-neutral-950">
      <Navigation />
      <section className="px-6 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B88A1D]">
            Setup
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
            Connect Arivvio to Supabase.
          </h1>
          <div className="mt-10 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-lg border border-neutral-200 bg-white p-6">
              <h2 className="text-2xl font-semibold tracking-tight">
                Environment status
              </h2>
              <div className="mt-5 space-y-3">
                <StatusRow label="Project URL" ready={hasUrl} />
                <StatusRow label="Anon key" ready={hasAnonKey} />
                <StatusRow
                  label="Database schema"
                  ready={false}
                  note="Run supabase/schema.sql manually in Supabase."
                />
              </div>
            </section>
            <section className="rounded-lg border border-neutral-200 bg-white p-6">
              <h2 className="text-2xl font-semibold tracking-tight">
                What to do
              </h2>
              <ol className="mt-5 space-y-3">
                {steps.map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm leading-6 text-neutral-700">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0D1321] text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <pre className="mt-6 overflow-x-auto rounded-lg bg-[#0D1321] p-4 text-xs text-white">
                {`NEXT_PUBLIC_SUPABASE_URL=your_project_url\nNEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key`}
              </pre>
            </section>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function StatusRow({
  label,
  note,
  ready,
}: {
  label: string;
  note?: string;
  ready: boolean;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-neutral-900">{label}</p>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            ready
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {ready ? "Ready" : "Needed"}
        </span>
      </div>
      {note ? <p className="mt-2 text-xs text-neutral-500">{note}</p> : null}
    </div>
  );
}
