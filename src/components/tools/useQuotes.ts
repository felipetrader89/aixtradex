"use client";

import { useEffect, useState } from "react";

export type Quote = { pair: string; price: number };
export type QuotesState = { quotes: Quote[]; updatedAt: string | null; status: "loading" | "ok" | "error" };

// Cotações de referência do próprio site (/api/quotes: ouro pelo gold-api.com, moedas pela Twelve Data, cache de 15 min).
export function useQuotes(refreshMs = 0): QuotesState {
  const [state, setState] = useState<QuotesState>({ quotes: [], updatedAt: null, status: "loading" });
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/quotes", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { quotes: Quote[]; updatedAt: string };
        if (!cancelled) setState({ quotes: data.quotes ?? [], updatedAt: data.updatedAt ?? null, status: "ok" });
      } catch {
        if (!cancelled) setState((s) => ({ ...s, status: s.quotes.length ? "ok" : "error" }));
      }
    }
    load();
    const id = refreshMs > 0 ? setInterval(load, refreshMs) : undefined;
    return () => {
      cancelled = true;
      if (id) clearInterval(id);
    };
  }, [refreshMs]);
  return state;
}
