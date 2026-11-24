import { getTranslations, setRequestLocale } from "next-intl/server";
import { CopyButton } from "@/components/ui/CopyButton";
import { Card, PortalHeader } from "@/components/portal/ui";
import { requireCustomer } from "@/lib/portal";
import { licenseServerUrl, siteConfig } from "@/lib/site-config";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Portal" });
  return { title: t("nav.guide"), robots: { index: false, follow: false } };
}

export default async function GuidePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireCustomer(locale);
  const t = await getTranslations("Account");
  const tPay = await getTranslations("Payment");
  const steps = t.raw("guide.steps") as { title: string; body: string; url?: boolean }[];
  const statuses = t.raw("guide.statuses") as { code: string; meaning: string }[];
  const tips = t.raw("guide.tips") as string[];

  return (
    <div className="flex flex-col gap-5">
      <PortalHeader title={t("guide.title")} intro={t("guide.intro")} />
      <Card>
        <ol className="flex flex-col gap-5">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-accent text-xs font-bold text-brand-bg">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-brand-ink">{step.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-brand-ink-dim">{step.body}</p>
                {step.url && (
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-brand-bg px-3 py-2">
                    <code className="break-all font-mono text-sm text-brand-accent">{licenseServerUrl}</code>
                    <CopyButton value={licenseServerUrl} label={tPay("copy")} copiedLabel={tPay("copied")} />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-brand-accent">{t("guide.statusTitle")}</h2>
        <dl className="grid gap-3 md:grid-cols-2">
          {statuses.map((s) => (
            <div key={s.code} className="rounded-xl bg-brand-surface-2 p-3">
              <dt className="break-all font-mono text-xs font-semibold text-brand-accent">{s.code}</dt>
              <dd className="mt-1 text-xs leading-relaxed text-brand-ink-dim">{s.meaning}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-accent">{t("guide.tipsTitle")}</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-brand-ink-dim">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
        <p className="mt-5 text-sm text-brand-ink-dim">
          {t("guide.help")}:{" "}
          <a href={siteConfig.telegramDmUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-accent hover:underline">
            @AlessonFelipe89
          </a>
        </p>
      </Card>
    </div>
  );
}
