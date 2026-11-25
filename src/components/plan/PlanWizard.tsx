"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { activatePlanAction, analyzePlanAction, resetPlanAction, applyPlanDefaultsAction } from "@/app/actions/plan";
import { symbolLabel } from "@/lib/robot-options";
import {
  PLAN_MAX_PAIRS,
  PLAN_MIN_DAYS,
  PLAN_PROFILES,
  PLAN_TARGET_RATE,
  autoCandidates,
  evaluateAuto,
  evaluatePlan,
  suggestGoal,
  suggestPairGoal,
  type PairAnalysis,
  type PlanEval,
  type PlanProfile,
} from "@/lib/plan-math";
import type { AccountLiveState } from "@/lib/account-stats";

export type WizardPlan = {
  mode: "auto" | "manual";
  profile: PlanProfile;
  goalPct: number;
  lossPct: number;
  pairGoals: Record<string, number>;
  useAi: string[];
  status: "draft" | "analyzing" | "ready" | "active";
  summary: { at: string; pairs: { symbol: string; goal: number }[]; added: string[]; removed: string[]; note?: string } | null;
  activatedAt: string | null;
};

type Props = {
  login: string;
  accounts: { login: string; state: AccountLiveState; company: string | null; level: number | null }[];
  plan: WizardPlan | null;
  analyses: PairAnalysis[];
  goalOptions: number[];
  lossOptions: number[];
  pairGoalOptions: number[];
  symbols: { key: string; std: boolean }[];
  enabled: string[];
  pairRisk: Record<string, number>;
  profileRisk: Record<string, number>;
  days: number[];
  links: { config: string; downloads: string; guide: string; start: string };
};

const chip = (on: boolean) =>
  `rounded-xl border px-3 py-2 text-sm font-semibold transition ${
    on ? "border-brand-accent bg-brand-accent/15 text-brand-accent" : "border-brand-hairline bg-brand-surface-2 text-brand-ink-dim hover:text-brand-ink"
  }`;
const btn = "rounded-xl bg-brand-accent px-5 py-2.5 text-sm font-bold text-brand-bg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40";
const btnGhost = "rounded-xl border border-brand-hairline px-4 py-2.5 text-sm font-semibold text-brand-ink-dim transition hover:text-brand-ink";
const select = "rounded-lg border border-brand-hairline bg-brand-surface-2 px-2.5 py-1.5 font-mono text-sm text-brand-ink";
const box = "rounded-2xl border border-brand-hairline bg-brand-surface-2/60 p-4";

const total = (o: Record<string, number>) => Math.round(Object.values(o).reduce((s, v) => s + v, 0) * 100) / 100;

