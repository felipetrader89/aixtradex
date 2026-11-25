"use client";

import { useState, useTransition } from "react";
import { saveRobotPolicyAction } from "@/app/actions/robot";
import {
  AUTO_PIPS,
  RISK_PROFILES,
  SYMBOL_LABEL,
  tfLabel,
  hasValue,
  normalizePolicy,
  paramDef,
  type ParamKey,
  type ParamPolicy,
  type PolicyValue,
  type RobotPolicy,
} from "@/lib/robot-options";
import { adminBtn, adminBtnGhost, adminInput } from "@/components/admin/ui";

// Nome e texto de cada opção (o admin é só em português).
const onOff = (v: PolicyValue) => (v ? "Ligado" : "Desligado");
const pct = (v: PolicyValue) => (Number(v) === 0 ? "Desligado" : `${String(v).replace(".", ",")}%`);
const hour = (v: PolicyValue) => `${String(v).padStart(2, "0")}:00`;
const WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const tf = (v: PolicyValue) => tfLabel(Number(v));
const pipsFmt = (v: PolicyValue) => (Number(v) === 0 ? "Automático" : `${v} pips`);
const autoHint = (k: keyof typeof AUTO_PIPS, what: string) =>
  `${what} Pips do par. Automático = ${AUTO_PIPS[k]} pips no ouro (1 pip = 0,01); nos outros pares acompanha a volatilidade do ouro.`;

