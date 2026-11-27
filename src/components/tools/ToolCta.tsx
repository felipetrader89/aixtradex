import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import { TOOLS } from "@/lib/tools";

// Fim de cada ferramenta: chamada discreta pro Ai X PULSE RS + atalhos pras outras ferramentas.
export async function ToolCta({ current }: { current?: string }) {
  const t = await getTranslations("Tools");
  const tf = await getTranslations("Footer.toolsLinks");
  const others = TOOLS.filter((x) => x.href && x.key !== current);
  return (
    <div className="mt-14 space-y-8">
      {others.length > 0 && (
        <nav aria-label={t("hub.title")} className="flex flex-wrap items-center gap-2 text-sm">
          {others.map((x) => (
            <Link
              key={x.key}
              href={x.href!}
              className="rounded-full border border-brand-hairline px-3.5 py-1.5 text-brand-ink-dim transition-colors hover:border-brand-accent hover:text-brand-accent"
            >
              {tf(x.key)} →
            </Link>
          ))}
        </nav>
      )}
      <aside className="glow-border flex flex-col gap-5 rounded-2xl bg-gradient-to-br from-brand-surface-2 to-brand-surface p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="max-w-xl">
          <p className="font-display text-lg font-bold text-chrome">{t("cta.title")}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-brand-ink-dim">{t("cta.body")}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Button href="/how-it-works" variant="secondary" className="!px-5 !py-2.5">
            {t("cta.button")}
          </Button>
          <Link href="/products#pass" className="text-center text-xs font-semibold text-brand-accent hover:underline">
            {t("cta.secondary")} →
          </Link>
        </div>
      </aside>
    </div>
  );
}
