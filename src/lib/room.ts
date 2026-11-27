import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { brokerToday } from "@/lib/consistency";
import { currentBias } from "@/lib/market-bias";

// Sala de Operações: um analista por par que a conta opera, com o resultado de hoje e dos últimos 7 dias,
// o viés do dia do trader sênior (IA) e o estado do robô. Tudo com dados reais que o robô manda.

export type RoomPair = {
  symbol: string;
  active: boolean; // ligado na configuração da conta
  today: number;
  todayOps: number;
  todayWins: number;
  week: number;
  weekOps: number;
  goalPct: number; // meta do par (% do saldo do início do dia; 0 = sem meta)
  bias: "buy" | "sell" | "both" | "none" | null;
  confidence: number | null;
  lastAt: Date | null;
};

type StoredParams = { pairs?: Record<string, { goalPct?: number }> };

export async function roomPairs(product: string, login: string, gmt: number | null | undefined): Promise<RoomPair[]> {
  const today = brokerToday(gmt);
  const off = gmt ?? 0;
  const [[cfg], rows] = await Promise.all([
    db()
      .select({ symbols: schema.robotSettings.symbols, params: schema.robotSettings.params })
      .from(schema.robotSettings)
      .where(and(eq(schema.robotSettings.product, product), eq(schema.robotSettings.login, login)))
      .limit(1),
    db().execute<{ symbol: string; today: string; today_ops: number; today_wins: number; week: string; week_ops: number; last_at: string | null }>(sql`
      select symbol,
             coalesce(sum(net) filter (where d = ${today}), 0)::text as today,
             count(*) filter (where d = ${today})::int as today_ops,
             count(*) filter (where d = ${today} and net > 0)::int as today_wins,
             sum(net)::text as week,
             count(*)::int as week_ops,
             max(close_at)::text as last_at
      from (
        select symbol, net, close_at, floor((extract(epoch from close_at) + ${off}) / 86400)::int as d
        from robot_trades
        where product = ${product} and login = ${login} and close_at > now() - interval '8 days'
      ) t
      where d > ${today - 7}
      group by symbol`),
  ]);
  const params = (cfg?.params ?? {}) as StoredParams;
  const active = new Set(cfg?.symbols ?? []);
  const symbols = [...new Set([...(cfg?.symbols ?? []), ...rows.map((r) => r.symbol)])];
  const bias = await currentBias(symbols);
  const bySym = new Map(rows.map((r) => [r.symbol, r]));
  return symbols
    .map((symbol) => {
      const r = bySym.get(symbol);
      const b = bias.get(symbol);
      return {
        symbol,
        active: active.has(symbol),
        today: Number(r?.today ?? 0),
        todayOps: r?.today_ops ?? 0,
        todayWins: r?.today_wins ?? 0,
        week: Number(r?.week ?? 0),
        weekOps: r?.week_ops ?? 0,
        goalPct: Number(params.pairs?.[symbol]?.goalPct ?? 0),
        bias: (b?.bias as RoomPair["bias"]) ?? null,
        confidence: b?.confidence ?? null,
        lastAt: r?.last_at ? new Date(r.last_at) : null,
      };
    })
    .sort((a, b) => Number(b.active) - Number(a.active) || b.todayOps - a.todayOps || a.symbol.localeCompare(b.symbol));
}
