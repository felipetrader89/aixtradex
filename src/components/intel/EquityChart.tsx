"use client";

import { useEffect, useRef, useState } from "react";

// Curva do resultado acumulado (uma série: sem legenda, o título dá o nome). Linha 2px, grade discreta, linha do zero,
// cruz + caixinha ao passar o mouse/dedo. A tabela por par logo abaixo é a versão em texto.
export function EquityChart({
  points,
  currency,
  locale,
  label,
}: {
  points: { t: number; v: number }[];
  currency: string;
  locale: string;
  label: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (points.length < 2) return null;
  const h = 200;
  const pad = { l: 8, r: 8, t: 12, b: 22 };
  const vals = points.map((p) => p.v);
  const lo = Math.min(0, ...vals);
  const hi = Math.max(0, ...vals);
  const span = hi - lo || 1;
  const x = (i: number) => pad.l + (i / (points.length - 1)) * (w - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - lo) / span) * (h - pad.t - pad.b);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const money = (v: number) => `${v.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeZone: "UTC" }); // igual no servidor e no navegador (sem erro de hidratação)
  const last = points[points.length - 1];

  const pick = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    const i = Math.round(((clientX - r.left - pad.l) / (w - pad.l - pad.r)) * (points.length - 1));
    setHover(Math.min(points.length - 1, Math.max(0, i)));
  };
  const hp = hover !== null ? points[hover] : null;

  return (
    <div ref={box} className="relative w-full select-none" onMouseLeave={() => setHover(null)}>
      <svg
        width={w}
        height={h}
        role="img"
        aria-label={`${label}: ${money(last.v)}`}
        onMouseMove={(e) => pick(e.clientX)}
        onTouchMove={(e) => pick(e.touches[0].clientX)}
        onTouchEnd={() => setHover(null)}
        className="block"
      >
        <g className="text-brand-hairline" stroke="currentColor" strokeWidth={1}>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={pad.l} x2={w - pad.r} y1={pad.t + f * (h - pad.t - pad.b)} y2={pad.t + f * (h - pad.t - pad.b)} opacity={0.5} />
          ))}
        </g>
        <line x1={pad.l} x2={w - pad.r} y1={y(0)} y2={y(0)} className="text-brand-ink-dim" stroke="currentColor" strokeWidth={1} strokeDasharray="3 3" />
        <path d={d} fill="none" className="text-brand-accent" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hp && hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={h - pad.b} className="text-brand-ink-dim" stroke="currentColor" strokeWidth={1} />
            <circle cx={x(hover)} cy={y(hp.v)} r={4.5} className="text-brand-accent" fill="currentColor" stroke="var(--color-brand-surface, #0b1220)" strokeWidth={2} />
          </g>
        )}
        <text x={pad.l} y={h - 6} className="fill-brand-ink-dim text-[10px]">
          {date.format(points[0].t)}
        </text>
        <text x={w - pad.r} y={h - 6} textAnchor="end" className="fill-brand-ink-dim text-[10px]">
          {date.format(last.t)}
        </text>
      </svg>
      {hp && hover !== null && (
        <div
          className="pointer-events-none absolute top-1 rounded-lg border border-brand-hairline bg-brand-bg/95 px-2.5 py-1.5 text-xs shadow"
          style={{ left: Math.min(Math.max(x(hover) - 70, 0), w - 150) }}
        >
          <p className="text-brand-ink-dim">{date.format(hp.t)}</p>
          <p className="font-semibold text-brand-ink">{money(hp.v)}</p>
        </div>
      )}
    </div>
  );
}
