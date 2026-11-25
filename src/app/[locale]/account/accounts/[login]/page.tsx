import NextLink from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PortalHeader } from "@/components/portal/ui";
import { RobotSettingsForm } from "@/components/portal/RobotSettingsForm";
import { RobotTabs } from "@/components/intel/RobotTabs";
import { requireCustomer } from "@/lib/portal";
import { canConfigure } from "@/lib/robot-access";
import { PRODUCT } from "@/lib/plans";
import { ROBOT_SYMBOLS, getRobotConfig, getRobotPolicy } from "@/lib/robot-settings";
import { enforcePolicy, policyPair } from "@/lib/robot-options";
import { getBrokerSymbols } from "@/lib/broker-symbols";

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
  const [t, ti] = await Promise.all([getTranslations("Portal.robot"), getTranslations("Portal.intel")]);
  const [config, policy, broker] = await Promise.all([getRobotConfig(PRODUCT.slug, login), getRobotPolicy(), getBrokerSymbols(PRODUCT.slug, login)]);
  const { updatedAt, admin: savedByAdmin, ...values } = config;
  // Cliente sempre vê só o que o admin liberou (mesmo numa conta que um admin salvou); admin vê tudo.
  const formValues = user.isAdmin || !savedByAdmin ? values : enforcePolicy(values, policy);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="flex flex-col gap-5">
      <PortalHeader title={t("title", { login })} intro={t("intro")}>
        <NextLink href={`/${locale}/account/accounts`} className="text-sm font-semibold text-brand-accent hover:underline">
          ← {t("back")}
        </NextLink>
      </PortalHeader>
      <RobotTabs base={`/${locale}/account/accounts/${login}`} active="config" labels={{ config: ti("tabConfig"), intel: ti("tabIntel") }} />
      {updatedAt && <p className="-mt-2 text-xs text-brand-ink-dim">{t("updated", { date: date.format(updatedAt) })}</p>}
      {user.isAdmin && <p className="-mt-2 text-xs text-amber-300">{t("adminNote")}</p>}
      <RobotSettingsForm
        login={login}
        initial={formValues}
        symbols={[...ROBOT_SYMBOLS]}
        policy={user.isAdmin ? null : policy}
        defaultPair={policyPair(policy)}
        allowCustom={user.isAdmin}
        broker={
          broker
            ? {
                company: broker.company,
                updatedAt: broker.updatedAt.toISOString(),
                items: broker.symbols.map((b) => ({ k: b.k, d: b.d, c: b.c, p: b.p })),
              }
            : null
        }
      />
    </div>
  );
}
