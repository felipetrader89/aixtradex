// Peças visuais simples do admin (server components, sem JS no navegador).

export const adminInput =
  "rounded-lg border border-brand-hairline bg-brand-bg px-3 py-2 text-sm text-brand-ink outline-none focus:border-brand-accent";
export const adminBtn =
  "rounded-full bg-brand-accent px-4 py-2 text-xs font-semibold text-brand-bg transition-[filter] hover:brightness-110";
export const adminBtnGhost =
  "rounded-full border border-brand-hairline px-4 py-2 text-xs font-semibold text-brand-ink-dim transition-colors hover:border-brand-accent hover:text-brand-accent";
export const adminBtnDanger =
  "rounded-full border border-red-500/40 px-4 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/10";

// `tight` = sem margem embaixo (quando já está dentro de uma coluna com espaçamento).
export function Flash({ msg, err, tight }: { msg?: string; err?: string; tight?: boolean }) {
  const space = tight ? "" : "mb-6 ";
  if (err) {
    return <p className={`${space}rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200`}>⚠️ {err}</p>;
  }
  if (!msg) return null;
  return (
    <p className={`${space}rounded-xl border border-brand-accent/40 bg-brand-accent/10 px-4 py-3 text-sm text-brand-ink`}>{msg}</p>
  );
}

// Título de página do admin.
export function PageHeader({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-chrome">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-brand-ink-dim">{description}</p>}
      </div>
      {children}
    </div>
  );
}

// Linha "rótulo: valor" usada nos cartões de status.
export function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-hairline py-2.5 text-sm last:border-0">
      <span className="text-brand-ink-dim">{label}</span>
      <span className="text-right text-brand-ink">{children}</span>
    </div>
  );
}

export const adminLabel = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-brand-ink-dim";

export function Panel({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`panel-card rounded-2xl border border-brand-hairline bg-brand-surface/90 p-5 backdrop-blur-sm ${className}`}>
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
