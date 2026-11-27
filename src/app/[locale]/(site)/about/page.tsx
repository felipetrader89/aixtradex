import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { TelegramCta } from "@/components/sections/TelegramCta";
import { PageHeader } from "@/components/sections/PageHeader";
import { GlowCard } from "@/components/brand/GlowCard";
import { siteConfig } from "@/lib/site-config";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, href: "/about", namespace: "Metadata.about" });
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("About");
  const story = t.raw("story") as string[];
  const facts = t.raw("facts") as { value: string; label: string }[];
  const values = t.raw("values.items") as { title: string; body: string }[];

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />

      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
        <dl className="mb-14 grid grid-cols-3 gap-3 sm:gap-4">
          {facts.map((fact) => (
            <div
              key={fact.label}
              className="glow-border flex flex-col-reverse items-center rounded-2xl bg-brand-surface px-2 py-5 text-center"
            >
              <dt className="mt-1 text-[11px] leading-snug text-brand-ink-dim sm:text-xs">{fact.label}</dt>
              <dd className="font-display text-2xl font-extrabold text-chrome sm:text-3xl">{fact.value}</dd>
            </div>
          ))}
        </dl>

        <section className="mb-14">
          <h2 className="mb-6 font-display text-xl font-bold uppercase text-chrome">{t("storyTitle")}</h2>
          <div className="space-y-5 border-l border-brand-hairline pl-5 sm:pl-7">
            {story.map((paragraph, i) => (
              <p key={i} className="leading-relaxed text-brand-ink">
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        <section className="mb-14">
          <h2 className="mb-6 font-display text-xl font-bold uppercase text-chrome">{t("values.title")}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {values.map((v) => (
              <GlowCard key={v.title} className="!p-5">
                <h3 className="text-base font-bold text-brand-accent">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-ink-dim">{v.body}</p>
              </GlowCard>
            ))}
          </div>
        </section>

        <section className="mb-14">
          <h2 className="mb-3 font-display text-xl font-bold uppercase text-chrome">{t("brokers.title")}</h2>
          <p className="mb-5 text-brand-ink-dim">{t("brokers.body")}</p>
          <div className="flex flex-wrap gap-3">
            {siteConfig.brokers.map((broker) => (
              <span
                key={broker}
                className="cursor-default rounded-full border border-brand-accent/40 bg-brand-accent/5 px-4 py-2 text-sm font-semibold text-brand-accent"
              >
                {broker}
              </span>
            ))}
            <span className="cursor-default rounded-full border border-dashed border-brand-hairline px-4 py-2 text-sm font-semibold text-brand-ink-dim">
              {t("brokers.comingSoon")}
            </span>
          </div>
        </section>

        <TelegramCta
          title={t("closing.title")}
          body={t("closing.body")}
          cta={t("cta")}
          href={siteConfig.telegramDmUrl}
        />
      </div>
    </>
  );
}
