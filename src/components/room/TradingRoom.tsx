import { useLocale, useTranslations } from "next-intl";
import type { RoomPair } from "@/lib/room";

// Sala de Operações (estilo jogo 2D): cada par tem um analista na mesa dele, olhando o gráfico.
// Os analistas que estão trabalhando levam o caso até a Mesa do Trader Sênior (IA, viés do dia) e voltam pro par.
// O estado de cada um vem dos dados reais: robô ligado, meta do par batida, Mesa mandando esperar, resultado do dia.

export type DeskState = "analyzing" | "goal" | "standby" | "off" | "offline";

const SHIRTS = ["#3b82f6", "#a855f7", "#f59e0b", "#ec4899", "#14b8a6", "#6366f1", "#ef4444", "#84cc16", "#06b6d4", "#f97316", "#8b5cf6", "#22c55e"];
const shirtOf = (s: string) => SHIRTS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % SHIRTS.length];

export function deskState(p: RoomPair, online: boolean, dayStart: number): DeskState {
  if (!online) return "offline";
  if (!p.active) return "off";
  if (p.goalPct > 0 && dayStart > 0 && p.today >= (dayStart * p.goalPct) / 100) return "goal";
  if (p.bias === "none") return "standby";
  return "analyzing";
}

// Analista sentado na mesa, de lado, olhando o monitor. viewBox 0 0 200 120.
function DeskScene({ state, shirt }: { state: DeskState; shirt: string }) {
  const working = state === "analyzing";
  const screen = state === "offline" || state === "off" ? "#0b1929" : state === "goal" ? "#0e6b52" : "#0f2a3d";
  const candles = [
    [0, 8, 1],
    [1, 12, 0],
    [2, 6, 1],
    [3, 14, 1],
    [4, 9, 0],
    [5, 16, 1],
    [6, 11, 1],
  ];
  return (
    <svg viewBox="0 0 200 102" className="h-auto w-full" aria-hidden="true">
      {/* chão e parede */}
      <rect x="0" y="96" width="200" height="6" fill="#0d1e30" />
      <rect x="0" y="95" width="200" height="1.5" fill="rgba(51,214,160,0.18)" />
      {/* mesa */}
      <rect x="88" y="70" width="100" height="6" rx="2" fill="#2a3f55" />
      <rect x="96" y="76" width="5" height="20" fill="#22364a" />
      <rect x="175" y="76" width="5" height="20" fill="#22364a" />
      {/* monitor */}
      <rect x="128" y="28" width="56" height="38" rx="3" fill="#1f3348" />
      <rect x="131" y="31" width="50" height="32" rx="1.5" fill={screen} className={working ? "room-screen" : undefined} />
      {state !== "offline" && state !== "off" && (
        <g>
          {candles.map(([i, h, up]) => (
            <g key={i} className={working ? "room-candle" : undefined} style={{ animationDelay: `${i * 0.25}s` }}>
              <rect x={135 + i * 6.5} y={54 - h} width="3.5" height={h * 0.7} rx="0.5" fill={up ? "#33d6a0" : "#f87171"} />
              <rect x={136.5 + i * 6.5} y={52 - h} width="0.6" height={h * 0.7 + 4} fill={up ? "#33d6a0" : "#f87171"} />
            </g>
          ))}
          {working && <rect x="131" y="31" width="2" height="32" fill="rgba(51,214,160,0.55)" className="room-scan" />}
        </g>
      )}
      {state === "goal" && (
        <path d="M146 47l6 6 13-13" fill="none" stroke="#d7fff0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      )}
      <rect x="152" y="66" width="8" height="4" fill="#1f3348" />
      {/* teclado */}
      <rect x="108" y="67" width="20" height="3" rx="1" fill="#3a5068" />
      {/* cadeira */}
      <rect x="52" y="62" width="30" height="5" rx="2" fill="#1c2f44" />
      <rect x="50" y="34" width="6" height="32" rx="3" fill="#1c2f44" />
      <rect x="64" y="67" width="4" height="22" fill="#16273a" />
      <rect x="54" y="89" width="24" height="3" rx="1.5" fill="#16273a" />
      {/* analista */}
      <g className={state === "goal" ? "room-cheer" : state === "analyzing" ? "room-breathe" : undefined}>
        {/* pernas */}
        <path d="M62 62 L90 62 L92 88" fill="none" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="88" y="86" width="12" height="4" rx="2" fill="#0f172a" />
        {/* corpo */}
        <path d="M58 64 C58 46 62 38 72 38 C80 38 84 46 84 64 Z" fill={shirt} />
        {/* braço */}
        {state === "goal" ? (
          <path d="M76 44 L84 26" stroke={shirt} strokeWidth="6" strokeLinecap="round" />
        ) : state === "standby" || state === "off" || state === "offline" ? (
          <path d="M76 46 L74 58" stroke={shirt} strokeWidth="6" strokeLinecap="round" />
        ) : (
          <path d="M76 46 L98 56 L110 64" fill="none" stroke={shirt} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="room-type" />
        )}
        {/* cabeça */}
        <circle cx="72" cy="27" r="10" fill="#f1c9a5" />
        <path d="M62 25 C62 15 82 13 83 23 C78 20 70 20 62 25 Z" fill="#2b2118" />
        {/* olho olhando o monitor (ou fechado dormindo) */}
        {state === "offline" || state === "off" ? (
          <path d="M76 28 h4" stroke="#2b2118" strokeWidth="1.3" strokeLinecap="round" />
        ) : (
          <circle cx="78" cy="27" r="1.4" fill="#1b1b1b" className={working ? "room-eye" : undefined} />
        )}
      </g>
      {/* balões */}
      {(state === "offline" || state === "off") && (
        <g className="room-zzz" fill="#8fa0ac" fontSize="9" fontWeight="700" fontFamily="ui-sans-serif, system-ui">
          <text x="86" y="16">z</text>
          <text x="93" y="9" fontSize="11">
            z
          </text>
        </g>
      )}
      {state === "standby" && (
        <g>
          <rect x="84" y="4" width="34" height="16" rx="5" fill="#182b40" stroke="rgba(51,214,160,0.3)" />
          <text x="101" y="15" textAnchor="middle" fill="#d7e0e6" fontSize="9" fontWeight="700" fontFamily="ui-sans-serif, system-ui">
            ...
          </text>
        </g>
      )}
      {state === "goal" && (
        <g className="room-star" fill="#facc15">
          <path d="M98 10l2 4.5 5 .5-3.8 3.3 1.1 4.9L98 20.6l-4.3 2.6 1.1-4.9L91 15l5-.5Z" />
        </g>
      )}
    </svg>
  );
}

// Trader sênior na mesa central, com dois monitores. viewBox 0 0 260 110.
function SeniorScene() {
  return (
    <svg viewBox="0 0 260 96" className="h-auto w-full max-w-md" aria-hidden="true">
      <rect x="0" y="90" width="260" height="6" fill="#0d1e30" />
      <rect x="0" y="89" width="260" height="1.5" fill="rgba(51,214,160,0.18)" />
      {/* trader sênior (de frente, atrás da mesa) */}
      <g className="room-breathe">
        <path d="M106 64 C106 44 114 38 130 38 C146 38 154 44 154 64 Z" fill="#1e293b" />
        <path d="M126 40 L130 58 L134 40 Z" fill="#e2e8f0" />
        <path d="M129 42 L130 56 L131 42 Z" fill="#33d6a0" />
        <circle cx="130" cy="26" r="11" fill="#e9bf9a" />
        <path d="M119 24 C119 12 141 12 141 24 C137 19 123 19 119 24 Z" fill="#9ca3af" />
        <circle cx="126" cy="27" r="1.4" fill="#1b1b1b" className="room-eye" />
        <circle cx="134" cy="27" r="1.4" fill="#1b1b1b" className="room-eye" />
        <path d="M120 26 h7 M133 26 h7" stroke="#cbd5e1" strokeWidth="0.8" />
        <path d="M108 52 L96 62 M152 52 L164 62" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
      </g>
      <rect x="40" y="64" width="180" height="7" rx="2" fill="#2a3f55" />
      <rect x="50" y="71" width="6" height="19" fill="#22364a" />
      <rect x="204" y="71" width="6" height="19" fill="#22364a" />
      {[58, 160].map((x, i) => (
        <g key={x}>
          <rect x={x} y="22" width="44" height="34" rx="3" fill="#1f3348" />
          <rect x={x + 3} y="25" width="38" height="28" rx="1.5" fill="#0f2a3d" className="room-screen" style={{ animationDelay: `${i * 0.8}s` }} />
          <path
            d={i ? `M${x + 6} 46 L${x + 14} 40 L${x + 22} 43 L${x + 30} 33 L${x + 38} 36` : `M${x + 6} 34 L${x + 14} 38 L${x + 22} 35 L${x + 30} 44 L${x + 38} 42`}
            fill="none"
            stroke={i ? "#33d6a0" : "#f87171"}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x={x + 19} y="56" width="6" height="8" fill="#1f3348" />
        </g>
      ))}
      {/* café */}
      <rect x="182" y="56" width="8" height="8" rx="1.5" fill="#e2e8f0" />
      <path d="M184 52 q1 -3 0 -5 M187 52 q1 -3 0 -5" stroke="#8fa0ac" strokeWidth="0.8" fill="none" className="room-steam" />
    </svg>
  );
}

// Corredor: os analistas que estão trabalhando levam o caso até a Mesa e voltam (cada um no seu tempo).
function Corridor({ symbols }: { symbols: { symbol: string; shirt: string }[] }) {
  return (
    <div className="relative h-16 overflow-hidden rounded-lg border border-brand-hairline bg-[#0d1e30]" aria-hidden="true">
      <div className="absolute inset-x-0 bottom-3 h-px bg-brand-accent/15" />
      <div className="absolute bottom-1 right-2 rounded bg-brand-surface-2 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-accent">Mesa</div>
      {symbols.slice(0, 8).map((s, i) => (
        <div key={s.symbol} className="room-walker absolute bottom-3" style={{ animationDelay: `${i * -2.3}s`, animationDuration: `${14 + (i % 3) * 3}s` }}>
          <div className="room-walker-flip flex flex-col items-center" style={{ animationDelay: `${i * -2.3}s`, animationDuration: `${14 + (i % 3) * 3}s` }}>
            <span className="mb-0.5 rounded bg-brand-surface px-1 text-[9px] font-bold leading-tight text-brand-ink">{s.symbol}</span>
            <svg viewBox="0 0 20 30" className="h-9 w-6">
              <circle cx="10" cy="5" r="4" fill="#f1c9a5" />
              <rect x="5" y="9" width="10" height="11" rx="3" fill={s.shirt} />
              <rect x="13" y="12" width="6" height="7" rx="1" fill="#e2e8f0" />
              <g className="room-legs">
                <rect x="6" y="19" width="3" height="10" rx="1.5" fill="#1e293b" />
                <rect x="11" y="19" width="3" height="10" rx="1.5" fill="#1e293b" />
              </g>
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}

const BIAS_TONE: Record<string, string> = {
  buy: "bg-brand-accent/15 text-brand-accent",
  sell: "bg-red-500/15 text-red-300",
  both: "bg-sky-400/15 text-sky-300",
  none: "bg-orange-400/15 text-orange-300",
};
const STATE_TONE: Record<DeskState, string> = {
  analyzing: "bg-brand-accent/15 text-brand-accent",
  goal: "bg-yellow-400/15 text-yellow-300",
  standby: "bg-orange-400/15 text-orange-300",
  off: "bg-brand-surface-2 text-brand-ink-dim",
  offline: "bg-brand-surface-2 text-brand-ink-dim",
};

export function TradingRoom({
  pairs,
  online,
  dayStart,
  currency,
}: {
  pairs: RoomPair[];
  online: boolean;
  dayStart: number;
  currency: string | null;
}) {
  const t = useTranslations("Portal.room");
  const locale = useLocale();
  const nf = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (v: number) => `${v < 0 ? "-" : v > 0 ? "+" : ""}${nf.format(Math.abs(v))}${currency ? ` ${currency}` : ""}`;
  const tone = (v: number) => (v > 0 ? "text-brand-accent" : v < 0 ? "text-red-400" : "text-brand-ink-dim");
  const desks = pairs.map((p) => ({ p, state: deskState(p, online, dayStart), shirt: shirtOf(p.symbol) }));
  const walkers = desks.filter((d) => d.state === "analyzing").map((d) => ({ symbol: d.p.symbol, shirt: d.shirt }));
  const withBias = pairs.filter((p) => p.active && p.bias);

  return (
    <div className="flex flex-col gap-5">
      {/* Mesa do Trader Sênior */}
      <section className="panel-card glow-border rounded-2xl bg-brand-surface p-4 sm:p-5">
        <div className="grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-accent">{t("senior.eyebrow")}</p>
            <h2 className="mt-1 font-display text-lg font-bold text-brand-ink">{t("senior.title")}</h2>
            <p className="mt-1 text-xs text-brand-ink-dim">{t("senior.body")}</p>
            {withBias.length ? (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {withBias.map((p) => (
                  <li key={p.symbol} className={`rounded-md px-2 py-1 text-[11px] font-semibold ${BIAS_TONE[p.bias!]}`}>
                    {p.symbol} · {t(`bias.${p.bias}`)}
                    {p.confidence != null && <span className="ml-1 font-normal opacity-80">{p.confidence}%</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-brand-ink-dim">{t("senior.noBias")}</p>
            )}
          </div>
          <div className="flex flex-col items-center gap-2">
            <SeniorScene />
            {online && walkers.length > 0 && (
              <div className="w-full">
                <Corridor symbols={walkers} />
              </div>
            )}
          </div>
        </div>
      </section>

      {!online && <p className="rounded-xl border border-orange-400/30 bg-orange-400/10 px-4 py-3 text-sm text-orange-200">{t("offline")}</p>}

      {/* Mesas dos pares */}
      {desks.length ? (
        <ul className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {desks.map(({ p, state, shirt }) => (
            <li key={p.symbol} className={`panel-card rounded-2xl border border-brand-hairline bg-brand-surface p-3 ${state === "off" ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="font-mono text-sm font-bold text-brand-ink">{p.symbol}</span>
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATE_TONE[state]}`}>{t(`state.${state}`)}</span>
              </div>
              <div className="mt-1 overflow-hidden rounded-xl bg-[#10243a]">
                <DeskScene state={state} shirt={shirt} />
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-2 px-1 text-xs">
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-brand-ink-dim">{t("today")}</dt>
                  <dd className={`font-mono text-sm font-bold ${tone(p.today)}`}>{p.todayOps ? money(p.today) : "-"}</dd>
                  <dd className="text-[10px] text-brand-ink-dim">{t("ops", { count: p.todayOps, wins: p.todayWins })}</dd>
                </div>
                <div className="text-right">
                  <dt className="text-[10px] uppercase tracking-wide text-brand-ink-dim">{t("week")}</dt>
                  <dd className={`font-mono text-sm font-bold ${tone(p.week)}`}>{p.weekOps ? money(p.week) : "-"}</dd>
                  <dd className="text-[10px] text-brand-ink-dim">{t("opsShort", { count: p.weekOps })}</dd>
                </div>
              </dl>
              {p.active && p.bias && (
                <p className="mt-2 px-1 text-[11px] text-brand-ink-dim">
                  {t("mesaSays")} <span className={`rounded px-1.5 py-0.5 font-semibold ${BIAS_TONE[p.bias]}`}>{t(`bias.${p.bias}`)}</span>
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-brand-ink-dim">{t("empty")}</p>
      )}
      <p className="text-[11px] text-brand-ink-dim">{t("legend")}</p>
    </div>
  );
}
