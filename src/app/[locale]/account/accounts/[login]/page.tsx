import NextLink from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PortalHeader } from "@/components/portal/ui";
import { RobotSettingsForm } from "@/components/portal/RobotSettingsForm";
import { requireCustomer } from "@/lib/portal";
import { canConfigure } from "@/lib/robot-access";
import { PRODUCT } from "@/lib/plans";
import { ROBOT_SYMBOLS, getRobotAdminSettings, getRobotConfig } from "@/lib/robot-settings";

type Props = { params: Promise<{ locale: string; login: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Portal" });
  return { title: t("robot.configure"), robots: { index: false, follow: false } };
}

// Configuração do robô numa conta MT4: geral da conta (pares, operações, rebaixamento, metas, horário, dias, notícias) + cada par.
export default async function RobotSettingsPage({ params }: Props) {
  const { locale, login } = await params;
  setRequestLocale(locale);
  await requireCustomer(locale);
  const user = await canConfigure(login);
  if (!user) notFound();
  const t = await getTranslations("Portal.robot");
  const [config, admin] = await Promise.all([getRobotConfig(PRODUCT.slug, login), getRobotAdminSettings()]);
  const { updatedAt, ...formValues } = config;
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="flex flex-col gap-5">
      <PortalHeader title={t("title", { login })} intro={t("intro")}>
        <NextLink href={`/${locale}/account/accounts`} className="text-sm font-semibold text-brand-accent hover:underline">
          ← {t("back")}
        </NextLink>
      </PortalHeader>
      {updatedAt && <p className="-mt-3 text-xs text-brand-ink-dim">{t("updated", { date: date.format(updatedAt) })}</p>}
      <RobotSettingsForm
        login={login}
        initial={formValues}
        symbols={[...ROBOT_SYMBOLS]}
        ddCap={admin.ddCap}
        allowCustom={user.isAdmin}
      />
    </div>
  );
}
