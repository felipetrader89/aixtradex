"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GrowthMode, GrowthPoint } from "@/lib/growth";

// Gráfico do saldo ao longo do tempo: a modalidade escolhida em linha cheia (com área), a outra tracejada pra comparar
// e o total depositado em linha fina. Um eixo só (tudo em dólar). Passar o mouse/dedo mostra os valores do dia.
type Series = { key: "simple" | "compound" | "deposited"; label: string };

const H = 260;
const PAD = { top: 12, right: 16, bottom: 26, left: 74 };
const TIP_W = 230;
const MAX_POINTS = 360;

export function GrowthChart({
  points,
  mode,
  labels,
  formatMoney,
  formatAxisMoney,
  formatDay,
}: {
  points: GrowthPoint[];
  mode: GrowthMode;
  labels: { simple: string; compound: string; deposited: string; day: string };
  formatMoney: (v: number) => string;
  formatAxisMoney: (v: number) => string;
  formatDay: (day: number) => string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const other: GrowthMode = mode === "compound" ? "simple" : "compound";
  const series: Series[] = [
    { key: mode, label: labels[mode] },
    { key: other, label: labels[other] },
    { key: "deposited", label: labels.deposited },
  ];
  const hasDeposits = points.some((p) => p.deposited !== points[0].deposited);

  const data = useMemo(() => {
    if (points.length <= MAX_POINTS) return points;
    const step = (points.length - 1) / (MAX_POINTS - 1);
    return Array.from({ length: MAX_POINTS }, (_, i) => points[Math.round(i * step)]);
  }, [points]);

  const plotW = w - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const maxDay = data[data.length - 1]?.day || 1;
  const maxY = Math.max(1, ...data.map((p) => Math.max(p.simple, p.compound)));
  const yTicks = niceTicks(maxY, 4);
  const top = yTicks[yTicks.length - 1] || maxY;
  const x = (day: number) => PAD.left + (day / maxDay) * plotW;
  const y = (v: number) => PAD.top + plotH - (Math.min(v, top) / top) * plotH;
  const path = (k: Series["key"]) => data.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)},${y(p[k]).toFixed(1)}`).join("");
  const area = `${path(mode)}L${x(maxDay).toFixed(1)},${y(0)}L${x(0)},${y(0)}Z`;
  // marcas do eixo do tempo em dias, meses ou anos inteiros (mesma regra do formatDay da calculadora)
  const tickUnit = maxDay <= 31 ? 1 : maxDay <= 252 ? 21 : 252;
  const totalUnits = maxDay / tickUnit;
  const tickStep = [1, 2, 3, 5, 10, 20, 25, 50].find((s) => totalUnits / s <= 5) ?? Math.ceil(totalUnits / 5);
  const xTicks = Array.from({ length: Math.floor(totalUnits / tickStep) + 1 }, (_, i) => i * tickStep * tickUnit);

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const rel = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
    const day = rel * maxDay;
    let best = 0;
    for (let i = 1; i < data.length; i++) if (Math.abs(data[i].day - day) < Math.abs(data[best].day - day)) best = i;
    setHover(best);
  }

  const hp = hover != null ? data[hover] : null;
  const tipLeft = hp ? Math.min(Math.max(x(hp.day) - TIP_W / 2, 0), w - TIP_W) : 0;

  return (
    <figure className="m-0">
      <figcaption className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-brand-ink-dim">
        {series
          .filter((s) => s.key !== "deposited" || hasDeposits)
          .map((s) => (
            <span key={s.key} className="inline-flex items-center gap-2">
              <Swatch k={s.key} main={s.key === mode} />
              {s.label}
            </span>
          ))}
      </figcaption>
      <div ref={wrap} className="relative w-full">
        <svg width={w} height={H} role="img" aria-label={labels[mode]} className="block select-none">
          <defs>
            <linearGradient id="growth-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand-accent)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--color-brand-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={w - PAD.right} y1={y(v)} y2={y(v)} stroke="rgba(143,160,172,0.14)" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-brand-ink-dim text-[10px]">
                {formatAxisMoney(v)}
              </text>
            </g>
          ))}
          {xTicks.map((d) => (
            <text key={d} x={x(d)} y={H - 8} textAnchor={d === 0 ? "start" : x(d) > w - PAD.right - 20 ? "end" : "middle"} className="fill-brand-ink-dim text-[10px]">
              {formatDay(d)}
            </text>
          ))}
          <path d={area} fill="url(#growth-area)" />
          {hasDeposits && <path d={path("deposited")} fill="none" stroke="rgba(143,160,172,0.55)" strokeWidth={1.5} />}
          <path d={path(other)} fill="none" stroke="var(--color-brand-chrome-end)" strokeOpacity={0.7} strokeWidth={2} strokeDasharray="5 4" />
          <path d={path(mode)} fill="none" stroke="var(--color-brand-accent)" strokeWidth={2} strokeLinejoin="round" />
          {hp && (
            <g pointerEvents="none">
              <line x1={x(hp.day)} x2={x(hp.day)} y1={PAD.top} y2={PAD.top + plotH} stroke="rgba(215,224,230,0.35)" strokeWidth={1} />
              <circle cx={x(hp.day)} cy={y(hp[other])} r={4} fill="var(--color-brand-chrome-end)" stroke="var(--color-brand-surface)" strokeWidth={2} />
              <circle cx={x(hp.day)} cy={y(hp[mode])} r={4.5} fill="var(--color-brand-accent)" stroke="var(--color-brand-surface)" strokeWidth={2} />
            </g>
          )}
          <rect
            x={PAD.left}
            y={PAD.top}
            width={plotW}
            height={plotH}
            fill="transparent"
            style={{ touchAction: "pan-y" }}
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
        {hp && (
          <div
            className="pointer-events-none absolute top-1 rounded-xl border border-brand-hairline bg-brand-bg/95 px-3 py-2 text-xs shadow-lg"
            style={{ left: tipLeft, width: TIP_W }}
          >
            <p className="mb-1 font-semibold text-brand-ink">
              {labels.day.replace("{n}", String(hp.day))}
            </p>
            {series
              .filter((s) => s.key !== "deposited" || hasDeposits)
              .map((s) => (
                <p key={s.key} className="flex items-center justify-between gap-2 text-brand-ink-dim">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <Swatch k={s.key} main={s.key === mode} />
                    {s.label}
                  </span>
                  <span className="whitespace-nowrap font-mono text-brand-ink">{formatMoney(hp[s.key])}</span>
                </p>
              ))}
          </div>
        )}
      </div>
    </figure>
  );
}

function Swatch({ k, main }: { k: Series["key"]; main: boolean }) {
  if (k === "deposited") return <span aria-hidden className="inline-block h-px w-4 bg-brand-ink-dim" />;
  return main ? (
    <span aria-hidden className="inline-block h-0.5 w-4 rounded bg-brand-accent" />
  ) : (
    <span aria-hidden className="inline-block w-4 border-t-2 border-dashed border-brand-chrome-end/70" />
  );
}

// Marcas "redondas" do eixo (1, 2, 2,5 ou 5 × potência de 10).
function niceTicks(max: number, count: number) {
  const raw = max / count;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.999; v += step) ticks.push(v);
  return ticks;
}
