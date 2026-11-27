import { GlowCard } from "@/components/brand/GlowCard";

// Tabela rótulo/valor. `bare` tira o cartão (quando já está dentro de um GlowCard).
export function SpecTable({
  rows,
  bare = false,
}: {
  rows: { label: string; value: string }[];
  bare?: boolean;
}) {
  const list = (
    <dl className="grid gap-3">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-start justify-between gap-4 border-b border-brand-hairline pb-3 text-sm last:border-none last:pb-0"
        >
          <dt className="text-brand-ink-dim">{row.label}</dt>
          <dd className="text-right font-mono font-semibold text-brand-accent">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
  return bare ? list : <GlowCard>{list}</GlowCard>;
}
