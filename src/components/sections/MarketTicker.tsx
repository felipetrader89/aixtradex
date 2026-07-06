"use client";

import { useEffect, useRef, useState } from "react";

type Quote = { pair: string; price: number };

const FRIENDLY_LABEL: Record<string, string> = {
  "XAU/USD": "OURO",
  "EUR/USD": "EURO",
};

// One "half" of the marquee track must be wider than any realistic viewport,
// otherwise the -50% loop shows blank space before it catches up (the bug
// reported: a moment where the ticker "goes empty" mid-scroll). Repeating the
// quote list guarantees the track always overflows — scaled to the number of
// quotes so a partial response (e.g. only gold, during an upstream outage)
// still produces a wide enough track.
const MIN_ITEMS_PER_HALF = 24;

function formatPrice(pair: string, price: number) {
  if (pair === "XAU/USD") return price.toFixed(2);
  if (pair.endsWith("/JPY")) return price.toFixed(2);
  return price.toFixed(4);
}

export function MarketTicker() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const prevRef = useRef<Record<string, number>>({});
  const [directions, setDirections] = useState<
    Record<string, "up" | "down" | null>
  >({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/quotes", { cache: "no-store" });
        if (!res.ok) return;
        const data: { quotes: Quote[] } = await res.json();
        if (cancelled) return;

        const nextDirections: Record<string, "up" | "down" | null> = {};
        for (const q of data.quotes) {
          const prev = prevRef.current[q.pair];
          nextDirections[q.pair] =
            prev === undefined ? null : q.price > prev ? "up" : q.price < prev ? "down" : null;
          prevRef.current[q.pair] = q.price;
        }
        setDirections(nextDirections);
        setQuotes(data.quotes);
      } catch {
        // keep last known quotes on failure
      }
    }

    load();
    const interval = setInterval(load, 45000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (quotes.length === 0) return null;

  const repeatsPerHalf = Math.max(1, Math.ceil(MIN_ITEMS_PER_HALF / quotes.length));
  const half = Array.from({ length: repeatsPerHalf }, () => quotes).flat();
  const items = [...half, ...half];

  return (
    <div className="ticker-mask overflow-hidden border-y border-brand-hairline bg-brand-surface py-3">
      <div className="ticker-track flex w-max gap-10 whitespace-nowrap">
        {items.map((q, i) => (
          <span key={`${q.pair}-${i}`} className="flex items-center gap-2 px-1 font-mono text-sm">
            {FRIENDLY_LABEL[q.pair] && (
              <span className="text-xs font-semibold uppercase text-brand-accent">
                {FRIENDLY_LABEL[q.pair]}
              </span>
            )}
            <span className="text-brand-ink-dim">{q.pair}</span>
            <span
              className={
                directions[q.pair] === "up"
                  ? "text-brand-accent"
                  : directions[q.pair] === "down"
                    ? "text-rose-400"
                    : "text-brand-ink"
              }
            >
              {formatPrice(q.pair, q.price)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
