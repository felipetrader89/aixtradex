import { GlowCard } from "@/components/brand/GlowCard";

export function SpecTable({
  rows,
}: {
  rows: { label: string; value: string }[];
}) {
  return (
    <GlowCard>
      <dl className="grid gap-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 border-b border-brand-hairline pb-3 text-sm last:border-none last:pb-0"
          >
            <dt className="text-brand-ink-dim">{row.label}</dt>
            <dd className="font-mono font-semibold text-brand-accent">{row.value}</dd>
          </div>
        ))}
      </dl>
    </GlowCard>
  );
}
