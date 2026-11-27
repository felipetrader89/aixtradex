import { IconNoStack, IconShield, IconStop, IconTarget } from "@/components/brand/icons";

const ICONS = [IconShield, IconTarget, IconStop, IconNoStack];

export type RiskItem = { value: string; title: string; body: string };

// Os 4 pilares da gestão de risco (1% por operação, meta do dia, limite de perda, sem recuperação).
export function RiskPrinciples({ items }: { items: RiskItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, i) => {
        const Icon = ICONS[i % ICONS.length];
        return (
          <div
            key={item.title}
            className="glow-border hover-card relative flex flex-col rounded-2xl bg-brand-surface p-6"
          >
            <Icon className="h-8 w-8 text-brand-accent" />
            <p className="mt-5 font-display text-4xl font-extrabold leading-none text-chrome">
              {item.value}
            </p>
            <h3 className="mt-2 text-sm font-semibold uppercase tracking-wide text-brand-accent">
              {item.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-brand-ink-dim">{item.body}</p>
          </div>
        );
      })}
    </div>
  );
}