const PARAMS: Record<ParamKey, { label: string; hint?: string; fmt: (v: PolicyValue) => string }> = {
  symbols: { label: "Pares", hint: "Padrão = pares ligados de quem ainda não mexeu.", fmt: (v) => SYMBOL_LABEL[String(v)] ?? String(v) },
  maxPositions: { label: "Máximo de operações simultâneas", fmt: String },
  ddPct: { label: "Rebaixamento máximo", hint: "Se as posições abertas perderem essa % do saldo, fecha tudo e pausa até o dia seguinte.", fmt: pct },
  dailyGoalPct: { label: "Meta de lucro do dia (conta)", fmt: pct },
  dailyLossPct: { label: "Limite de perda do dia (conta)", fmt: pct },
  startHour: { label: "Horário: começa às", hint: "Hora do servidor da corretora.", fmt: hour },
  endHour: { label: "Horário: para às", fmt: hour },
  days: { label: "Dias de operação", fmt: (v) => WEEK[Number(v)] },
  newsFilter: { label: "Pausar nas notícias fortes", fmt: onOff },
  newsMedium: { label: "Também nas notícias de médio impacto", fmt: onOff },
  newsBefore: { label: "Notícias: pausar antes", fmt: (v) => `${v} min` },
  newsAfter: { label: "Notícias: voltar depois", fmt: (v) => `${v} min` },
  newsClose: {
    label: "Notícias: ao entrar na pausa",
    fmt: (v) => ["Não fecha nada", "Fecha as posições", "Apaga as pendentes", "Fecha tudo"][Number(v)],
  },
  riskProfile: {
    label: "Risco por entrada",
    hint: "Personalizado continua só pra admin.",
    fmt: (v) => {
      const name = { conservative: "Conservador", moderate: "Moderado", aggressive: "Agressivo" }[String(v)] ?? String(v);
      return `${name} (${RISK_PROFILES[v as keyof typeof RISK_PROFILES]}%)`;
    },
  },
  goalPct: { label: "Meta do dia do par", fmt: pct },
  lossPct: { label: "Limite de perda do dia do par", fmt: pct },
  direction: { label: "Direção", fmt: (v) => ["Compra e venda", "Só compra", "Só venda"][Number(v)] },
  recovery: { label: "Recuperação de perdas", fmt: onOff },
  recoveryLevels: { label: "Recuperação: máximo de níveis", fmt: String },
  recoveryOpposite: { label: "Recuperação: depois de uma perda", fmt: (v) => (v ? "Inverte a direção" : "Segue o sinal") },
  rsiZone: { label: "Zona do RSI", fmt: (v) => `RSI ${50 - 5 * Number(v)}-${50 + 5 * Number(v)}` },
  rsiPeriod: { label: "Período do RSI", fmt: String },
  rsiTf: { label: "Tempo gráfico do RSI", fmt: (v) => `M${v}` },
  breakout: { label: "Lógica", fmt: (v) => (v ? "Rompimento" : "Reversão") },
  pending: { label: "Entrada", fmt: (v) => (v ? "Ordem pendente" : "A mercado") },
  atr: { label: "Filtro de volatilidade (ATR)", fmt: onOff },
  adx: { label: "Filtro de tendência (ADX)", fmt: onOff },
  adxLevel: { label: "Nível de tendência forte (ADX)", fmt: String },
  zones: { label: "Zonas de topo e fundo", fmt: onOff },
  zonesMode: { label: "Modo das zonas", fmt: (v) => ["Só com o ADX", "Não opera contra a zona", "Só opera nas zonas"][Number(v)] },
  breakEven: { label: "Break-even", fmt: onOff },
  trailing: { label: "Stop móvel", fmt: onOff },
  beTrigger: { label: "Break-even: liga com", hint: autoHint("beTrigger", "Lucro que liga o break-even."), fmt: pipsFmt },
  beOffset: { label: "Break-even: trava", hint: autoHint("beOffset", "Lucro que fica garantido quando o break-even liga."), fmt: pipsFmt },
  trailStart: { label: "Stop móvel: começa com", hint: autoHint("trailStart", "Lucro que liga o stop móvel."), fmt: pipsFmt },
  trailDistance: { label: "Stop móvel: segue a", hint: autoHint("trailDistance", "Distância do stop até o preço."), fmt: pipsFmt },
  trailStep: { label: "Stop móvel: passo", hint: autoHint("trailStep", "De quanto em quanto o stop anda."), fmt: pipsFmt },
  profitClose: { label: "Fechar no alvo de lucro", fmt: onOff },
  profitPips: { label: "Alvo de lucro", hint: autoHint("profitPips", "Fecha a posição quando o lucro chega aqui."), fmt: pipsFmt },
  lossClose: { label: "Fechar no limite de perda", hint: "Desligado: a posição fica só com o stop de emergência na corretora (3x a distância).", fmt: onOff },
  lossPips: {
    label: "Limite de perda",
    hint: autoHint("lossPips", "Fecha a posição quando a perda chega aqui. O lote é calculado por ela (risco % do saldo).") + " Nos pares o automático tem no mínimo 10 pips.",
    fmt: pipsFmt,
  },
  zoneTfs: { label: "Zonas: tempos gráficos usados", fmt: tf },
  zoneLines: { label: "Zonas: mostrar as linhas no gráfico", hint: "Só aparecem as linhas dos tempos gráficos usados.", fmt: tf },
  zoneCandles: { label: "Zonas: leitura das velas", hint: "Topo e fundo = máxima e mínima das últimas N velas fechadas de cada tempo gráfico.", fmt: (v) => `${v} velas` },
  zoneTolerance: { label: "Zonas: tolerância", hint: autoHint("zoneTolerance", "Distância do topo/fundo que conta como \"na zona\"."), fmt: pipsFmt },
  adxTf: { label: "ADX: tempo gráfico", fmt: tf },
  adxPeriod: { label: "ADX: período", fmt: String },
  adxRising: { label: "ADX: só conta tendência se estiver subindo", fmt: onOff },
  atrTf: { label: "ATR: tempo gráfico", fmt: tf },
  atrPeriod: { label: "ATR: período", fmt: String },
  atrBars: { label: "ATR: velas da média", fmt: (v) => `${v} velas` },
  atrMin: { label: "ATR: mínimo (mercado parado abaixo disso)", fmt: (v) => `${String(v).replace(".", ",")}x` },
  atrMax: { label: "ATR: máximo (volatilidade alta acima disso)", fmt: (v) => `${String(v).replace(".", ",")}x` },
};

