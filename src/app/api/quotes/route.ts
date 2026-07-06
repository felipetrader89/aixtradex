import { NextResponse } from "next/server";

export const revalidate = 900;

type Quote = { pair: string; price: number };

const FX_PAIRS = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CHF"];

// Upstream APIs (free tiers) occasionally fail or rate-limit. Keeping the last
// good response in memory means a transient failure degrades to slightly
// stale numbers instead of quotes silently disappearing from the ticker.
let goldCache: Quote | null = null;
let fxCache: Quote[] = [];

async function fetchGold(): Promise<Quote | null> {
  try {
    const res = await fetch("https://api.gold-api.com/price/XAU", {
      next: { revalidate: 900 },
    });
    if (!res.ok) return goldCache;
    const data = (await res.json()) as { price?: number };
    if (typeof data.price !== "number") return goldCache;
    goldCache = { pair: "XAU/USD", price: data.price };
    return goldCache;
  } catch {
    return goldCache;
  }
}

async function fetchFx(): Promise<Quote[]> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return fxCache;

  try {
    const symbols = encodeURIComponent(FX_PAIRS.join(","));
    const res = await fetch(
      `https://api.twelvedata.com/price?symbol=${symbols}&apikey=${apiKey}`,
      { next: { revalidate: 900 } }
    );
    if (!res.ok) return fxCache;
    const data = (await res.json()) as Record<string, { price?: string } | undefined>;

    const quotes = FX_PAIRS.flatMap((pair) => {
      const raw = data[pair]?.price;
      const price = raw ? Number(raw) : NaN;
      if (Number.isNaN(price)) return [];
      return [{ pair, price }];
    });

    if (quotes.length > 0) fxCache = quotes;
    return quotes.length > 0 ? quotes : fxCache;
  } catch {
    return fxCache;
  }
}

export async function GET() {
  const [gold, fx] = await Promise.all([fetchGold(), fetchFx()]);
  const quotes: Quote[] = [...(gold ? [gold] : []), ...fx];

  return NextResponse.json(
    { quotes, updatedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }
  );
}
