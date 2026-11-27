import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// Consistência de cada conta: resultado fechado de cada dia (horário da corretora), a partir das operações que o robô envia (v7.4+).
// Dia = número de dias desde 1970-01-01 no relógio da corretora (broker_gmt em segundos, igual ao plan.ts).
export type DayResult = { d: number; net: number; n: number };

const DAYS_BACK = 400; // ~13 meses: dá pros últimos 12 meses completos

export async function dailyResultsFor(product: string, logins: string[]): Promise<Map<string, DayResult[]>> {
  const out = new Map<string, DayResult[]>();
  if (!logins.length) return out;
  const rows = await db().execute<{ login: string; d: number; net: string; n: number }>(sql`
    select t.login,
           floor((extract(epoch from t.close_at) + coalesce(s.broker_gmt, 0)) / 86400)::int as d,
           sum(t.net)::text as net,
           count(*)::int as n
    from robot_trades t
    left join account_stats s on s.product = t.product and s.login = t.login
    where t.product = ${product}
      and t.login in (${sql.join(logins.map((l) => sql`${l}`), sql`, `)})
      and t.close_at > now() - make_interval(days => ${DAYS_BACK})
    group by 1, 2
    order by 1, 2`);
  for (const r of rows) {
    const list = out.get(r.login) ?? [];
    list.push({ d: Number(r.d), net: Number(r.net), n: Number(r.n) });
    out.set(r.login, list);
  }
  return out;
}

// "Hoje" no relógio da corretora, no mesmo formato.
export const brokerToday = (gmt: number | null | undefined, now = Date.now()) => Math.floor((Math.floor(now / 1000) + (gmt ?? 0)) / 86400);