const GROUPS: { title: string; hint: string; keys: ParamKey[] }[] = [
  {
    title: "Conta (todos os pares somados)",
    hint: "Limites que valem pra conta inteira.",
    keys: ["symbols", "maxPositions", "ddPct", "dailyGoalPct", "dailyLossPct", "startHour", "endHour", "days"],
  },
  { title: "Notícias", hint: "", keys: ["newsFilter", "newsMedium", "newsBefore", "newsAfter", "newsClose"] },
  { title: "Cada par: risco e metas", hint: "Valem pra cada par (o cliente clica no par pra ajustar).", keys: ["riskProfile", "goalPct", "lossPct", "direction"] },
  { title: "Cada par: recuperação", hint: "", keys: ["recovery", "recoveryLevels", "recoveryOpposite"] },
  { title: "Cada par: estratégia", hint: "", keys: ["rsiZone", "rsiPeriod", "rsiTf", "breakout", "pending"] },
  { title: "Cada par: filtro de volatilidade (ATR)", hint: "Opera só quando o ATR atual ÷ a média fica entre o mínimo e o máximo.", keys: ["atr", "atrTf", "atrPeriod", "atrBars", "atrMin", "atrMax"] },
  { title: "Cada par: filtro de tendência (ADX)", hint: "", keys: ["adx", "adxTf", "adxPeriod", "adxLevel", "adxRising"] },
  { title: "Cada par: zonas de topo e fundo", hint: "", keys: ["zones", "zonesMode", "zoneTfs", "zoneLines", "zoneCandles", "zoneTolerance"] },
  {
    title: "Cada par: saída",
    hint: "Valores em pips do par. Automático = os valores de sempre do robô.",
    keys: ["profitClose", "profitPips", "lossClose", "lossPips", "breakEven", "beTrigger", "beOffset", "trailing", "trailStart", "trailDistance", "trailStep"],
  },
];

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-brand-accent" : "bg-brand-surface-2 ring-1 ring-brand-hairline"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

