import { GlowCard } from "@/components/brand/GlowCard";

export function PricingCard({
  label,
  price,
  period,
  originalPrice,
  badge,
}: {
  label: string;
  price: string;
  period: string;
  originalPrice?: string;
  badge?: string;
}) {
  return (
    <GlowCard className="flex flex-1 flex-col items-center gap-2 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink-dim">
        {label}
      </p>
      {badge && (
        <span className="rounded-full bg-brand-accent px-3 py-1 text-xs font-bold text-brand-bg">
          {badge}
        </span>
      )}
      <p className="font-display text-3xl font-extrabold text-chrome">
        {price}
        <span className="text-base font-medium text-brand-ink-dim"> {period}</span>
      </p>
      {originalPrice && (
        <p className="text-sm text-brand-ink-dim line-through">{originalPrice}</p>
      )}
    </GlowCard>
  );
}
