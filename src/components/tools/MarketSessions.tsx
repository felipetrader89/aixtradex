"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

// Sessões do forex no horário do visitante. Cada sessão é definida no horário LOCAL da cidade (fuso IANA),
// então o horário de verão de cada lugar entra sozinho (Intl), sem diferença fixa em horas.
const SESSIONS = [
  { key: "sydney", tz: "Australia/Sydney", open: 7, close: 16 },
  { key: "tokyo", tz: "Asia/Tokyo", open: 9, close: 18 },
  { key: "london", tz: "Europe/London", open: 8, close: 17 },
  { key: "newyork", tz: "America/New_York", open: 8, close: 17 },
] as const;

type SessionKey = (typeof SESSIONS)[number]["key"];
type Interval = { start: number; end: number };

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function partsIn(tz: string, ms: number) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      weekday: "short",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    fmtCache.set(tz, f);
  }
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return {
    y: Number(p.year),
    m: Number(p.month),
    d: Number(p.day),
    h: Number(p.hour) % 24,
    min: Number(p.minute),
    s: Number(p.second),
    wd: WEEKDAYS.indexOf(p.weekday),
  };
}

// diferença (ms) entre o horário do fuso e o UTC naquele instante
function offsetAt(tz: string, ms: number) {
  const p = partsIn(tz, ms);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(ms / 1000) * 1000;
}

// instante UTC de "y-m-d h:00" no horário local do fuso (resolve a troca de horário de verão)
function zonedToUtc(tz: string, y: number, m: number, d: number, h: number) {
  const guess = Date.UTC(y, m - 1, d, h);
  const o1 = offsetAt(tz, guess);
  let t = guess - o1;
  const o2 = offsetAt(tz, t);
  if (o2 !== o1) t = guess - o2;
  return t;
}

// intervalos da sessão (dias úteis no local da cidade) que tocam a janela [from, to)
function sessionIntervals(s: (typeof SESSIONS)[number], from: number, to: number): Interval[] {
  const out: Interval[] = [];
  const base = partsIn(s.tz, from);
  for (let i = -1; i <= 8; i++) {
    const day = new Date(Date.UTC(base.y, base.m - 1, base.d + i));
    const wd = day.getUTCDay();
    if (wd === 0 || wd === 6) continue;
    const y = day.getUTCFullYear();
    const m = day.getUTCMonth() + 1;
    const d = day.getUTCDate();
    const start = zonedToUtc(s.tz, y, m, d, s.open);
    const end = zonedToUtc(s.tz, y, m, d, s.close);
    if (end > from && start < to) out.push({ start, end });
  }
  return out;
}

// Semana do forex: abre domingo 17h e fecha sexta 17h no horário de Nova York.
function weekendInfo(now: number) {
  const ny = partsIn("America/New_York", now);
  const closed = ny.wd === 6 || (ny.wd === 5 && ny.h >= 17) || (ny.wd === 0 && ny.h < 17);
  if (!closed) return { closed: false as const };
  const add = ny.wd === 5 ? 2 : ny.wd === 6 ? 1 : 0;
  const sunday = new Date(Date.UTC(ny.y, ny.m - 1, ny.d + add));
  return { closed: true as const, reopen: zonedToUtc("America/New_York", sunday.getUTCFullYear(), sunday.getUTCMonth() + 1, sunday.getUTCDate(), 17) };
}