export function PlanWizard(props: Props) {
  const { login, accounts, plan, analyses } = props;
  const t = useTranslations("Plan");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const startStep = plan?.status === "analyzing" ? 4 : plan?.status === "ready" || plan?.status === "active" ? 5 : 1;
  const [step, setStep] = useState(startStep);
  const shown = plan?.status === "ready" && step === 4 ? 5 : step; // leitura terminou enquanto o cliente olhava o passo 4
  const [mode, setMode] = useState<"auto" | "manual">(plan?.mode ?? "auto");
  const [profile, setProfile] = useState<PlanProfile>(plan?.profile ?? "moderate");
  const [goal, setGoal] = useState(plan?.goalPct ?? PLAN_PROFILES.moderate.goal);
  const [loss, setLoss] = useState(plan?.lossPct ?? PLAN_PROFILES.moderate.loss);
  const [pairGoals, setPairGoals] = useState<Record<string, number>>(plan?.mode === "manual" ? plan.pairGoals : {});
  const [params, setParams] = useState<"keep" | "default">("keep");

  useEffect(() => {
    if (plan?.status !== "analyzing") return;
    const id = setInterval(() => router.refresh(), 6000);
    return () => clearInterval(id);
  }, [plan?.status, router]);

  const account = accounts.find((a) => a.login === login);
  const oldRobot = account?.level != null && account.level < 3; // robô conectado, mas anterior à v7.4
  const robotOk = (account?.state === "running" || account?.state === "autotradingOff") && !oldRobot;
  const sumPairs = total(pairGoals);
  const manualOk = Object.keys(pairGoals).length > 0 && Math.abs(sumPairs - goal) < 1e-6;
  const steps = [t("steps.account"), t("steps.mode"), t("steps.goal"), mode === "manual" ? t("steps.params") : t("steps.analyze"), t("steps.review")];

  const fail = (code: string) => setError(t.has(`errors.${code}`) ? t(`errors.${code}`) : t("errors.generic"));

  function pickProfile(p: PlanProfile) {
    setProfile(p);
    if (p !== "custom") {
      setGoal(PLAN_PROFILES[p].goal);
      setLoss(PLAN_PROFILES[p].loss);
    }
  }

  function analyze() {
    setError(null);
    start(async () => {
      if (mode === "manual" && params === "default") {
        const d = await applyPlanDefaultsAction(login, Object.keys(pairGoals));
        if (!d.ok) return fail(d.error);
      }
      const r = await analyzePlanAction(login, { mode, profile, goalPct: goal, lossPct: loss, pairGoals: mode === "manual" ? pairGoals : {} });
      if (!r.ok) return fail(r.error);
      setStep(4);
      router.refresh();
    });
  }

  function restart() {
    setError(null);
    start(async () => {
      const r = await resetPlanAction(login);
      if (!r.ok) return fail(r.error);
      setStep(1);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* barra dos passos */}
      <ol className="grid grid-cols-5 gap-1.5">
        {steps.map((label, i) => {
          const n = i + 1;
          const state = n < shown ? "done" : n === shown ? "now" : "next";
          return (
            <li key={label} className="flex flex-col gap-1.5">
              <span className={`h-1.5 rounded-full ${state === "next" ? "bg-brand-hairline" : "bg-brand-accent"} ${state === "now" ? "animate-pulse" : ""}`} />
              <span className={`text-[11px] leading-tight ${state === "now" ? "font-bold text-brand-ink" : "text-brand-ink-dim"}`}>
                <span className="font-mono">{n}.</span> <span className="hidden sm:inline">{label}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="-mt-2 text-sm font-semibold text-brand-ink sm:hidden">
        {shown}. {steps[shown - 1]}
      </p>

      {error && <p className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

      {shown === 1 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-extrabold text-chrome">{t("account.title")}</h2>
          {accounts.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {accounts.map((a) => (
                <a key={a.login} href={`${props.links.start}?login=${a.login}`} className={chip(a.login === login)}>
                  <span className="font-mono">{a.login}</span>
                  {a.company ? <span className="ml-1.5 text-[11px] font-normal opacity-70">{a.company}</span> : null}
                </a>
              ))}
            </div>
          )}
          <div className={box}>
            {oldRobot && (
              <p className="mb-2 text-sm text-amber-300">
                ⚠ {t("account.oldRobot")}{" "}
                <a href={props.links.downloads} className="font-semibold text-brand-accent hover:underline">
                  {t("account.downloads")} →
                </a>
              </p>
            )}
            {account?.state === "running" && !oldRobot && <p className="text-sm text-brand-accent">✓ {t("account.running")}</p>}
            {account?.state === "autotradingOff" && <p className="text-sm text-amber-300">⚠ {t("account.autotradingOff")}</p>}
            {!robotOk && !oldRobot && (
              <div className="flex flex-col gap-3 text-sm text-brand-ink">
                <p className="text-amber-300">⚠ {t("account.offline")}</p>
                <ol className="ml-5 list-decimal space-y-1 text-brand-ink-dim">
                  <li>
                    {t("account.how1")}{" "}
                    <a href={props.links.downloads} className="font-semibold text-brand-accent hover:underline">
                      {t("account.downloads")} →
                    </a>
                  </li>
                  <li>{t("account.how2")}</li>
                  <li>
                    {t("account.how3")}{" "}
                    <a href={props.links.guide} className="font-semibold text-brand-accent hover:underline">
                      {t("account.guide")} →
                    </a>
                  </li>
                </ol>
                <button type="button" onClick={() => router.refresh()} className={`${btnGhost} self-start`}>
                  ↻ {t("account.check")}
                </button>
              </div>
            )}
            <p className="mt-3 text-xs text-brand-ink-dim">{t("account.version")}</p>
          </div>
          <div className="flex justify-end">
            <button type="button" className={btn} disabled={!robotOk} onClick={() => setStep(2)}>
              {t("next")} →
            </button>
          </div>
        </section>
      )}

      {shown === 2 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-extrabold text-chrome">{t("mode.title")}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {(["auto", "manual"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-2xl border p-5 text-left transition ${mode === m ? "border-brand-accent bg-brand-accent/10" : "border-brand-hairline bg-brand-surface-2/60 hover:border-brand-ink-dim"}`}
              >
                <p className="flex items-center justify-between gap-2 font-display text-lg font-extrabold text-brand-ink">
                  {t(`mode.${m}`)}
                  {m === "auto" && <span className="rounded-full bg-brand-accent/15 px-2 py-0.5 text-[11px] font-bold text-brand-accent">{t("mode.recommended")}</span>}
                </p>
                <p className="mt-2 text-sm text-brand-ink-dim">{t(`mode.${m}Text`)}</p>
              </button>
            ))}
          </div>
          <Nav back={() => setStep(1)} next={() => setStep(3)} label={t("next")} backLabel={t("back")} />
        </section>
      )}

      {shown === 3 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-extrabold text-chrome">{t("goal.title")}</h2>
          <div className="grid gap-2 sm:grid-cols-4">
            {(["conservative", "moderate", "aggressive", "custom"] as const).map((p) => (
              <button key={p} type="button" onClick={() => pickProfile(p)} className={`${chip(profile === p)} text-left`}>
                <span className="block">{t(`profiles.${p}`)}</span>
                <span className="mt-0.5 block text-[11px] font-normal opacity-80">
                  {p === "custom"
                    ? t("profiles.customHint")
                    : t("profiles.hint", { goal: PLAN_PROFILES[p].goal, loss: PLAN_PROFILES[p].loss, risk: props.profileRisk[p] })}
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-brand-ink">{t("goal.goal")}</span>
              <select className={select} value={goal} onChange={(e) => setGoal(Number(e.target.value))}>
                {props.goalOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}%
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-brand-ink">{t("goal.loss")}</span>
              <select className={select} value={loss} onChange={(e) => setLoss(Number(e.target.value))}>
                {props.lossOptions.map((v) => (
                  <option key={v} value={v}>
                    -{v}%
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs text-brand-ink-dim">{t("goal.explain")}</p>

          {mode === "manual" && (
            <ManualPairs
              symbols={props.symbols}
              enabled={props.enabled}
              options={props.pairGoalOptions}
              goal={goal}
              pairGoals={pairGoals}
              setPairGoals={setPairGoals}
            />
          )}
          <Nav back={() => setStep(2)} next={() => setStep(4)} label={t("next")} backLabel={t("back")} disabled={mode === "manual" && !manualOk} />
        </section>
      )}

      {shown === 4 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-extrabold text-chrome">{mode === "manual" ? t("params.title") : t("analyze.title")}</h2>
          {plan?.status === "analyzing" ? (
            <Progress analyses={analyses} />
          ) : (
            <>
              {mode === "manual" ? (
                <div className="flex flex-col gap-2">
                  {(["keep", "default"] as const).map((p) => (
                    <label key={p} className={`${box} flex cursor-pointer items-start gap-3`}>
                      <input type="radio" className="mt-1 accent-[var(--color-brand-accent)]" checked={params === p} onChange={() => setParams(p)} />
                      <span>
                        <span className="block text-sm font-semibold text-brand-ink">{t(`params.${p}`)}</span>
                        <span className="block text-xs text-brand-ink-dim">{t(`params.${p}Text`)}</span>
                      </span>
                    </label>
                  ))}
                  <a href={props.links.config} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-accent hover:underline">
                    ⚙ {t("params.open")} ↗
                  </a>
                </div>
              ) : (
                <p className="text-sm text-brand-ink-dim">{t("analyze.text")}</p>
              )}
              <p className="text-xs text-brand-ink-dim">{t("analyze.time")}</p>
              <Nav back={() => setStep(3)} next={analyze} label={pending ? t("analyze.sending") : t("analyze.start")} backLabel={t("back")} disabled={pending} />
            </>
          )}
        </section>
      )}

      {shown === 5 && plan && (plan.status === "ready" || plan.status === "active") && (
        <Review key={`${plan.status}-${plan.activatedAt}`} {...props} plan={plan} restart={restart} busy={pending} />
      )}
      {shown === 5 && (!plan || plan.status === "draft") && (
        <button type="button" className={btnGhost} onClick={() => setStep(1)}>
          ← {t("back")}
        </button>
      )}
    </div>
  );
}

function Nav({ back, next, label, backLabel, disabled }: { back: () => void; next: () => void; label: string; backLabel: string; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <button type="button" className={btnGhost} onClick={back}>
        ← {backLabel}
      </button>
      <button type="button" className={btn} onClick={next} disabled={disabled}>
        {label} →
      </button>
    </div>
  );
}

function ManualPairs({
  symbols,
  enabled,
  options,
  goal,
  pairGoals,
  setPairGoals,
}: {
  symbols: { key: string; std: boolean }[];
  enabled: string[];
  options: number[];
  goal: number;
  pairGoals: Record<string, number>;
  setPairGoals: (v: Record<string, number>) => void;
}) {
  const t = useTranslations("Plan");
  const [extra, setExtra] = useState("");
  const shown = [...new Set([...symbols.filter((s) => s.std).map((s) => s.key), ...enabled, ...Object.keys(pairGoals)])];
  const others = symbols.filter((s) => !shown.includes(s.key));
  const sum = total(pairGoals);
  const count = Object.keys(pairGoals).length;

  const toggle = (s: string) => {
    const next = { ...pairGoals };
    if (s in next) delete next[s];
    else if (count < PLAN_MAX_PAIRS) next[s] = options.includes(1) ? 1 : options[0];
    setPairGoals(next);
  };
  const split = () => {
    const keys = Object.keys(pairGoals);
    if (!keys.length) return;
    const units = Math.round(goal / 0.5);
    const base = Math.floor(units / keys.length);
    const next: Record<string, number> = {};
    keys.forEach((k, i) => (next[k] = Math.max(1, base + (i < units - base * keys.length ? 1 : 0)) * 0.5));
    setPairGoals(next);
  };

  return (
    <div className={`${box} flex flex-col gap-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-brand-ink">{t("goal.pairsTitle")}</p>
        <button type="button" className="text-xs font-semibold text-brand-accent hover:underline" onClick={split}>
          {t("goal.split")}
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {shown.map((s) => {
          const on = s in pairGoals;
          return (
            <div key={s} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${on ? "border-brand-accent/60 bg-brand-accent/5" : "border-brand-hairline"}`}>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-brand-ink">
                <input type="checkbox" checked={on} onChange={() => toggle(s)} className="accent-[var(--color-brand-accent)]" />
                {symbolLabel(s)}
              </label>
              {on && (
                <select className={select} value={pairGoals[s]} onChange={(e) => setPairGoals({ ...pairGoals, [s]: Number(e.target.value) })}>
                  {options.map((v) => (
                    <option key={v} value={v}>
                      {v}%
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </div>
      {others.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <select className={select} value={extra} onChange={(e) => setExtra(e.target.value)}>
            <option value="">{t("goal.addOther")}</option>
            {others.map((s) => (
              <option key={s.key} value={s.key}>
                {s.key}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={btnGhost}
            disabled={!extra || count >= PLAN_MAX_PAIRS}
            onClick={() => {
              if (!extra) return;
              setPairGoals({ ...pairGoals, [extra]: options.includes(1) ? 1 : options[0] });
              setExtra("");
            }}
          >
            + {t("goal.add")}
          </button>
        </div>
      )}
      <p className={`text-sm font-semibold ${Math.abs(sum - goal) < 1e-6 && count ? "text-brand-accent" : "text-amber-300"}`}>
        {t("goal.sum", { sum, goal })}
        {count > 0 && Math.abs(sum - goal) >= 1e-6 && (sum < goal ? ` · ${t("goal.missing", { v: Math.round((goal - sum) * 100) / 100 })}` : ` · ${t("goal.over", { v: Math.round((sum - goal) * 100) / 100 })}`)}
      </p>
    </div>
  );
}

function Progress({ analyses }: { analyses: PairAnalysis[] }) {
  const t = useTranslations("Plan");
  const done = analyses.filter((a) => a.status !== "pending" && a.status !== "running").length;
  return (
    <div className={`${box} flex flex-col gap-3`}>
      <p className="text-sm font-semibold text-brand-ink">{t("analyze.progress", { done, total: analyses.length })}</p>
      <div className="h-2 overflow-hidden rounded-full bg-brand-hairline">
        <div className="h-full bg-brand-accent transition-all" style={{ width: `${analyses.length ? (done / analyses.length) * 100 : 0}%` }} />
      </div>
      <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
        {analyses.map((a) => (
          <li key={a.symbol} className="flex items-center justify-between gap-2 rounded-lg bg-brand-surface/60 px-3 py-1.5">
            <span className="font-semibold text-brand-ink">{symbolLabel(a.symbol)}</span>
            <span className={a.status === "done" ? "text-brand-accent" : a.status === "running" ? "text-brand-ink" : a.status === "pending" ? "text-brand-ink-dim" : "text-red-300"}>
              {t(`analyze.status.${a.status}`)}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-brand-ink-dim">{t("analyze.wait")}</p>
    </div>
  );
}

function Review({ plan, analyses, pairRisk, profileRisk, days, pairGoalOptions, goalOptions, login, restart, busy }: Props & { plan: WizardPlan; restart: () => void; busy: boolean }) {
  const t = useTranslations("Plan");
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [goal, setGoal] = useState(plan.goalPct);
  const [custom, setCustom] = useState<Record<string, number> | null>(plan.mode === "auto" && plan.status === "active" ? plan.pairGoals : null);
  const [pg, setPg] = useState<Record<string, number>>(plan.pairGoals);
  const [useAi, setUseAi] = useState<string[]>(plan.useAi);
  const loss = plan.lossPct;
  const riskOf = (s: string) => profileRisk[plan.profile] ?? pairRisk[s] ?? 2;
  const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const pctTxt = (v: number, signed = false) => `${signed && v > 0 ? "+" : ""}${nf.format(v)}%`;
  const hasDaily = analyses.some((a) => a.daily);

  const cands = useMemo(() => autoCandidates(analyses, (s) => profileRisk[plan.profile] ?? pairRisk[s] ?? 2, days), [analyses, plan.profile, profileRisk, pairRisk, days]);
  const sug = useMemo(() => (plan.mode === "auto" ? suggestGoal(cands, loss, days) : null), [plan.mode, cands, loss, days]);

  let alloc: Record<string, number> = {};
  let ev: PlanEval | null = null;
  if (plan.mode === "auto") {
    if (custom) {
      alloc = custom;
      ev = evaluatePlan(
        cands.filter((c) => custom[c.symbol]).map((c) => ({ ...c, goal: custom[c.symbol] })),
        total(custom),
        loss,
        days
      );
    } else {
      const r = evaluateAuto(cands, goal, loss, days);
      alloc = r.alloc;
      ev = r.ev;
    }
  } else {
    alloc = pg;
    const sims = Object.entries(pg).flatMap(([s, g]) => {
      const a = analyses.find((x) => x.symbol === s);
      const ser = useAi.includes(s) ? a?.best : a?.cur;
      return ser ? [{ ...ser, risk: riskOf(s), goal: g }] : [];
    });
    ev = sims.length ? evaluatePlan(sims, total(pg), loss, days) : null;
  }
  const goalNow = total(alloc);
  const rate = ev && ev.days ? ev.hitDays / ev.days : 0;
  const tone = rate >= PLAN_TARGET_RATE ? "text-brand-accent" : rate >= 0.4 ? "text-amber-300" : "text-red-300";

  function activate() {
    setError(null);
    start(async () => {
      const r = await activatePlanAction(login, { pairGoals: alloc, useAi: plan.mode === "manual" ? useAi : [] });
      if (!r.ok) {
        setError(t.has(`errors.${r.error}`) ? t(`errors.${r.error}`) : t("errors.generic"));
        return;
      }
      router.refresh();
    });
  }

  const excluded = analyses.filter((a) => plan.mode === "auto" && !alloc[a.symbol]);
  const reason = (a: PairAnalysis) =>
    a.status !== "done" ? t(`analyze.status.${a.status}`) : !a.full ? t("review.why.noFull") : !a.daily ? t("review.why.noDaily") : a.days < PLAN_MIN_DAYS ? t("review.why.short", { days: a.days }) : !a.validated ? t("review.why.notValidated") : t("review.why.weak");

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-xl font-extrabold text-chrome">{plan.status === "active" ? t("review.activeTitle") : t("review.title")}</h2>
      {error && <p className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

      {plan.status === "active" && (
        <div className="rounded-2xl border border-brand-accent/40 bg-brand-accent/10 p-4 text-sm text-brand-ink">
          <p className="font-semibold text-brand-accent">✓ {t(plan.mode === "auto" ? "review.activeAuto" : "review.activeManual")}</p>
          {plan.summary?.note === "none" && <p className="mt-1 text-amber-300">{t("review.noneToday")}</p>}
          {plan.summary && (plan.summary.added.length > 0 || plan.summary.removed.length > 0) && (
            <p className="mt-1 text-xs text-brand-ink-dim">
              {plan.summary.added.length > 0 && t("review.added", { list: plan.summary.added.map(symbolLabel).join(", ") })}{" "}
              {plan.summary.removed.length > 0 && t("review.removed", { list: plan.summary.removed.map(symbolLabel).join(", ") })}
            </p>
          )}
        </div>
      )}

      {!hasDaily ? (
        <p className={`${box} text-sm text-amber-300`}>⚠ {t("review.needsV74")}</p>
      ) : !ev || !ev.days || (plan.mode === "auto" && !Object.keys(alloc).length) ? (
        <p className={`${box} text-sm text-amber-300`}>⚠ {t(plan.mode === "auto" ? "review.noPairs" : "review.noData")}</p>
      ) : (
        <div className={`${box} flex flex-col gap-3`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink-dim">{t("review.chanceTitle")}</p>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
            <p className={`font-display text-5xl font-extrabold ${tone}`}>{Math.round(rate * 100)}%</p>
            <p className="pb-1.5 text-sm text-brand-ink">{t("review.chance", { hit: ev.hitDays, days: ev.days, goal: nf.format(goalNow) })}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <Metric label={t("review.positive")} value={`${ev.positiveDays}/${ev.days}`} />
            <Metric label={t("review.lossDays")} value={`${ev.lossDays}/${ev.days}`} />
            <Metric label={t("review.avg")} value={pctTxt(ev.avgPct, true)} />
            <Metric label={t("review.worst")} value={pctTxt(ev.worstPct, true)} />
          </div>
          {plan.mode === "auto" && sug && Math.abs(sug.goal - goalNow) > 1e-6 && (
            <p className="text-sm text-brand-ink">
              💡 {t("review.suggest", { goal: nf.format(sug.goal), rate: Math.round(sug.rate * 100) })}{" "}
              <button
                type="button"
                className="font-semibold text-brand-accent hover:underline"
                onClick={() => {
                  setCustom(null);
                  setGoal(sug.goal);
                }}
              >
                {t("review.useSuggest")}
              </button>
            </p>
          )}
          {plan.mode === "auto" && !sug && <p className="text-sm text-amber-300">{t("review.noSuggest")}</p>}
          <p className="text-[11px] text-brand-ink-dim">{t("review.disclaimer")}</p>
        </div>
      )}

      {hasDaily && plan.mode === "auto" && Object.keys(alloc).length > 0 && ev && (
        <div className={`${box} flex flex-col gap-2`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-brand-ink">{t("review.pairsAuto")}</p>
            {custom ? (
              <button type="button" className="text-xs font-semibold text-brand-accent hover:underline" onClick={() => setCustom(null)}>
                {t("review.autoSplit")}
              </button>
            ) : (
              <button type="button" className="text-xs font-semibold text-brand-accent hover:underline" onClick={() => setCustom({ ...alloc })}>
                {t("review.adjust")}
              </button>
            )}
          </div>
          <ul className="flex flex-col gap-1.5">
            {ev.pairs.map((p) => (
              <li key={p.symbol} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-brand-surface/60 px-3 py-2 text-sm">
                <span className="font-semibold text-brand-ink">{symbolLabel(p.symbol)}</span>
                <span className="text-xs text-brand-ink-dim">{t("review.pairHit", { hit: p.hitDays, days: p.days })}</span>
                {custom ? (
                  <span className="flex items-center gap-1.5">
                    <select className={select} value={custom[p.symbol]} onChange={(e) => setCustom({ ...custom, [p.symbol]: Number(e.target.value) })}>
                      {pairGoalOptions.map((v) => (
                        <option key={v} value={v}>
                          {v}%
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="text-xs text-red-300 hover:underline"
                      onClick={() => {
                        const next = { ...custom };
                        delete next[p.symbol];
                        setCustom(next);
                      }}
                    >
                      ✕
                    </button>
                  </span>
                ) : (
                  <span className="font-mono font-bold text-brand-accent">{nf.format(alloc[p.symbol])}%</span>
                )}
              </li>
            ))}
          </ul>
          {!custom && (
            <label className="mt-1 flex items-center gap-2 text-sm text-brand-ink">
              {t("review.goalTotal")}
              <select className={select} value={goal} onChange={(e) => setGoal(Number(e.target.value))}>
                {goalOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}%
                  </option>
                ))}
              </select>
            </label>
          )}
          {excluded.length > 0 && (
            <p className="mt-1 text-xs text-brand-ink-dim">
              {t("review.excluded")}: {excluded.map((a) => `${symbolLabel(a.symbol)} (${reason(a)})`).join(" · ")}
            </p>
          )}
          {excluded.some((a) => a.daily && a.days < PLAN_MIN_DAYS) && <p className="text-xs text-amber-300">💡 {t("review.historyTip")}</p>}
        </div>
      )}

      {hasDaily && plan.mode === "manual" && (
        <div className={`${box} flex flex-col gap-2`}>
          <p className="text-sm font-semibold text-brand-ink">{t("review.pairsManual")}</p>
          <ul className="flex flex-col gap-2">
            {Object.keys(pg).map((s) => {
              const a = analyses.find((x) => x.symbol === s);
              const one = (ser: PairAnalysis["cur"]) => (ser ? evaluatePlan([{ ...ser, risk: riskOf(s), goal: pg[s] }], 0, 0, days).pairs[0] : null);
              const mine = one(a?.cur ?? null);
              const ai = a?.bestCfg ? one(a?.best ?? null) : null;
              const hint = a?.cur ? suggestPairGoal(useAi.includes(s) && a.best ? a.best : a.cur, riskOf(s), days) : null;
              const on = useAi.includes(s);
              return (
                <li key={s} className="flex flex-col gap-2 rounded-lg bg-brand-surface/60 px-3 py-2.5 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-brand-ink">{symbolLabel(s)}</span>
                    <select className={select} value={pg[s]} onChange={(e) => setPg({ ...pg, [s]: Number(e.target.value) })}>
                      {pairGoalOptions.map((v) => (
                        <option key={v} value={v}>
                          {v}%
                        </option>
                      ))}
                    </select>
                  </div>
                  {!a || a.status !== "done" ? (
                    <p className="text-xs text-red-300">{a ? t(`analyze.status.${a.status}`) : "-"}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={chip(!on)} onClick={() => setUseAi(useAi.filter((x) => x !== s))}>
                        {t("review.mine")} · {mine ? t("review.pairHit", { hit: mine.hitDays, days: mine.days }) : "-"}
                      </button>
                      {ai && (
                        <button type="button" className={chip(on)} onClick={() => setUseAi([...useAi.filter((x) => x !== s), s])}>
                          ✨ {t("review.ai")} · {t("review.pairHit", { hit: ai.hitDays, days: ai.days })}
                          {a.validated ? " ✓" : ""}
                        </button>
                      )}
                    </div>
                  )}
                  {a && a.daily && a.days < PLAN_MIN_DAYS && <p className="text-[11px] text-amber-300">⚠ {t("review.why.short", { days: a.days })} · {t("review.historyTip")}</p>}
                  {hint != null && hint !== pg[s] && <p className="text-[11px] text-brand-ink-dim">💡 {t("review.pairSuggest", { goal: nf.format(hint) })}</p>}
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-brand-ink-dim">{t("review.manualTotal", { goal: nf.format(goalNow) })}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className={btnGhost} onClick={restart} disabled={busy || pending}>
          ↺ {t("review.restart")}
        </button>
        <button type="button" className={btn} onClick={activate} disabled={pending || !hasDaily || !Object.keys(alloc).length || (!!ev && !ev.days)}>
          {pending ? t("review.activating") : plan.status === "active" ? t("review.update") : t("review.activate")}
        </button>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-brand-surface/60 p-2.5">
      <p className="text-[11px] text-brand-ink-dim">{label}</p>
      <p className="mt-0.5 font-mono font-bold text-brand-ink">{value}</p>
    </div>
  );
}
