import NextLink from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PortalHeader } from "@/components/portal/ui";
import { IntelPanel } from "@/components/intel/IntelPanel";
import { MesaPanel } from "@/components/intel/MesaPanel";
import { RobotTabs } from "@/components/intel/RobotTabs";
import { requireCustomer } from "@/lib/portal";
import { canConfigure } from "@/lib/robot-access";
import { getRobotPolicy } from "@/lib/robot-settings";

type Props = { params: Promise<{ locale: string; login: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Portal.intel" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

// Ai X Intelligence de uma conta MT4: resultados do robô, leitura das velas no terminal e sugestões.
export default async function IntelligencePage({ params }: Props) {
  const { locale, login } = await params;
  setRequestLocale(locale);
  await requireCustomer(locale);
  const user = await canConfigure(login);
  if (!user) notFound();
  const [t, tr] = await Promise.all([getTranslations("Portal.intel"), getTranslations("Portal.robot")]);
  const base = `/${locale}/account/accounts/${login}`;
  return (
    <div className="flex flex-col gap-5">
      <PortalHeader title={`${t("title")} · ${login}`} intro={t("intro")}>
        <NextLink href={`/${locale}/account/accounts`} className="text-sm font-semibold text-brand-accent hover:underline">
          ← {tr("back")}
        </NextLink>
      </PortalHeader>
      <RobotTabs base={base} active="intel" labels={{ config: t("tabConfig"), intel: t("tabIntel") }} />
      <MesaPanel login={login} locale={locale} />
      <IntelPanel login={login} locale={locale} policy={user.isAdmin ? null : await getRobotPolicy()} />
    </div>
  );
}
