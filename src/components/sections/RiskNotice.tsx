import { IconAlert } from "@/components/brand/icons";

// Aviso de risco destacado (usado em Home, Planos, Como Funciona e Resultados).
export function RiskNotice({ title, body }: { title: string; body: string }) {
  return (
    <aside
      role="note"
      className="flex items-start gap-4 rounded-2xl border border-brand-chrome-end/20 bg-brand-surface/60 p-5 sm:p-6"
    >
      <IconAlert className="h-7 w-7 shrink-0 text-brand-chrome-end" />
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-chrome-start">{title}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-brand-ink-dim">{body}</p>
      </div>
    </aside>
  );
}
