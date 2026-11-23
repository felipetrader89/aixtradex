// Peças visuais simples do admin (server components, sem JS no navegador).

export const adminInput =
  "rounded-lg border border-brand-hairline bg-brand-bg px-3 py-2 text-sm text-brand-ink outline-none focus:border-brand-accent";
export const adminBtn =
  "rounded-full bg-brand-accent px-4 py-2 text-xs font-semibold text-brand-bg transition-[filter] hover:brightness-110";
export const adminBtnGhost =
  "rounded-full border border-brand-hairline px-4 py-2 text-xs font-semibold text-brand-ink-dim transition-colors hover:border-brand-accent hover:text-brand-accent";
export const adminBtnDanger =
  "rounded-full border border-red-500/40 px-4 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/10";

export function Flash({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mb-6 rounded-xl border border-brand-accent/40 bg-brand-accent/10 px-4 py-3 text-sm text-brand-ink">{msg}</p>
  );
}

export function Panel({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-brand-hairline bg-brand-surface p-5 ${className}`}>
      {title && <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-brand-accent">{title}</h2>}
      {children}
    </section>
  );
}

export function Badge({ tone, children }: { tone: "ok" | "warn" | "bad" | "muted"; children: React.ReactNode }) {
  const style = {
    ok: "bg-brand-accent text-brand-bg",
    warn: "bg-amber-500/20 text-amber-300",
    bad: "bg-red-500/20 text-red-300",
    muted: "bg-brand-surface-2 text-brand-ink-dim",
  }[tone];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${style}`}>{children}</span>;
}

export const fmtDate = (d: Date | null | undefined) =>
  d ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" }) : "-";

export const fmtDateTime = (d: Date | null | undefined) =>
  d
    ? d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      })
    : "-";

export const usd = (v: string | number) => `$${Number(v).toFixed(2).replace(/\.00$/, "")}`;
