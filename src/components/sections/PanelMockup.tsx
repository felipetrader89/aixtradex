import { getTranslations } from "next-intl/server";
import { IconSpark, IconChartUp } from "@/components/brand/icons";

// Ilustração do painel do cliente (painel Hoje + Assistente IA) feita em HTML/CSS.
// É só ilustrativa: valores neutros (perfil, meta e limite), sem resultado em dinheiro nem % de lucro.
export async function PanelMockup() {
  const t = await getTranslations("Home.mockup");
  const pairs = [
    { pair: "XAU/USD", status: t("pairTrading"), tone: "on" },
    { pair: "EUR/USD", status: t("pairWaiting"), tone: "idle" },
    { pair: "GBP/USD", status: t("pairPaused"), tone: "off" },
  ] as const;

  return (
    <figure className="mockup-float relative mx-auto w-full max-w-md select-none" aria-label={t("label")}>
      <div aria-hidden="true" className="absolute -inset-6 -z-10 rounded-[2rem] bg-brand-accent/10 blur-3xl" />
      <div className="glow-border overflow-hidden rounded-2xl bg-brand-surface/95 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] backdrop-blur">
        {/* barra do topo */}
        <div className="flex items-center justify-between border-b border-brand-hairline px-4 py-3">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-ink-dim/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-brand-ink-dim/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-brand-ink-dim/40" />
          </div>
          <span className="font-display text-sm font-bold text-brand-ink">{t("title")}</span>
          <span className="rounded-full border border-brand-hairline px-2 py-0.5 text-[10px] font-medium text-brand-ink-dim">
            {t("label")}
          </span>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          {/* conta e status */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-brand-ink-dim">{t("account")}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-accent/10 px-2.5 py-1 text-[11px] font-semibold text-brand-accent">
              <span className="mockup-pulse h-1.5 w-1.5 rounded-full bg-brand-accent" aria-hidden="true" />
              {t("status")}
            </span>
          </div>

          {/* plano */}
          <dl className="grid grid-cols-2 gap-2">
            {[
              [t("profile"), t("profileValue")],
              [t("mode"), t("modeValue")],
              [t("goal"), t("goalValue")],
              [t("loss"), t("lossValue")],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col-reverse rounded-xl bg-brand-surface-2 px-3 py-2.5">
                <dt className="text-[10px] uppercase tracking-wide text-brand-ink-dim">{k}</dt>
                <dd className="font-display text-sm font-bold text-brand-ink">{v}</dd>
              </div>
            ))}
          </dl>

          {/* andamento da meta (sem número) */}
          <div>
            <div className="mb-1.5 text-[10px] uppercase tracking-wide text-brand-ink-dim">{t("progress")}</div>
            <div className="h-2 overflow-hidden rounded-full bg-brand-surface-2">
              <div className="mockup-bar h-full w-2/5 rounded-full bg-gradient-to-r from-brand-accent-dark to-brand-accent" />
            </div>
          </div>

          {/* pares */}
          <div>
            <div className="mb-2 text-[10px] uppercase tracking-wide text-brand-ink-dim">{t("pairs")}</div>
            <ul className="divide-y divide-brand-hairline rounded-xl bg-brand-bg/40">
              {pairs.map((p) => (
                <li key={p.pair} className="flex items-center justify-between px-3 py-2 text-xs">
                  <span className="font-mono font-semibold text-brand-ink">{p.pair}</span>
                  <span
                    className={`inline-flex items-center gap-1.5 ${
                      p.tone === "on" ? "text-brand-accent" : "text-brand-ink-dim"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 rounded-full ${
                        p.tone === "on" ? "bg-brand-accent" : p.tone === "idle" ? "bg-brand-ink-dim" : "bg-brand-ink-dim/40"
                      }`}
                    />
                    {p.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* IA */}
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-start gap-2 rounded-xl border border-brand-hairline px-3 py-2.5">
              <IconSpark className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" />
              <div>
                <p className="text-[11px] font-semibold text-brand-ink">{t("assistant")}</p>
                <p className="text-[10px] leading-snug text-brand-ink-dim">{t("assistantText")}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-brand-hairline px-3 py-2.5">
              <IconChartUp className="mt-0.5 !h-4 !w-4 shrink-0 text-brand-accent" />
              <div>
                <p className="text-[11px] font-semibold text-brand-ink">{t("bias")}</p>
                <p className="text-[10px] leading-snug text-brand-ink-dim">{t("biasValue")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
