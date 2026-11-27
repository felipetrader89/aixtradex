import { PageHeader } from "@/components/sections/PageHeader";
import { Link } from "@/i18n/navigation";
import {
  LEGAL,
  LEGAL_HREF,
  LEGAL_KEYS,
  LEGAL_UI,
  LEGAL_UPDATED_ISO,
  type LegalKey,
  type LegalLocale,
} from "@/content/legal";

const asLegalLocale = (locale: string): LegalLocale => (locale === "pt" || locale === "es" ? locale : "en");

// Termos de uso, Política de privacidade e Aviso de risco: mesmo layout, texto vem de src/content/legal.ts.
export function LegalPage({ locale, doc: key }: { locale: string; doc: LegalKey }) {
  const loc = asLegalLocale(locale);
  const doc = LEGAL[loc][key];
  const ui = LEGAL_UI[loc];
  return (
    <>
      <PageHeader eyebrow={doc.eyebrow} title={doc.title} intro={doc.intro} />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-14">
        <p className="mb-10 text-xs text-brand-ink-dim">
          {ui.updated} <time dateTime={LEGAL_UPDATED_ISO}>{ui.date}</time>
        </p>
        <div className="space-y-9">
          {doc.sections.map((s) => (
            <section key={s.h}>
              <h2 className="mb-3 font-display text-lg font-bold text-chrome">{s.h}</h2>
              <div className="space-y-3">
                {s.p.map((para, i) => (
                  <p key={i} className="leading-relaxed text-brand-ink-dim">
                    {para}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-12 border-t border-brand-hairline pt-6 text-sm text-brand-ink-dim">{ui.contact}</p>
        <nav aria-label={ui.others} className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-brand-ink-dim">{ui.others}:</span>
          {LEGAL_KEYS.filter((k) => k !== key).map((k) => (
            <Link
              key={k}
              href={LEGAL_HREF[k]}
              className="rounded-full border border-brand-hairline px-3.5 py-1.5 text-brand-ink-dim transition-colors hover:border-brand-accent hover:text-brand-accent"
            >
              {LEGAL[loc][k].title}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
