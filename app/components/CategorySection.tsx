import { CategoryCard } from "./CategoryCard";

const categories = [
  "Birthday",
  "Wedding",
  "Graduation",
  "Corporate",
  "Seminar",
  "Convention",
  "Funeral",
  "Baby Shower",
  "Fundraiser",
  "Private Party",
];

export function CategorySection() {
  return (
    <section id="categories" className="bg-white px-6 py-20 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-6 border-t border-neutral-200 pt-12 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B88A1D]">
              What Arivvio can plan
            </p>
            <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
              From celebrations to serious gatherings, the intake adapts to the occasion.
            </h2>
          </div>
          <p className="max-w-md text-base leading-7 text-neutral-600">
            Arivvio reads the intent first, then narrows the right questions,
            vendors, and timing details around that specific event.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {categories.map((category) => (
            <CategoryCard key={category} name={category} />
          ))}
        </div>
      </div>
    </section>
  );
}
