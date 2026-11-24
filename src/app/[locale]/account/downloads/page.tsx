import NextLink from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, PortalHeader } from "@/components/portal/ui";
import { licenseState } from "@/lib/licensing";
import { loadLicenses, loadVersions, requireCustomer } from "@/lib/portal";
import { PRODUCT } from "@/lib/plans";

type Props = { params: Promise<{ locale: string }> };

// Nome de cada idioma escrito nele mesmo (o cliente reconhece o dele em qualquer página).
const LANG_NAMES: Record<string, string> = { pt: "Português", en: "English", es: "Español" };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Portal" });
  return { title: t("nav.downloads"), robots: { index: false, follow: false } };
}

export default async function DownloadsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireCustomer(locale);
  const t = await getTranslations("Account");
  const tp = await getTranslations("Portal");
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const { licenses } = await loadLicenses(user.id);
  const hasActive = licenses.some((l) => licenseState(l) === "active");
  const versions = hasActive ? await loadVersions() : [];

  return (
    <div className="flex flex-col gap-5">
      <PortalHeader title={tp("downloads.title")} intro={tp("downloads.intro")} />
      <Card>
        {!hasActive ? (
          <p className="text-sm text-brand-ink-dim">{licenses.length ? t("downloadsLocked") : t("empty")}</p>
        ) : versions.length === 0 ? (
          <p className="text-sm text-brand-ink-dim">{t("downloadsEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {versions.map((v) => {
              const notes = v.notesI18n?.[locale as "pt" | "en" | "es"] ?? v.notesI18n?.pt ?? v.notes;
              return (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-surface-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-brand-ink">
                      {PRODUCT.name} {v.version}
                      {v.isCurrent && (
                        <span className="ml-2 rounded-full bg-brand-accent px-2 py-0.5 text-[10px] font-bold text-brand-bg">{t("current")}</span>
                      )}
                    </p>
                    <p className="text-xs text-brand-ink-dim">
                      {date.format(v.createdAt)} · {v.fileName}
                    </p>
                    {notes && <p className="mt-1 whitespace-pre-line text-xs text-brand-ink-dim">{notes}</p>}
                  </div>
                  {(() => {
                    // Botão principal no idioma do cliente (o mesmo do site); os outros idiomas ficam como link.
                    const langs = v.langs.filter((l) => l in LANG_NAMES);
                    const main = langs.includes(locale) ? locale : langs.includes("en") ? "en" : (langs[0] ?? "");
                    const others = langs.filter((l) => l !== main);
                    return (
                      <div className="flex flex-col items-end gap-1.5">
                        <a
                          href={`/api/download/${v.id}${main ? `?lang=${main}` : ""}`}
                          className="btn-glow rounded-full bg-brand-accent px-4 py-2 text-xs font-semibold text-brand-bg hover:brightness-110"
                        >
                          {t("download")}
                          {main ? ` · ${LANG_NAMES[main]}` : ""} ↓
                        </a>
                        {others.length > 0 && (
                          <p className="text-[11px] text-brand-ink-dim">
                            {tp("downloads.otherLangs")}{" "}
                            {others.map((l, i) => (
                              <span key={l}>
                                {i > 0 && " · "}
                                <a href={`/api/download/${v.id}?lang=${l}`} className="font-semibold text-brand-accent hover:underline">
                                  {LANG_NAMES[l]}
                                </a>
                              </span>
                            ))}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      {hasActive && (
        <p className="text-sm text-brand-ink-dim">
          {tp("downloads.next")}{" "}
          <NextLink href={`/${locale}/account/guide`} className="font-semibold text-brand-accent hover:underline">
            {tp("nav.guide")} →
          </NextLink>
        </p>
      )}
    </div>
  );
}
