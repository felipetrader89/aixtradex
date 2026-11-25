import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { AccountStats } from "@/lib/db/schema";

// Dados da conta que o robô manda junto com a consulta de licença (parâmetros `d` e `ds`):
//   d  = saldo|patrimônio|flutuante|ordens_abertas|pendentes|res_hoje|res_ontem|res_semana|res_mês|
//        saldo_início_dia|saldo_início_semana|saldo_início_mês|alavancagem|autotrading(1/0)|moeda|corretora
//   ds = HMAC-SHA256(LICENSE_SECRET, "conta|nonce|d") - sem a assinatura certa, nada é gravado.

// Conta sem enviar dados há mais que isso aparece como inativa (o robô envia a cada 5 min).
export const STATS_STALE_MS = 15 * 60 * 1000;

const NUM = /^-?\d{1,15}(\.\d{1,2})?$/;
const INT = /^\d{1,9}$/;

type ParsedReport = Omit<AccountStats, "id" | "product" | "login" | "server" | "licenseStatus" | "eaVersion" | "reportedAt" | "brokerGmt">;

export function parseReport(d: string): ParsedReport | null {
  const p = d.split("|");
  if (p.length !== 16) return null;
  const nums = p.slice(0, 12);
  if (![0, 1, 2, 5, 6, 7, 8, 9, 10, 11].every((i) => NUM.test(nums[i])) || !INT.test(p[3]) || !INT.test(p[4])) return null;
  if (!INT.test(p[12]) || !/^[01]$/.test(p[13])) return null;
  return {
    balance: p[0],
    equity: p[1],
    floating: p[2],
    openOrders: Number(p[3]),
    pendingOrders: Number(p[4]),
    resultToday: p[5],
    resultYesterday: p[6],
    resultWeek: p[7],
    resultMonth: p[8],
    balanceDayStart: p[9],
    balanceWeekStart: p[10],
    balanceMonthStart: p[11],
    leverage: Number(p[12]),
    tradeAllowed: p[13] === "1",
    currency: p[14].trim().slice(0, 8) || null,
    company: p[15].trim().slice(0, 80) || null,
  };
}

export function validReportSignature(secret: string, account: string, nonce: string, d: string, ds: string) {
  const expected = createHmac("sha256", secret).update(`${account}|${nonce}|${d}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(ds.toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

// Grava (ou atualiza) os dados da conta - só de conta que está cadastrada em alguma licença.
export async function saveReport(input: {
  product: string;
  login: string;
  report: ParsedReport;
  server: string | null;
  eaVersion: string | null;
  licenseStatus: string;
}) {
  if (input.licenseStatus === "NOT_FOUND") return;
  const values = {
    ...input.report,
    product: input.product,
    login: input.login,
    server: input.server?.slice(0, 64) ?? null,
    eaVersion: input.eaVersion?.slice(0, 32) ?? null,
    licenseStatus: input.licenseStatus,
    reportedAt: new Date(),
  };
  await db()
    .insert(schema.accountStats)
    .values(values)
    .onConflictDoUpdate({ target: [schema.accountStats.product, schema.accountStats.login], set: values });
}

export async function statsFor(product: string, logins: string[]) {
  if (!logins.length) return new Map<string, AccountStats>();
  const rows = await db()
    .select()
    .from(schema.accountStats)
    .where(and(eq(schema.accountStats.product, product), inArray(schema.accountStats.login, logins)));
  return new Map(rows.map((r) => [r.login, r]));
}

export type AccountLiveState = "running" | "autotradingOff" | "inactive" | "waiting";

export function liveState(stats: AccountStats | undefined, now = new Date()): AccountLiveState {
  if (!stats) return "waiting";
  if (now.getTime() - stats.reportedAt.getTime() > STATS_STALE_MS) return "inactive";
  return stats.tradeAllowed ? "running" : "autotradingOff";
}

// Ordem das listas de contas: primeiro as que estão operando (com dados), depois inativas e por último as sem dados;
// dentro de cada grupo, o melhor resultado do mês em cima (positivas acima das negativas), desempate pelo de hoje.
const STATE_ORDER: Record<AccountLiveState, number> = { running: 0, autotradingOff: 0, inactive: 1, waiting: 2 };
export function compareAccounts(
  a: { state: AccountLiveState; stats?: AccountStats },
  b: { state: AccountLiveState; stats?: AccountStats }
) {
  return (
    STATE_ORDER[a.state] - STATE_ORDER[b.state] ||
    Number(b.stats?.resultMonth ?? 0) - Number(a.stats?.resultMonth ?? 0) ||
    Number(b.stats?.resultToday ?? 0) - Number(a.stats?.resultToday ?? 0)
  );
}
