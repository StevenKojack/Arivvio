const stats = [
  ["1", "guided intake"],
  ["4", "recommendation groups"],
  ["0", "duplicate planning flows"],
];

export function TrustSection() {
  return (
    <section className="bg-[#0D1321] px-6 py-20 text-white sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
            Built for planners and providers
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Why hosts use Arivvio: less guessing, clearer timing, better vendor fit.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map(([value, label]) => (
            <div key={label} className="rounded-[24px] border border-[#D4AF37]/16 bg-white/[0.035] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <p className="text-4xl font-semibold text-[#D4AF37]">{value}</p>
              <p className="mt-2 text-sm text-neutral-400">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
