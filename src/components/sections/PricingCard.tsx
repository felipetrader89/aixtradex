import { GlowCard } from "@/components/brand/GlowCard";

export function PricingCard({
  label,
  price,
  period,
  originalPrice,
  badge,
  note,
  className = "",
}: {
  label: string;
  price: string;
  period: string;
  originalPrice?: string;
  badge?: string;
  note?: string;
  className?: string;
}) {
  return (
    <GlowCard
      className={`relative flex flex-1 flex-col items-center gap-2 overflow-hidden text-center ${className}`}
    >
      {badge && (
        <span className="absolute right-[-38px] top-[18px] w-[150px] rotate-45 bg-brand-accent py-1 text-center text-xs font-bold text-brand-bg">
          {badge}
        </span>
      )}
      <p className="font-display text-lg font-bold text-brand-accent">{label}</p>
      <p className="font-display text-3xl font-extrabold text-chrome">
        {originalPrice && (
          <span className="mr-2 text-lg font-medium text-brand-ink-dim line-through">
            {originalPrice}
          </span>
        )}
        {price}
        <span className="text-base font-medium text-brand-ink-dim">{period}</span>
      </p>
      {note && <p className="text-xs text-brand-ink-dim">{note}</p>}
    </GlowCard>
  );
}