function Chip({ on, onClick, children, title }: { on: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      title={title}
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
        on ? "border-brand-accent bg-brand-accent/15 text-brand-accent" : "border-brand-hairline bg-brand-surface-2 text-brand-ink-dim line-through decoration-brand-ink-dim/50"
      }`}
    >
      {children}
    </button>
  );
}

// Parâmetro de faixa (pips, velas): padrão digitado (ou automático) + mínimo e máximo que o cliente pode digitar.
function RangeRow({ k, pol, onChange }: { k: ParamKey; pol: ParamPolicy; onChange: (p: ParamPolicy) => void }) {
  const r = paramDef(k).range!;
  const info = PARAMS[k];
  const lo = Number(pol.allow[0]);
  const hi = Number(pol.allow[1]);
  const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, Math.round(v)));
  const isAuto = !!r.auto && pol.def === 0;
  const setBound = (which: 0 | 1, raw: string) => {
    const v = Number(raw);
    if (!Number.isFinite(v) || raw === "") return;
    let a = which === 0 ? clamp(v, r.min, r.max) : lo;
    let b = which === 1 ? clamp(v, r.min, r.max) : hi;
    if (b < a) [a, b] = which === 0 ? [a, a] : [b, b];
    const def = pol.def === 0 && r.auto ? 0 : clamp(Number(pol.def), a, b);
    onChange({ ...pol, allow: [a, b], def });
  };
  const num = `${adminInput} w-24 py-1.5`;
  return (
    <div className="flex flex-col gap-3 border-b border-brand-hairline py-4 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-ink">{info.label}</p>
          {info.hint && <p className="text-xs text-brand-ink-dim">{info.hint}</p>}
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-brand-ink-dim">
          {pol.show ? "Cliente vê" : "Oculto"}
          <Switch checked={pol.show} onChange={(show) => onChange({ ...pol, show })} label={`Mostrar ${info.label} pro cliente`} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-dim">Padrão</span>
          {r.auto && (
            <Chip on={isAuto} onClick={() => onChange({ ...pol, def: isAuto ? clamp(AUTO_PIPS[k as keyof typeof AUTO_PIPS] ?? lo, lo, hi) : 0 })}>
              Automático
            </Chip>
          )}
          {!isAuto && (
            <input
              type="number"
              aria-label={`Padrão de ${info.label}`}
              min={lo}
              max={hi}
              value={Number(pol.def)}
              onChange={(e) => e.target.value !== "" && onChange({ ...pol, def: clamp(Number(e.target.value), lo, hi) })}
              className={num}
            />
          )}
        </div>
        {pol.show && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-dim">Cliente pode digitar de</span>
            <input type="number" aria-label={`Mínimo de ${info.label}`} min={r.min} max={r.max} value={lo} onChange={(e) => setBound(0, e.target.value)} className={num} />
            <span className="text-xs text-brand-ink-dim">até</span>
            <input type="number" aria-label={`Máximo de ${info.label}`} min={r.min} max={r.max} value={hi} onChange={(e) => setBound(1, e.target.value)} className={num} />
            {r.auto && <span className="text-xs text-brand-ink-dim">(ou Automático)</span>}
          </div>
        )}
      </div>
      {!pol.show && <p className="text-xs text-amber-300">O cliente não vê este ajuste. O robô usa o padrão.</p>}
    </div>
  );
}

function ParamRow({ k, pol, onChange }: { k: ParamKey; pol: ParamPolicy; onChange: (p: ParamPolicy) => void }) {
  const d = paramDef(k);
  if (d.range) return <RangeRow k={k} pol={pol} onChange={onChange} />;
  const info = PARAMS[k];
  const options = [...d.options];
  const label = (v: PolicyValue) => info.fmt(v);
  const key = (v: PolicyValue) => String(v);
  const defList = Array.isArray(pol.def) ? pol.def : [pol.def];

  // Liberar/bloquear uma opção. O padrão precisa continuar liberado; tem que sobrar pelo menos uma.
  const toggleAllow = (o: PolicyValue) => {
    const on = hasValue(pol.allow, o);
    if (on && pol.allow.length === 1) return;
    const allow = on ? pol.allow.filter((x) => x !== o) : options.filter((x) => x === o || hasValue(pol.allow, x));
    let def = pol.def;
    if (d.multi) {
      const list = defList.filter((x) => hasValue(allow, x));
      def = list.length || d.allowEmpty ? list : [allow[0]];
    } else if (!hasValue(allow, pol.def as PolicyValue)) def = d.ordered ? allow[allow.length - 1] : allow[0];
    onChange({ ...pol, allow, def });
  };
  const setMax = (max: number) => {
    const allow = options.filter((o) => Number(o) <= max);
    const def = hasValue(allow, pol.def as PolicyValue) ? pol.def : allow[allow.length - 1];
    onChange({ ...pol, allow, def });
  };
  const toggleDefMulti = (o: PolicyValue) => {
    const on = hasValue(defList, o);
    if (on && defList.length === 1 && !d.allowEmpty) return;
    onChange({ ...pol, def: on ? defList.filter((x) => x !== o) : options.filter((x) => x === o || hasValue(defList, x)) });
  };

  return (
    <div className="flex flex-col gap-3 border-b border-brand-hairline py-4 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-ink">{info.label}</p>
          {info.hint && <p className="text-xs text-brand-ink-dim">{info.hint}</p>}
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-brand-ink-dim">
          {pol.show ? "Cliente vê" : "Oculto"}
          <Switch checked={pol.show} onChange={(show) => onChange({ ...pol, show })} label={`Mostrar ${info.label} pro cliente`} />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-dim">Padrão</span>
          {d.multi ? (
            <div className="flex flex-wrap gap-1.5">
              {options
                .filter((o) => hasValue(pol.allow, o))
                .map((o) => (
                  <Chip key={key(o)} on={hasValue(defList, o)} onClick={() => toggleDefMulti(o)}>
                    {label(o)}
                  </Chip>
                ))}
            </div>
          ) : (
            <select
              aria-label={`Padrão de ${info.label}`}
              value={key(pol.def as PolicyValue)}
              onChange={(e) => onChange({ ...pol, def: options.find((o) => key(o) === e.target.value)! })}
              className={`${adminInput} py-1.5`}
            >
              {options
                .filter((o) => hasValue(pol.allow, o))
                .map((o) => (
                  <option key={key(o)} value={key(o)}>
                    {label(o)}
                  </option>
                ))}
            </select>
          )}
        </div>
        {d.ordered && pol.show && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-dim">Máximo</span>
            <select
              aria-label={`Máximo de ${info.label}`}
              value={Math.max(...pol.allow.map(Number))}
              onChange={(e) => setMax(Number(e.target.value))}
              className={`${adminInput} py-1.5`}
            >
              {options.map((o) => (
                <option key={key(o)} value={Number(o)}>
                  {label(o)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {pol.show ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-dim">Cliente pode escolher</span>
          <div className="flex flex-wrap gap-1.5">
            {options.map((o) => (
              <Chip key={key(o)} on={hasValue(pol.allow, o)} onClick={() => toggleAllow(o)} title="Clique pra liberar ou bloquear">
                {label(o)}
              </Chip>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-amber-300">O cliente não vê este ajuste. O robô usa o padrão.</p>
      )}
    </div>
  );
}

export function RobotPolicyForm({ initial }: { initial: RobotPolicy }) {
  const [policy, setPolicy] = useState<RobotPolicy>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(policy) !== saved;

  const update = (k: ParamKey, p: ParamPolicy) => {
    setPolicy((old) => ({ ...old, [k]: p }));
    setStatus(null);
  };

  function save() {
    start(async () => {
      const r = await saveRobotPolicyAction(policy);
      if (r.ok) {
        setPolicy(r.policy);
        setSaved(JSON.stringify(r.policy));
        setStatus({ ok: true, text: "Salvo. Vale na hora pro painel dos clientes; o robô recebe em até 30 segundos." });
      } else setStatus({ ok: false, text: "Não deu pra salvar. Tente de novo." });
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="panel-card rounded-2xl border border-brand-hairline bg-brand-surface/90 p-5 text-sm text-brand-ink-dim">
        <p>
          Aqui você decide o que cada cliente vê em <strong className="text-brand-ink">Contas MT4 → Configurar robô</strong>:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong className="text-brand-ink">Cliente vê / Oculto</strong>: oculto, o cliente não vê o ajuste e o robô usa o padrão daqui.
          </li>
          <li>
            <strong className="text-brand-ink">Padrão</strong>: o valor de quem ainda não mexeu (e o do botão &quot;Voltar ao padrão&quot;).
          </li>
          <li>
            <strong className="text-brand-ink">Cliente pode escolher</strong>: clique numa opção pra bloquear ou liberar (riscada = bloqueada). Nos
            números, o <strong className="text-brand-ink">Máximo</strong> bloqueia tudo acima.
          </li>
        </ul>
        <p className="mt-2">
          Se um cliente já tinha escolhido algo que você bloqueou ou ocultou, o robô dele passa a usar o padrão. Contas salvas por um admin
          ignoram esses limites.
        </p>
      </section>

      {GROUPS.map((g) => (
        <section key={g.title} className="panel-card rounded-2xl border border-brand-hairline bg-brand-surface/90 px-5 pt-5 pb-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-accent">{g.title}</h2>
          {g.hint && <p className="mt-1 text-xs text-brand-ink-dim">{g.hint}</p>}
          <div className="mt-1">
            {g.keys.map((k) => (
              <ParamRow key={k} k={k} pol={policy[k]} onChange={(p) => update(k, p)} />
            ))}
          </div>
        </section>
      ))}

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-hairline bg-brand-bg/85 p-3 backdrop-blur">
        <button type="button" onClick={save} disabled={pending} className={`${adminBtn} disabled:opacity-60`}>
          {pending ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setPolicy(normalizePolicy(null));
            setStatus({ ok: true, text: "Tudo voltou ao padrão de fábrica (todas as opções liberadas). Clique em Salvar pra valer." });
          }}
          className={adminBtnGhost}
        >
          Voltar tudo ao padrão de fábrica
        </button>
        {status ? (
          <p role="status" className={`text-sm font-semibold ${status.ok ? "text-brand-accent" : "text-red-300"}`}>
            {status.text}
          </p>
        ) : (
          dirty && <p className="text-sm text-amber-300">Alterações não salvas</p>
        )}
      </div>
    </div>
  );
}
