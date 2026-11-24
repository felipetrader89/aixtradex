import NextLink from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PortalHeader } from "@/components/portal/ui";
import { RobotSettingsForm } from "@/components/portal/RobotSettingsForm";
import { requireCustomer } from "@/lib/portal";
import { canConfigure } from "@/lib/robot-access";
import { PRODUCT } from "@/lib/plans";
import { GOAL_OPTIONS, LOSS_OPTIONS, MAX_POSITIONS, RISK_PROFILES, ROBOT_SYMBOLS, getRobotConfig } from "@/lib/robot-settings";

type Props = { params: Promise<{ locale: string; login: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Portal" });
  return { title: t("robot.configure"), robots: { index: false, follow: false } };
}

// Configuração do robô numa conta MT4 (pares, risco, metas, recuperação, notícias, horário).
export default async function RobotSettingsPage({ params }: Props) {
  const { locale, login } = await params;
  setRequestLocale(locale);
  await requireCustomer(locale);
  const user = await canConfigure(login);
  if (!user) notFound();
  const t = await getTranslations("Portal.robot");
  const config = await getRobotConfig(PRODUCT.slug, login);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="flex flex-col gap-5">
      <PortalHeader title={t("title", { login })} intro={t("intro")}>
        <NextLink href={`/${locale}/account/accounts`} className="text-sm font-semibold text-brand-accent hover:underline">
          ← {t("back")}
        </NextLink>
      </PortalHeader>
      {config.updatedAt && <p className="-mt-3 text-xs text-brand-ink-dim">{t("updated", { date: date.format(config.updatedAt) })}</p>}
      <RobotSettingsForm
        login={login}
        initial={{
          symbols: config.symbols,
          riskProfile: config.riskProfile,
          riskPct: config.riskPct,
          dailyGoalPct: config.dailyGoalPct,
          dailyLossPct: config.dailyLossPct,
          recovery: config.recovery,
          recoveryLevels: config.recoveryLevels,
          newsFilter: config.newsFilter,
          maxPositions: config.maxPositions,
          startHour: config.startHour,
          endHour: config.endHour,
        }}
        symbols={[...ROBOT_SYMBOLS]}
        profiles={RISK_PROFILES}
        goalOptions={[...GOAL_OPTIONS]}
        lossOptions={[...LOSS_OPTIONS]}
        maxPositions={MAX_POSITIONS}
        allowCustom={user.isAdmin}
      />
    </div>
  );
}
