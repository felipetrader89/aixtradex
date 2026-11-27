import { IconSliders } from "@/components/brand/icons";

export type ProfileItem = {
  key: string;
  name: string;
  goal: string;
  loss: string;
  risk: string;
  level: number;
  levelText: string;
  body: string;
};

type Labels = {
  goal: string;
  loss: string;
  risk: string;
  levelLabel: string;
  customTitle: string;
  customBody: string;
  warning: string;
};

// Perfis do Assistente IA (Conservador / Moderado / Agressivo + Personalizado), com o risco de cada um à vista.
// Os números vêm das mensagens e precisam bater com PLAN_PROFILES (lib/plan-math.ts) e RISK_PROFILES (lib/robot-options.ts).
export function ProfileCards({ items, labels }: { items: ProfileItem[]; labels: Labels }) {
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {items.map((p) => (
          <div key={p.key} className="glow-border hover-card flex flex-col rounded-2xl bg-brand-surface p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-lg font-bold text-chrome">{p.name}</h3>
              <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-brand-ink-dim">
                <span className="sr-only">{labels.levelLabel}:</span>
                <span aria-hidden="true" className="flex gap-1">
                  {[1, 2, 3].map((n) => (
                    <span
                      key={n}
                      className={`h-3 w-1.5 rounded-sm ${n <= p.level ? "bg-brand-accent" : "bg-brand-ink-dim/25"}`}
                    />
                  ))}
                </span>
                {p.levelText}
              </span>
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
              {[
                { label: labels.goal, value: p.goal },
                { label: labels.loss, value: p.loss },
                { label: labels.risk, value: p.risk },
              ].map((row) => (
                <div key={row.label} className="flex flex-col-reverse rounded-xl bg-brand-surface-2 px-1 py-3">
                  <dt className="mt-1 flex min-h-[2.6em] items-start justify-center text-[10px] leading-tight text-brand-ink-dim sm:text-[11px]">{row.label}</dt>
                  <dd className="font-display text-xl font-extrabold text-brand-ink">{row.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm leading-relaxed text-brand-ink-dim">{p.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-dashed border-brand-hairline px-5 py-4 text-sm">
        <IconSliders className="mt-0.5 h-5 w-5 shrink-0 text-brand-accent" />
        <p className="text-brand-ink-dim">
          <span className="font-semibold text-brand-ink">{labels.customTitle}: </span>
          {labels.customBody}
        </p>
      </div>
      <p className="mx-auto mt-5 max-w-3xl text-center text-sm text-brand-ink">{labels.warning}</p>
    </div>
  );
}
