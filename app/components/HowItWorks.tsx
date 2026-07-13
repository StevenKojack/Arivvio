const steps = [
  {
    title: "Tell Arivvio the occasion",
    body: "Share the event type, location, guest count, budget, and the services you need.",
  },
  {
    title: "Compare matched options",
    body: "Browse venues, vendors, entertainment, rentals, and invitations in one view.",
  },
  {
    title: "Coordinate the plan",
    body: "Keep the shortlist, budget, and next steps organized from first idea to event day.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-[linear-gradient(180deg,#F7F4EC,#ffffff)] px-6 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B88A1D]">
            How it works
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
            From idea to booked, without losing the thread.
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <article
              key={step.title}
              className="group rounded-[30px] border border-[#D4AF37]/14 bg-white/92 p-6 shadow-[0_20px_60px_rgba(13,19,33,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[#D4AF37]/32 hover:shadow-[0_28px_80px_rgba(13,19,33,0.1)]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0D1321] text-sm font-semibold text-[#D4AF37] shadow-[0_14px_34px_rgba(13,19,33,0.18)] transition group-hover:scale-105">
                {index + 1}
              </span>
              <h3 className="mt-8 text-xl font-semibold text-neutral-950">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-neutral-600">{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