export function MarketSessions() {
  const t = useTranslations("Tools.sessions");
  const locale = useLocale();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const timeFmt = useMemo(() => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }), [locale]);
  const dayFmt = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: "long", hour: "2-digit", minute: "2-digit" }), [locale]);

  const data = useMemo(() => {
    if (now === null) return null;
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const lp = partsIn(zone, now);
    const dayStart = zonedToUtc(zone, lp.y, lp.m, lp.d, 0);
    const dayEnd = zonedToUtc(zone, lp.y, lp.m, lp.d + 1, 0);
    const weekend = weekendInfo(now);
    const rows = SESSIONS.map((s) => {
      const list = sessionIntervals(s, now - DAY, now + 8 * DAY);
      const current = weekend.closed ? undefined : list.find((iv) => iv.start <= now && now < iv.end);
      const next = list.find((iv) => iv.start > now && (!weekend.closed || iv.end > weekend.reopen));
      const today = sessionIntervals(s, dayStart, dayEnd).map((iv) => ({ start: Math.max(iv.start, dayStart), end: Math.min(iv.end, dayEnd) }));
      return { key: s.key as SessionKey, current, next, today };
    });
    // sobreposições de hoje entre sessões
    const overlaps: { a: SessionKey; b: SessionKey; start: number; end: number }[] = [];
    for (let i = 0; i < rows.length; i++)
      for (let j = i + 1; j < rows.length; j++)
        for (const x of rows[i].today)
          for (const y of rows[j].today) {
            const start = Math.max(x.start, y.start);
            const end = Math.min(x.end, y.end);
            if (end - start >= 15 * 60_000) overlaps.push({ a: rows[i].key, b: rows[j].key, start, end });
          }
    overlaps.sort((p, q) => p.start - q.start);
    return { zone, dayStart, dayEnd, weekend, rows, overlaps };
  }, [now]);

  const dur = (ms: number) => {
    const total = Math.max(0, Math.round(ms / 60_000));
    const h = Math.floor(total / 60);
    const m = total % 60;
    return h > 0 ? `${h}h ${String(m).padStart(2, "0")}min` : `${m}min`;
  };

  if (!data || now === null) {
    return (
      <div className="glow-border flex min-h-[520px] items-center justify-center rounded-2xl bg-brand-surface p-6 text-sm text-brand-ink-dim">
        {t("loading")}
      </div>
    );
  }

  const span = data.dayEnd - data.dayStart;
  const pos = (ms: number) => `${(((ms - data.dayStart) / span) * 100).toFixed(3)}%`;

  return (
    <div className="space-y-5">
      <div className="glow-border flex flex-wrap items-end justify-between gap-3 rounded-2xl bg-brand-surface p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">{t("yourTime")}</p>
          <p className="mt-1 font-display text-4xl font-extrabold text-chrome">{timeFmt.format(now)}</p>
        </div>
        <p className="text-sm text-brand-ink-dim">{data.zone.replace(/_/g, " ")}</p>
      </div>

      {data.weekend.closed && (
        <p role="status" className="rounded-2xl border border-brand-chrome-end/25 bg-brand-surface/60 p-4 text-sm text-brand-ink">
          {t("weekend", { time: dayFmt.format(data.weekend.reopen) })}
        </p>
      )}

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {data.rows.map((r) => {
          const open = Boolean(r.current);
          return (
            <li
              key={r.key}
              className={`rounded-2xl bg-brand-surface p-5 ${open ? "border border-brand-accent/50 shadow-[0_0_30px_rgba(51,214,160,0.12)]" : "glow-border"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold text-brand-ink">{t(`cities.${r.key}`)}</h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    open ? "bg-brand-accent/15 text-brand-accent" : "bg-brand-surface-2 text-brand-ink-dim"
                  }`}
                >
                  <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${open ? "mockup-pulse bg-brand-accent" : "bg-brand-ink-dim/60"}`} />
                  {open ? t("open") : t("closed")}
                </span>
              </div>
              <p className="mt-2 text-sm text-brand-ink-dim">
                {r.current
                  ? `${timeFmt.format(r.current.start)} - ${timeFmt.format(r.current.end)} · ${t("closesIn", { time: dur(r.current.end - now) })}`
                  : r.next
                    ? `${dayFmt.format(r.next.start)} · ${t("opensIn", { time: dur(r.next.start - now) })}`
                    : ""}
              </p>
            </li>
          );
        })}
      </ul>

      {/* linha do tempo de hoje (00h-24h no horário do visitante) */}
      <div className="glow-border rounded-2xl bg-brand-surface p-5 sm:p-6">
        <div className="relative space-y-2.5">
          {data.rows.map((r) => (
            <div key={r.key} className="grid grid-cols-[5.5rem_1fr] items-center gap-3 text-xs">
              <span className="truncate text-brand-ink-dim">{t(`cities.${r.key}`)}</span>
              <div className="relative h-5 rounded-md bg-brand-bg">
                {r.today.map((iv, i) => (
                  <span
                    key={i}
                    className={`absolute inset-y-0 rounded-md ${r.current ? "bg-brand-accent" : "bg-brand-accent/35"}`}
                    style={{ left: pos(iv.start), width: `calc(${pos(iv.end)} - ${pos(iv.start)})` }}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="grid grid-cols-[5.5rem_1fr] gap-3 text-[10px] text-brand-ink-dim" aria-hidden="true">
            <span />
            <div className="flex justify-between">
              {["00", "06", "12", "18", "24"].map((h) => (
                <span key={h}>{h}h</span>
              ))}
            </div>
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-[calc(5.5rem+0.75rem)] right-0" aria-hidden="true">
            <span className="absolute inset-y-0 w-0.5 rounded bg-brand-chrome-start/80" style={{ left: pos(now) }} />
          </div>
        </div>

        <h3 className="mt-6 text-sm font-semibold text-brand-ink">{t("overlaps")}</h3>
        {data.overlaps.length ? (
          <ul className="mt-2 grid gap-1.5 text-sm text-brand-ink-dim">
            {data.overlaps.map((o) => (
              <li key={`${o.a}-${o.b}-${o.start}`}>
                <span className="text-brand-ink">
                  {t(`cities.${o.a}`)} + {t(`cities.${o.b}`)}
                </span>
                : {timeFmt.format(o.start)} - {timeFmt.format(o.end)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-brand-ink-dim">{t("noOverlap")}</p>
        )}
        <p className="mt-3 text-xs text-brand-ink-dim">{t("overlapNote")}</p>
      </div>

      <p className="text-xs leading-relaxed text-brand-ink-dim">{t("hoursNote")}</p>
    </div>
  );
}
