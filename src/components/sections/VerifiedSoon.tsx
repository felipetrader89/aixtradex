import { IconVerified } from "@/components/brand/icons";

// Faixa "Conta verificada no Myfxbook: em breve" (a conta só abre no lançamento da v8 VIP).
export function VerifiedSoon({ badge, title, body }: { badge: string; title: string; body: string }) {
  return (
    <div className="glow-border flex flex-col items-start gap-4 rounded-2xl bg-gradient-to-br from-brand-surface to-brand-surface-2 p-6 sm:flex-row sm:items-center">
      <IconVerified className="h-10 w-10 shrink-0 text-brand-accent" />
      <div className="flex-1">
        <span className="inline-block rounded-full border border-brand-accent/40 bg-brand-accent/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand-accent">
          {badge}
        </span>
        <p className="mt-2 font-display text-lg font-bold text-brand-ink">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-brand-ink-dim">{body}</p>
      </div>
    </div>
  );
}
