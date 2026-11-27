import type { Metadata } from "next";
import NextLink from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { loadAccountsWithStats, requireCustomer } from "@/lib/portal";
import { PRODUCT } from "@/lib/plans";
import { getRobotConfig, getRobotPolicy } from "@/lib/robot-settings";
import { getBrokerSymbols } from "@/lib/broker-symbols";
import { robotLevel, scansFor } from "@/lib/intelligence";
import { getPlan, planAnalyses, planScanFinished, PROFILE_RISK } from "@/lib/plan";
import { PCT_OPTIONS, RISK_PROFILES, ROBOT_SYMBOLS, hasValue, isStandardSymbol } from "@/lib/robot-options";
import { Card, PortalHeader } from "@/components/portal/ui";
import { PlanWizard, type WizardPlan } from "@/components/plan/PlanWizard";
import type { PlanProfile } from "@/lib/plan-math";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ login?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Plan" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

// Assistente "Comece em 5 passos" (src/lib/plan.ts).
export default async function StartPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireCustomer(locale);
  const t = await getTranslations("Plan");
  const base = `/${locale}/account`;
  const { rows } = await loadAccountsWithStats(user.id);
  const sp = await searchParams;

  if (!rows.length) {
    return (
      <div className="flex flex-col gap-6">
        <PortalHeader title={t("title")} intro={t("intro")} />
        <Card className="text-center">
          <p className="text-sm text-brand-ink-dim">{t("noAccount")}</p>
          <NextLink href={`${base}/licenses`} className="mt-4 inline-block text-sm font-semibold text-brand-accent hover:underline">
            {t("noAccountCta")} →
          </NextLink>
        </Card>
      </div>
    );
  }

  const login = rows.some((r) => r.account.login === sp.login) ? sp.login! : rows[0].account.login;
  const product = PRODUCT.slug;
  let plan = await getPlan(product, login);
  if (plan?.status === "analyzing") {
    await scansFor(product, login, 1); // vence leituras paradas (robô desligado)
    await planScanFinished(product, login);
    plan = await getPlan(product, login);
  }
  const [config, broker, analyses, policy] = await Promise.all([
    getRobotConfig(product, login),
    getBrokerSymbols(product, login),
    plan ? planAnalyses(product, login, plan) : Promise.resolve([]),
    user.isAdmin ? Promise.resolve(null) : getRobotPolicy(),
  ]);

  const allowed = (k: "dailyGoalPct" | "dailyLossPct" | "goalPct") => (PCT_OPTIONS as readonly number[]).filter((v) => (v > 0 || k === "dailyLossPct") && (!policy || hasValue(policy[k].allow, v))); // perda: 0 = Desativado
  const have = broker ? new Set(broker.symbols.map((s) => s.k)) : null;
  const canSym = (s: string) => !policy || (isStandardSymbol(s) ? hasValue(policy.symbols.allow, s) : hasValue(policy.symbols.allow, "*"));
  const symbols = [
    ...ROBOT_SYMBOLS.filter((s) => (!have || have.has(s)) && canSym(s)).map((key) => ({ key, std: true })),
    ...(broker?.symbols ?? [])
      .map((s) => s.k)
      .filter((k) => !isStandardSymbol(k) && canSym(k))
      .sort()
      .map((key) => ({ key, std: false })),
  ];
  // só os perfis que o admin libera pro cliente (2026-11-27: Agressivo fora até ser testado)
  const profileRisk = Object.fromEntries(
    Object.entries(PROFILE_RISK)
      .filter(([, r]) => !policy || hasValue(policy.riskProfile.allow, r!))
      .map(([p, r]) => [p, RISK_PROFILES[r!]])
  );

  const wizardPlan: WizardPlan | null = plan
    ? {
        mode: plan.mode,
        profile: plan.profile as PlanProfile,
        goalPct: Number(plan.goalPct),
        lossPct: Number(plan.lossPct),
        pairGoals: plan.pairGoals as Record<string, number>,
        useAi: plan.useAi as string[],
        status: plan.status,
        summary: (plan.summary as WizardPlan["summary"]) ?? null,
        activatedAt: plan.activatedAt?.toISOString() ?? null,
      }
    : null;

  return (
    <div className="flex flex-col gap-6">
      <PortalHeader title={t("title")} intro={t("intro")} />
      <Card>
        <PlanWizard
          login={login}
          accounts={rows.map((r) => ({ login: r.account.login, state: r.state, company: r.stats?.company ?? null, level: robotLevel(product, r.account.login) }))}
          plan={wizardPlan}
          analyses={analyses}
          goalOptions={allowed("dailyGoalPct")}
          lossOptions={allowed("dailyLossPct")}
          pairGoalOptions={allowed("goalPct")}
          symbols={symbols}
          enabled={config.symbols.filter(canSym)}
          pairRisk={Object.fromEntries(Object.entries(config.pairs).map(([s, p]) => [s, p.riskPct]))}
          profileRisk={profileRisk}
          days={config.days}
          links={{
            config: `${base}/accounts/${login}`,
            downloads: `${base}/downloads`,
            guide: `${base}/guide`,
            start: `${base}/start`,
            home: base,
          }}
        />
      </Card>
    </div>
  );
}
