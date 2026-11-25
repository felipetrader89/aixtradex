"use client";

import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { saveRobotSettingsAction } from "@/app/actions/robot";
import {
  ADX_LEVELS,
  MAX_POSITIONS,
  NEWS_MINUTES,
  PCT_OPTIONS,
  RISK_PROFILES,
  RSI_PERIODS,
  RSI_TIMEFRAMES,
  SYMBOL_LABEL,
  DD_OPTIONS,
  ADX_PERIODS,
  ATR_BARS,
  ATR_MAX_RATIOS,
  ATR_MIN_RATIOS,
  ATR_PERIODS,
  AUTO_PIPS,
  FILTER_TFS,
  TIMEFRAMES,
  paramDef,
  tfLabel,
  hasValue,
  policyMax,
  type PairParams,
  type ParamKey,
  type PolicyValue,
  type RiskProfile,
  type RobotConfig,
  type RobotPolicy,
} from "@/lib/robot-options";

export type RobotFormValues = Omit<RobotConfig, "updatedAt">;

const field =
  "w-full rounded-xl border border-brand-hairline bg-brand-surface-2 px-3 py-2 text-sm text-brand-ink focus:border-brand-accent focus:outline-none";
const card = "panel-card rounded-2xl border border-brand-hairline bg-brand-surface/90 p-5";
const h2 = "text-xs font-semibold uppercase tracking-wide text-brand-accent";

function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "bg-brand-accent" : "bg-brand-surface-2 ring-1 ring-brand-hairline"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">
        <Switch checked={checked} onChange={onChange} label={label} disabled={disabled} />
      </div>
      <div>
        <span className="block text-sm font-semibold text-brand-ink">{label}</span>
        {hint && <span className="block text-xs text-brand-ink-dim">{hint}</span>}
      </div>
    </div>
  );
}

