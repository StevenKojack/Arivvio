type CategoryCardProps = {
  name: string;
};

export function CategoryCard({ name }: CategoryCardProps) {
  return (
    <article className="group flex min-h-32 flex-col justify-between rounded-[24px] border border-[#D4AF37]/16 bg-white p-5 shadow-[0_18px_40px_rgba(13,19,33,0.045)] transition duration-300 hover:-translate-y-1 hover:border-[#D4AF37]/38 hover:shadow-[0_22px_52px_rgba(13,19,33,0.09)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0D1321] text-sm font-semibold text-[#D4AF37] shadow-[0_12px_26px_rgba(13,19,33,0.16)]">
        {name.slice(0, 1)}
      </div>
      <h3 className="text-lg font-semibold text-neutral-950">{name}</h3>
    </article>
  );
}