// group = conteúdo é um grupo de botões (não um campo): vira <div role="group"> pra cada botão manter o próprio nome.
function Field({ label, children, hint, group }: { label: string; children: React.ReactNode; hint?: string; group?: boolean }) {
  const inner = (
    <>
      <span className="text-sm font-semibold text-brand-ink">{label}</span>
      {children}
      {hint && <span className="text-xs text-brand-ink-dim">{hint}</span>}
    </>
  );
  return group ? (
    <div role="group" aria-label={label} className="flex flex-col gap-1.5">
      {inner}
    </div>
  ) : (
    <label className="flex flex-col gap-1.5">{inner}</label>
  );
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              on ? "border-brand-accent bg-brand-accent/15 text-brand-accent" : "border-brand-hairline bg-brand-surface-2 text-brand-ink-dim hover:text-brand-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// v7: valor em pips (ou velas). Vazio/"Automático" = 0 quando o parâmetro aceita automático.
function NumberField({
  value,
  onChange,
  min,
  max,
  auto,
  autoLabel,
  unit,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  auto?: boolean;
  autoLabel: string;
  unit: string;
  label: string;
}) {
  const [text, setText] = useState(value === 0 && auto ? "" : String(value));
  const isAuto = !!auto && value === 0;
  return (
    <div className="flex items-center gap-2">
      {auto && (
        <button
          type="button"
          aria-pressed={isAuto}
          onClick={() => {
            if (isAuto) {
              const v = Math.min(max, Math.max(min, Number(text) || min));
              setText(String(v));
              onChange(v);
            } else {
              setText("");
              onChange(0);
            }
          }}
          className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
            isAuto ? "border-brand-accent bg-brand-accent/15 text-brand-accent" : "border-brand-hairline bg-brand-surface-2 text-brand-ink-dim hover:text-brand-ink"
          }`}
        >
          {autoLabel}
        </button>
      )}
      {!isAuto && (
        <input
          type="number"
          inputMode="numeric"
          aria-label={label}
          min={min}
          max={max}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const v = Number(e.target.value);
            if (e.target.value !== "" && Number.isFinite(v)) onChange(Math.min(max, Math.max(min, Math.round(v))));
          }}
          onBlur={() => setText(String(value))}
          className={`${field} w-28`}
        />
      )}
      <span className="text-xs text-brand-ink-dim">{unit}</span>
    </div>
  );
}

function TfChips({ value, options, onChange, minOne }: { value: number[]; options: number[]; onChange: (v: number[]) => void; minOne?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((tf) => {
        const on = value.includes(tf);
        return (
          <button
            key={tf}
            type="button"
            aria-pressed={on}
            onClick={() => {
              if (on && minOne && value.length === 1) return;
              onChange(on ? value.filter((x) => x !== tf) : options.filter((x) => x === tf || value.includes(x)));
            }}
            className={`min-w-12 rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
              on ? "border-brand-accent bg-brand-accent/15 text-brand-accent" : "border-brand-hairline bg-brand-surface-2 text-brand-ink-dim"
            }`}
          >
            {tfLabel(tf)}
          </button>
        );
      })}
    </div>
  );
}

export function RobotSettingsForm({
  login,
  initial,
  symbols: allSymbols,
  policy,
  defaultPair,
  allowCustom,
}: {
  login: string;
  initial: RobotFormValues;
  symbols: string[];
  policy: RobotPolicy | null; // null = admin (vê e escolhe tudo)
  defaultPair: PairParams;
  allowCustom: boolean;
}) {
  const t = useTranslations("Portal.robot");
  const locale = useLocale();
  const [v, setV] = useState<RobotFormValues>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [editing, setEditing] = useState<string>(initial.symbols[0] ?? allSymbols[0]);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(v) !== saved;

  // Permissões do admin: o que aparece e quais opções o cliente pode escolher.
  const show = (k: ParamKey) => !policy || policy[k].show;
  const allowed = <T extends PolicyValue>(k: ParamKey, list: readonly T[]): T[] =>
    policy ? list.filter((o) => hasValue(policy[k].allow, o)) : [...list];
  const locked = (k: ParamKey) => !!policy && policy[k].allow.length < 2; // só uma opção liberada: aparece, mas não muda
  const anyShown = (...keys: ParamKey[]) => keys.some(show);
  // Faixa que o admin liberou (pips, velas).
  const lim = (k: ParamKey) => {
    const r = paramDef(k).range!;
    return policy ? { min: Number(policy[k].allow[0]), max: Number(policy[k].allow[1]), auto: r.auto } : { min: r.min, max: r.max, auto: r.auto };
  };
  const symbols = show("symbols")
    ? allSymbols.filter((s) => allowed("symbols", allSymbols).includes(s) || initial.symbols.includes(s))
    : initial.symbols;

  const set = <K extends keyof RobotFormValues>(k: K, value: RobotFormValues[K]) => {
    setV((old) => ({ ...old, [k]: value }));
    setStatus(null);
  };
  const setPair = (sym: string, patch: Partial<PairParams>) => {
    setV((old) => ({ ...old, pairs: { ...old.pairs, [sym]: { ...old.pairs[sym], ...patch } } }));
    setStatus(null);
  };
  const toggleSymbol = (s: string, on: boolean) =>
    set("symbols", on ? symbols.filter((x) => x === s || v.symbols.includes(x)) : v.symbols.filter((x) => x !== s));

  const pct = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 2 });
  const pctLabel = (o: number) => (o === 0 ? t("off") : `${pct(o)}%`);
  const profileList: RiskProfile[] = [
    ...allowed("riskProfile", ["conservative", "moderate", "aggressive"] as RiskProfile[]),
    ...(allowCustom ? (["custom"] as RiskProfile[]) : []),
  ];
  const riskOf = (p: PairParams) => (p.riskProfile === "custom" ? p.riskPct : RISK_PROFILES[p.riskProfile]);
  const ddCap = policy ? policyMax(policy.ddPct) : 100;
  const ddOptions = useMemo(() => {
    const list: number[] = policy ? DD_OPTIONS.filter((o) => hasValue(policy.ddPct.allow, o)) : [...DD_OPTIONS];
    if (!list.includes(v.ddPct)) list.push(v.ddPct);
    return list.sort((a, b) => a - b);
  }, [policy, v.ddPct]);

  const p = v.pairs[editing] ?? defaultPair;
  const editingOn = v.symbols.includes(editing);

  function save() {
    start(async () => {
      const result = await saveRobotSettingsAction(login, v);
      if (result.ok) {
        setSaved(JSON.stringify(v));
        setStatus({ ok: true, text: t("saved") });
      } else setStatus({ ok: false, text: t(`errors.${result.error}`) });
    });
  }

  function copyToAll() {
    setV((old) => ({ ...old, pairs: Object.fromEntries(symbols.map((s) => [s, { ...old.pairs[editing] }])) }));
    setStatus({ ok: true, text: t("copied", { pair: SYMBOL_LABEL[editing] ?? editing }) });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ===== PARES ===== */}
      <section className={card}>
        <h2 className={h2}>{t("symbols")}</h2>
        <p className="mt-1 text-xs text-brand-ink-dim">{t("symbolsHint")}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {symbols.map((s) => {
            const on = v.symbols.includes(s);
            const sel = s === editing;
            const sp = v.pairs[s] ?? defaultPair;
            return (
              <div
                key={s}
                className={`flex items-stretch overflow-hidden rounded-xl border transition ${
                  sel
                    ? "border-brand-accent shadow-[0_0_14px_rgba(51,214,160,0.25)]"
                    : on
                      ? "border-brand-accent/50"
                      : "border-brand-hairline"
                } ${on ? "bg-brand-accent/10" : "bg-brand-surface-2"}`}
              >
                <button
                  type="button"
                  onClick={() => setEditing(s)}
                  aria-pressed={sel}
                  className="flex min-w-0 flex-1 flex-col items-start px-3 py-2.5 text-left"
                >
                  <span className={`text-sm font-bold ${on ? "text-brand-accent" : "text-brand-ink-dim"}`}>{SYMBOL_LABEL[s] ?? s}</span>
                  <span className="truncate text-[11px] text-brand-ink-dim">
                    {on ? t("pairSummary", { risk: pct(riskOf(sp)), goal: sp.goalPct ? `${pct(sp.goalPct)}%` : "-" }) : t("pairOff")}
                  </span>
                </button>
                {show("symbols") && (
                  <div className="flex items-center pr-2.5">
                    <Switch checked={on} onChange={(x) => toggleSymbol(s, x)} label={`${t("tradeThis")} ${SYMBOL_LABEL[s] ?? s}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-brand-ink-dim">{t("clickPair")}</p>
      </section>

      {/* ===== AJUSTES DO PAR ===== */}
      <section className={`${card} flex flex-col gap-6 ring-1 ring-brand-accent/30`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-brand-ink">{t("editing", { pair: SYMBOL_LABEL[editing] ?? editing })}</h2>
          {show("symbols") && <Toggle checked={editingOn} onChange={(x) => toggleSymbol(editing, x)} label={t("tradeThis")} />}
        </div>

        {show("riskProfile") && (
        <div>
          <h3 className={h2}>{t("risk")}</h3>
          <p className="mt-1 text-xs text-brand-ink-dim">{t("riskHint")}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            {profileList.map((pr) => {
              const on = p.riskProfile === pr;
              const value = pr === "custom" ? p.riskPct : RISK_PROFILES[pr];
              return (
                <button
                  key={pr}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPair(editing, { riskProfile: pr, riskPct: value })}
                  className={`rounded-xl border p-3 text-left transition ${
                    on ? "border-brand-accent bg-brand-accent/10" : "border-brand-hairline bg-brand-surface-2 hover:border-brand-accent/40"
                  }`}
                >
                  <span className={`block text-sm font-bold ${on ? "text-brand-accent" : "text-brand-ink"}`}>{t(`profiles.${pr}`)}</span>
                  <span className="mt-1 block text-[11px] text-brand-ink-dim">{t("profileDesc", { pct: pct(value) })}</span>
                </button>
              );
            })}
          </div>
          {p.riskProfile === "custom" && (
            <label className="mt-3 flex items-center gap-2 text-sm text-brand-ink-dim">
              {t("customPct")}
              <input
                type="number"
                min={0.1}
                max={10}
                step={0.1}
                value={p.riskPct}
                onChange={(e) => setPair(editing, { riskPct: Number(e.target.value) })}
                className={`${field} !w-24`}
              />
            </label>
          )}
        </div>
        )}

        {anyShown("goalPct", "lossPct") && (
        <div className="grid gap-5 sm:grid-cols-2">
          {show("goalPct") && (
          <Field label={t("pairGoal")}>
            <select value={p.goalPct} onChange={(e) => setPair(editing, { goalPct: Number(e.target.value) })} className={field}>
              {allowed("goalPct", PCT_OPTIONS).map((o) => (
                <option key={o} value={o}>
                  {pctLabel(o)}
                </option>
              ))}
            </select>
          </Field>
          )}
          {show("lossPct") && (
          <Field label={t("pairLoss")}>
            <select value={p.lossPct} onChange={(e) => setPair(editing, { lossPct: Number(e.target.value) })} className={field}>
              {allowed("lossPct", PCT_OPTIONS).map((o) => (
                <option key={o} value={o}>
                  {pctLabel(o)}
                </option>
              ))}
            </select>
          </Field>
          )}
          <p className="-mt-2 text-xs text-brand-ink-dim sm:col-span-2">{t("pairGoalHint")}</p>
        </div>
        )}

        {show("direction") && (
        <Field label={t("direction")} group>
          <Segmented
            value={p.direction}
            onChange={(x) => setPair(editing, { direction: x })}
            options={allowed("direction", [0, 1, 2]).map((d) => ({ value: d, label: t(`directions.d${d}`) }))}
          />
        </Field>
        )}

        {anyShown("recovery", "recoveryLevels", "recoveryOpposite") && (
        <div className="flex flex-col gap-4 rounded-xl bg-brand-surface-2/60 p-4">
          {show("recovery") && (
            <Toggle
              checked={p.recovery}
              onChange={(x) => setPair(editing, { recovery: x })}
              label={t("recovery")}
              hint={t("recoveryHint")}
              disabled={locked("recovery")}
            />
          )}
          {p.recovery && anyShown("recoveryLevels", "recoveryOpposite") && (
            <div className="grid gap-4 sm:grid-cols-2">
              {show("recoveryLevels") && (
              <Field label={t("levels")}>
                <select value={p.recoveryLevels} onChange={(e) => setPair(editing, { recoveryLevels: Number(e.target.value) })} className={field}>
                  {allowed("recoveryLevels", Array.from({ length: 10 }, (_, i) => i + 1)).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
              )}
              {show("recoveryOpposite") && (
              <Field label={t("recoveryDir")} group>
                <Segmented
                  value={p.recoveryOpposite ? 1 : 0}
                  onChange={(x) => setPair(editing, { recoveryOpposite: x === 1 })}
                  options={allowed("recoveryOpposite", [false, true]).map((o) => ({
                    value: o ? 1 : 0,
                    label: t(o ? "recoveryDirs.opposite" : "recoveryDirs.same"),
                  }))}
                />
              </Field>
              )}
            </div>
          )}
        </div>
        )}

        {anyShown("rsiZone", "rsiPeriod", "rsiTf", "breakout", "pending") && (
        <div>
          <h3 className={h2}>{t("strategy")}</h3>
          {anyShown("rsiZone", "rsiPeriod", "rsiTf") && (
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {show("rsiZone") && (
            <Field label={t("rsiZone")} hint={t("rsiZoneHint")}>
              <select value={p.rsiZone} onChange={(e) => setPair(editing, { rsiZone: Number(e.target.value) })} className={field}>
                {allowed("rsiZone", Array.from({ length: 10 }, (_, i) => i)).map((i) => (
                  <option key={i} value={i}>{`RSI ${50 - 5 * i}-${50 + 5 * i}`}</option>
                ))}
              </select>
            </Field>
            )}
            {show("rsiPeriod") && (
            <Field label={t("rsiPeriod")}>
              <select value={p.rsiPeriod} onChange={(e) => setPair(editing, { rsiPeriod: Number(e.target.value) })} className={field}>
                {allowed("rsiPeriod", RSI_PERIODS).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
            )}
            {show("rsiTf") && (
            <Field label={t("rsiTf")}>
              <select value={p.rsiTf} onChange={(e) => setPair(editing, { rsiTf: Number(e.target.value) })} className={field}>
                {allowed("rsiTf", RSI_TIMEFRAMES).map((n) => (
                  <option key={n} value={n}>{`M${n}`}</option>
                ))}
              </select>
            </Field>
            )}
          </div>
          )}
          {anyShown("breakout", "pending") && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {show("breakout") && (
            <Field label={t("logic")} group>
              <Segmented
                value={p.breakout ? 1 : 0}
                onChange={(x) => setPair(editing, { breakout: x === 1 })}
                options={allowed("breakout", [false, true]).map((o) => ({ value: o ? 1 : 0, label: t(o ? "logics.breakout" : "logics.reversal") }))}
              />
            </Field>
            )}
            {show("pending") && (
            <Field label={t("entry")} group>
              <Segmented
                value={p.pending ? 1 : 0}
                onChange={(x) => setPair(editing, { pending: x === 1 })}
                options={allowed("pending", [true, false]).map((o) => ({ value: o ? 1 : 0, label: t(o ? "entries.pending" : "entries.market") }))}
              />
            </Field>
            )}
          </div>
          )}
        </div>
        )}

        {anyShown("atr", "atrTf", "atrPeriod", "atrBars", "atrMin", "atrMax", "adx", "adxTf", "adxPeriod", "adxLevel", "adxRising") && (
        <div>
          <h3 className={h2}>{t("filters")}</h3>
          <div className="mt-3 grid gap-5 sm:grid-cols-2">
            {anyShown("atr", "atrTf", "atrPeriod", "atrBars", "atrMin", "atrMax") && (
            <div className="flex flex-col gap-3 rounded-xl bg-brand-surface-2/40 p-4">
              {show("atr") && (
                <Toggle checked={p.atr} onChange={(x) => setPair(editing, { atr: x })} label={t("atr")} hint={t("atrHint")} disabled={locked("atr")} />
              )}
              {p.atr && (
                <div className="grid grid-cols-2 gap-3">
                  {show("atrTf") && (
                    <Field label={t("atrTf")}>
                      <select value={p.atrTf} onChange={(e) => setPair(editing, { atrTf: Number(e.target.value) })} className={field}>
                        {allowed("atrTf", FILTER_TFS).map((n) => (
                          <option key={n} value={n}>{tfLabel(n)}</option>
                        ))}
                      </select>
                    </Field>
                  )}
                  {show("atrPeriod") && (
                    <Field label={t("atrPeriod")}>
                      <select value={p.atrPeriod} onChange={(e) => setPair(editing, { atrPeriod: Number(e.target.value) })} className={field}>
                        {allowed("atrPeriod", ATR_PERIODS).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </Field>
                  )}
                  {show("atrBars") && (
                    <Field label={t("atrBars")}>
                      <select value={p.atrBars} onChange={(e) => setPair(editing, { atrBars: Number(e.target.value) })} className={field}>
                        {allowed("atrBars", ATR_BARS).map((n) => (
                          <option key={n} value={n}>{t("candles", { n })}</option>
                        ))}
                      </select>
                    </Field>
                  )}
                  {show("atrMin") && (
                    <Field label={t("atrMin")}>
                      <select value={p.atrMin} onChange={(e) => setPair(editing, { atrMin: Number(e.target.value) })} className={field}>
                        {allowed("atrMin", ATR_MIN_RATIOS).filter((n) => n < p.atrMax).map((n) => (
                          <option key={n} value={n}>{`${pct(n)}x`}</option>
                        ))}
                      </select>
                    </Field>
                  )}
                  {show("atrMax") && (
                    <Field label={t("atrMax")}>
                      <select value={p.atrMax} onChange={(e) => setPair(editing, { atrMax: Number(e.target.value) })} className={field}>
                        {allowed("atrMax", ATR_MAX_RATIOS).filter((n) => n > p.atrMin).map((n) => (
                          <option key={n} value={n}>{`${pct(n)}x`}</option>
                        ))}
                      </select>
                    </Field>
                  )}
                </div>
              )}
            </div>
            )}
            {anyShown("adx", "adxTf", "adxPeriod", "adxLevel", "adxRising") && (
            <div className="flex flex-col gap-3 rounded-xl bg-brand-surface-2/40 p-4">
              {show("adx") && (
                <Toggle checked={p.adx} onChange={(x) => setPair(editing, { adx: x })} label={t("adx")} hint={t("adxHint")} disabled={locked("adx")} />
              )}
              {p.adx && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {show("adxTf") && (
                      <Field label={t("adxTf")}>
                        <select value={p.adxTf} onChange={(e) => setPair(editing, { adxTf: Number(e.target.value) })} className={field}>
                          {allowed("adxTf", FILTER_TFS).map((n) => (
                            <option key={n} value={n}>{tfLabel(n)}</option>
                          ))}
                        </select>
                      </Field>
                    )}
                    {show("adxPeriod") && (
                      <Field label={t("adxPeriod")}>
                        <select value={p.adxPeriod} onChange={(e) => setPair(editing, { adxPeriod: Number(e.target.value) })} className={field}>
                          {allowed("adxPeriod", ADX_PERIODS).map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </Field>
                    )}
                    {show("adxLevel") && (
                      <Field label={t("adxLevel")}>
                        <select value={p.adxLevel} onChange={(e) => setPair(editing, { adxLevel: Number(e.target.value) })} className={field}>
                          {allowed("adxLevel", ADX_LEVELS).map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </Field>
                    )}
                  </div>
                  {show("adxRising") && (
                    <Toggle checked={p.adxRising} onChange={(x) => setPair(editing, { adxRising: x })} label={t("adxRising")} disabled={locked("adxRising")} />
                  )}
                </>
              )}
            </div>
            )}
          </div>
        </div>
        )}

        {anyShown("zones", "zonesMode", "zoneTfs", "zoneLines", "zoneCandles", "zoneTolerance") && (
        <div>
          <h3 className={h2}>{t("zonesTitle")}</h3>
          <div className="mt-3 flex flex-col gap-4">
            {show("zones") && (
              <Toggle checked={p.zones} onChange={(x) => setPair(editing, { zones: x })} label={t("zones")} hint={t("zonesHint")} disabled={locked("zones")} />
            )}
            {p.zones && (
              <>
                {show("zonesMode") && (
                  <Field label={t("zonesMode")} group>
                    <Segmented
                      value={p.zonesMode}
                      onChange={(x) => setPair(editing, { zonesMode: x })}
                      options={allowed("zonesMode", [2, 1, 0]).map((m) => ({ value: m, label: t(`zonesModes.m${m}`) }))}
                    />
                  </Field>
                )}
                {show("zoneTfs") && (
                  <Field label={t("zoneTfs")} group>
                    <TfChips value={p.zoneTfs} options={allowed("zoneTfs", TIMEFRAMES)} minOne onChange={(x) => setPair(editing, { zoneTfs: x })} />
                  </Field>
                )}
                {show("zoneLines") && (
                  <Field label={t("zoneLines")} hint={t("zoneLinesHint")} group>
                    <TfChips
                      value={p.zoneLines.filter((x) => p.zoneTfs.includes(x))}
                      options={allowed("zoneLines", TIMEFRAMES).filter((x) => p.zoneTfs.includes(x))}
                      onChange={(x) => setPair(editing, { zoneLines: x })}
                    />
                  </Field>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  {show("zoneCandles") && (
                    <Field label={t("zoneCandles")} hint={t("zoneCandlesHint", { min: lim("zoneCandles").min, max: lim("zoneCandles").max })} group>
                      <NumberField
                        key={`zc-${editing}`}
                        value={p.zoneCandles}
                        onChange={(x) => setPair(editing, { zoneCandles: x })}
                        {...lim("zoneCandles")}
                        autoLabel={t("auto")}
                        unit={t("candlesUnit")}
                        label={t("zoneCandles")}
                      />
                    </Field>
                  )}
                  {show("zoneTolerance") && (
                    <Field label={t("zoneTolerance")} hint={t("pipsHint", { ...lim("zoneTolerance"), auto: AUTO_PIPS.zoneTolerance })} group>
                      <NumberField
                        key={`zt-${editing}`}
                        value={p.zoneTolerance}
                        onChange={(x) => setPair(editing, { zoneTolerance: x })}
                        {...lim("zoneTolerance")}
                        autoLabel={t("auto")}
                        unit="pips"
                        label={t("zoneTolerance")}
                      />
                    </Field>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        )}

        {anyShown("profitClose", "profitPips", "lossClose", "lossPips", "breakEven", "beTrigger", "beOffset", "trailing", "trailStart", "trailDistance", "trailStep") && (
        <div>
          <h3 className={h2}>{t("exits")}</h3>
          <p className="mt-1 text-xs text-brand-ink-dim">{t("exitsHint")}</p>
          <div className="mt-3 grid gap-5 sm:grid-cols-2">
            {anyShown("profitClose", "profitPips") && (
            <div className="flex flex-col gap-3 rounded-xl bg-brand-surface-2/40 p-4">
              {show("profitClose") && (
                <Toggle checked={p.profitClose} onChange={(x) => setPair(editing, { profitClose: x })} label={t("profitClose")} disabled={locked("profitClose")} />
              )}
              {p.profitClose && show("profitPips") && (
                <Field label={t("profitPips")} hint={t("pipsHint", { ...lim("profitPips"), auto: AUTO_PIPS.profitPips })} group>
                  <NumberField key={`pp-${editing}`} value={p.profitPips} onChange={(x) => setPair(editing, { profitPips: x })} {...lim("profitPips")} autoLabel={t("auto")} unit="pips" label={t("profitPips")} />
                </Field>
              )}
            </div>
            )}
            {anyShown("lossClose", "lossPips") && (
            <div className="flex flex-col gap-3 rounded-xl bg-brand-surface-2/40 p-4">
              {show("lossClose") && (
                <Toggle checked={p.lossClose} onChange={(x) => setPair(editing, { lossClose: x })} label={t("lossClose")} hint={t("lossCloseHint")} disabled={locked("lossClose")} />
              )}
              {show("lossPips") && (
                <Field label={t("lossPips")} hint={t("lossPipsHint", { ...lim("lossPips"), auto: AUTO_PIPS.lossPips })} group>
                  <NumberField key={`lp-${editing}`} value={p.lossPips} onChange={(x) => setPair(editing, { lossPips: x })} {...lim("lossPips")} autoLabel={t("auto")} unit="pips" label={t("lossPips")} />
                </Field>
              )}
            </div>
            )}
            {anyShown("breakEven", "beTrigger", "beOffset") && (
            <div className="flex flex-col gap-3 rounded-xl bg-brand-surface-2/40 p-4">
              {show("breakEven") && (
                <Toggle checked={p.breakEven} onChange={(x) => setPair(editing, { breakEven: x })} label={t("breakEven")} hint={t("breakEvenHint")} disabled={locked("breakEven")} />
              )}
              {p.breakEven && (
                <>
                  {show("beTrigger") && (
                    <Field label={t("beTrigger")} hint={t("pipsHint", { ...lim("beTrigger"), auto: AUTO_PIPS.beTrigger })} group>
                      <NumberField key={`bt-${editing}`} value={p.beTrigger} onChange={(x) => setPair(editing, { beTrigger: x })} {...lim("beTrigger")} autoLabel={t("auto")} unit="pips" label={t("beTrigger")} />
                    </Field>
                  )}
                  {show("beOffset") && (
                    <Field label={t("beOffset")} hint={t("pipsHint", { ...lim("beOffset"), auto: AUTO_PIPS.beOffset })} group>
                      <NumberField key={`bo-${editing}`} value={p.beOffset} onChange={(x) => setPair(editing, { beOffset: x })} {...lim("beOffset")} autoLabel={t("auto")} unit="pips" label={t("beOffset")} />
                    </Field>
                  )}
                </>
              )}
            </div>
            )}
            {anyShown("trailing", "trailStart", "trailDistance", "trailStep") && (
            <div className="flex flex-col gap-3 rounded-xl bg-brand-surface-2/40 p-4">
              {show("trailing") && (
                <Toggle checked={p.trailing} onChange={(x) => setPair(editing, { trailing: x })} label={t("trailing")} hint={t("trailingHint")} disabled={locked("trailing")} />
              )}
              {p.trailing && (
                <>
                  {show("trailStart") && (
                    <Field label={t("trailStart")} hint={t("pipsHint", { ...lim("trailStart"), auto: AUTO_PIPS.trailStart })} group>
                      <NumberField key={`ts-${editing}`} value={p.trailStart} onChange={(x) => setPair(editing, { trailStart: x })} {...lim("trailStart")} autoLabel={t("auto")} unit="pips" label={t("trailStart")} />
                    </Field>
                  )}
                  {show("trailDistance") && (
                    <Field label={t("trailDistance")} hint={t("pipsHint", { ...lim("trailDistance"), auto: AUTO_PIPS.trailDistance })} group>
                      <NumberField key={`td-${editing}`} value={p.trailDistance} onChange={(x) => setPair(editing, { trailDistance: x })} {...lim("trailDistance")} autoLabel={t("auto")} unit="pips" label={t("trailDistance")} />
                    </Field>
                  )}
                  {show("trailStep") && (
                    <Field label={t("trailStep")} hint={t("pipsHint", { ...lim("trailStep"), auto: AUTO_PIPS.trailStep })} group>
                      <NumberField key={`tt-${editing}`} value={p.trailStep} onChange={(x) => setPair(editing, { trailStep: x })} {...lim("trailStep")} autoLabel={t("auto")} unit="pips" label={t("trailStep")} />
                    </Field>
                  )}
                </>
              )}
            </div>
            )}
          </div>
        </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-brand-hairline pt-4">
          <button
            type="button"
            onClick={copyToAll}
            className="rounded-full border border-brand-hairline px-4 py-2 text-xs font-semibold text-brand-ink hover:border-brand-accent/50"
          >
            {t("copyAll")}
          </button>
          <button
            type="button"
            onClick={() => setPair(editing, { ...defaultPair })}
            className="rounded-full border border-brand-hairline px-4 py-2 text-xs font-semibold text-brand-ink-dim hover:text-brand-ink"
          >
            {t("resetPair")}
          </button>
        </div>
      </section>

      {/* ===== CONTA (TODOS OS PARES) ===== */}
      <section className={`${card} flex flex-col gap-5`}>
        <div>
          <h2 className={h2}>{t("account")}</h2>
          <p className="mt-1 text-xs text-brand-ink-dim">{t("accountHint")}</p>
        </div>
        {anyShown("maxPositions", "ddPct", "dailyGoalPct", "dailyLossPct") && (
        <div className="grid gap-5 sm:grid-cols-2">
          {show("maxPositions") && (
          <Field label={t("maxPositions")}>
            <select value={v.maxPositions} onChange={(e) => set("maxPositions", Number(e.target.value))} className={field}>
              {allowed("maxPositions", Array.from({ length: MAX_POSITIONS }, (_, i) => i + 1)).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
          )}
          {show("ddPct") && (
          <Field label={t("dd")} hint={t("ddHint", { cap: ddCap })}>
            <select value={v.ddPct} onChange={(e) => set("ddPct", Number(e.target.value))} className={field}>
              {ddOptions.map((o) => (
                <option key={o} value={o}>
                  {pctLabel(o)}
                </option>
              ))}
            </select>
          </Field>
          )}
          {show("dailyGoalPct") && (
          <Field label={t("goal")}>
            <select value={v.dailyGoalPct} onChange={(e) => set("dailyGoalPct", Number(e.target.value))} className={field}>
              {allowed("dailyGoalPct", PCT_OPTIONS).map((o) => (
                <option key={o} value={o}>
                  {pctLabel(o)}
                </option>
              ))}
            </select>
          </Field>
          )}
          {show("dailyLossPct") && (
          <Field label={t("loss")}>
            <select value={v.dailyLossPct} onChange={(e) => set("dailyLossPct", Number(e.target.value))} className={field}>
              {allowed("dailyLossPct", PCT_OPTIONS).map((o) => (
                <option key={o} value={o}>
                  {pctLabel(o)}
                </option>
              ))}
            </select>
          </Field>
          )}
          {anyShown("dailyGoalPct", "dailyLossPct") && <p className="-mt-2 text-xs text-brand-ink-dim sm:col-span-2">{t("goalHint")}</p>}
        </div>
        )}

        {anyShown("startHour", "endHour", "days") && (
        <div className="grid gap-5 sm:grid-cols-2">
          {anyShown("startHour", "endHour") && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-brand-ink">{t("hours")}</span>
            <div className="flex items-center gap-2 text-sm text-brand-ink-dim">
              {t("from")}
              <select
                value={v.startHour}
                onChange={(e) => set("startHour", Number(e.target.value))}
                disabled={!show("startHour")}
                className={`${field} disabled:opacity-60`}
              >
                {(show("startHour") ? allowed("startHour", Array.from({ length: 24 }, (_, h) => h)) : [v.startHour]).map((h) => (
                  <option key={h} value={h}>{`${String(h).padStart(2, "0")}:00`}</option>
                ))}
              </select>
              {t("to")}
              <select
                value={v.endHour}
                onChange={(e) => set("endHour", Number(e.target.value))}
                disabled={!show("endHour")}
                className={`${field} disabled:opacity-60`}
              >
                {(show("endHour") ? allowed("endHour", Array.from({ length: 24 }, (_, h) => h + 1)) : [v.endHour]).map((h) => (
                  <option key={h} value={h}>{`${String(h).padStart(2, "0")}:00`}</option>
                ))}
              </select>
            </div>
          </div>
          )}
          {show("days") && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-brand-ink">{t("days")}</span>
            <div className="flex flex-wrap gap-1.5">
              {allowed("days", [1, 2, 3, 4, 5, 6, 0]).map((d) => {
                const on = v.days.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set("days", on ? v.days.filter((x) => x !== d) : [...v.days, d].sort())}
                    className={`min-w-11 rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                      on ? "border-brand-accent bg-brand-accent/15 text-brand-accent" : "border-brand-hairline bg-brand-surface-2 text-brand-ink-dim"
                    }`}
                  >
                    {t(`weekdays.d${d}`)}
                  </button>
                );
              })}
            </div>
          </div>
          )}
        </div>
        )}

        {anyShown("newsFilter", "newsMedium", "newsBefore", "newsAfter", "newsClose") && (
        <div className="flex flex-col gap-4 rounded-xl bg-brand-surface-2/60 p-4">
          {show("newsFilter") && (
            <Toggle
              checked={v.newsFilter}
              onChange={(x) => set("newsFilter", x)}
              label={t("news")}
              hint={t("newsHint")}
              disabled={locked("newsFilter")}
            />
          )}
          {v.newsFilter && (
            <>
              {show("newsMedium") && (
                <Toggle checked={v.newsMedium} onChange={(x) => set("newsMedium", x)} label={t("newsMedium")} disabled={locked("newsMedium")} />
              )}
              <div className="grid gap-4 sm:grid-cols-3">
                {show("newsBefore") && (
                <Field label={t("newsBefore")}>
                  <select value={v.newsBefore} onChange={(e) => set("newsBefore", Number(e.target.value))} className={field}>
                    {allowed("newsBefore", NEWS_MINUTES).map((n) => (
                      <option key={n} value={n}>
                        {t("minutes", { n })}
                      </option>
                    ))}
                  </select>
                </Field>
                )}
                {show("newsAfter") && (
                <Field label={t("newsAfter")}>
                  <select value={v.newsAfter} onChange={(e) => set("newsAfter", Number(e.target.value))} className={field}>
                    {allowed("newsAfter", NEWS_MINUTES).map((n) => (
                      <option key={n} value={n}>
                        {t("minutes", { n })}
                      </option>
                    ))}
                  </select>
                </Field>
                )}
                {show("newsClose") && (
                <Field label={t("newsClose")}>
                  <select value={v.newsClose} onChange={(e) => set("newsClose", Number(e.target.value))} className={field}>
                    {allowed("newsClose", [3, 1, 2, 0]).map((c) => (
                      <option key={c} value={c}>
                        {t(`newsCloses.c${c}`)}
                      </option>
                    ))}
                  </select>
                </Field>
                )}
              </div>
            </>
          )}
        </div>
        )}
      </section>

      {/* ===== BACKTEST ===== */}
      <section className={`${card} flex flex-col gap-3`}>
        <h2 className={h2}>{t("backtest")}</h2>
        <p className="text-sm text-brand-ink-dim">{t("backtestHint")}</p>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-brand-ink-dim">
          <li>{t("backtestAuto")}</li>
          <li>{t("backtestManual")}</li>
          <li>{t("backtestPair")}</li>
        </ul>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`/api/robot/config/${login}`}
            className="rounded-full border border-brand-accent/60 px-4 py-2 text-xs font-semibold text-brand-accent hover:bg-brand-accent/10"
          >
            {t("backtestDownload")}
          </a>
          {dirty && <span className="text-xs text-amber-300">{t("backtestSaveFirst")}</span>}
        </div>
      </section>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-4 rounded-2xl border border-brand-hairline bg-brand-bg/85 p-3 backdrop-blur">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="btn-glow rounded-full bg-brand-accent px-6 py-2.5 text-sm font-bold text-brand-bg disabled:opacity-60"
        >
          {pending ? t("saving") : t("save")}
        </button>
        {status ? (
          <p role="status" className={`text-sm font-semibold ${status.ok ? "text-brand-accent" : "text-red-300"}`}>
            {status.text}
          </p>
        ) : (
          dirty && <p className="text-sm text-amber-300">{t("unsaved")}</p>
        )}
      </div>
    </div>
  );
}
