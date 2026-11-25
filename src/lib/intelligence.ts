import "server-only";
import { and, asc, desc, eq, gte, inArray, lt, or, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { DEFAULT_PAIR, ROBOT_SYMBOLS, RSI_TIMEFRAMES, SYMBOL_KEY, type PairParams } from "@/lib/robot-options";
import { parseScan, type ScanResult, type TradeLite } from "@/lib/intel-stats";

// Ai X Intelligence (robô v7+): operações fechadas que o robô manda, histórico das configurações e estudos de velas.
// O robô fala só com /api/license/check (o único caminho aberto em license.aixtradex.com):
//   POST ?trades=1  → operações fechadas (ver parseTrades)
//   POST ?scan=<id> → "start" ou o resultado do estudo
//   GET  ?cfgonly=1&sc=1 → além da configuração, a linha "SCAN|id|pedido|assinatura" quando tem estudo pendente.

export const baseSymbol = (raw: string) => {
  const up = raw.toUpperCase();
  return (ROBOT_SYMBOLS as readonly string[]).find((s) => up.includes(s)) ?? up.replace(/[^A-Z0-9]/g, "").slice(0, 16);
};

const registered = async (product: string, login: string) =>
  (
    await db()
      .select({ id: schema.licenseAccounts.id })
      .from(schema.licenseAccounts)
      .where(and(eq(schema.licenseAccounts.product, product), eq(schema.licenseAccounts.login, login)))
      .limit(1)
  ).length > 0;

// ------------------------------------------------------------------ histórico da configuração

export async function recordConfigHistory(product: string, login: string, params: unknown) {
  await db().insert(schema.robotConfigHistory).values({ product, login, params });
}

type StoredConfig = { pairs?: Record<string, Partial<PairParams>> };

// ------------------------------------------------------------------ operações fechadas

type ParsedTrade = {
  ticket: number;
  brokerSymbol: string;
  side: number;
  lots: number;
  open: number;
  close: number;
  openPrice: number;
  closePrice: number;
  profit: number;
  swap: number;
  commission: number;
  comment: string;
  key: string | null; // v7.1: nome do ativo no portal que o robô mandou (sem prefixo/sufixo)
};

// 1ª linha: gmt=<fuso da corretora em s>;v=<versão>;magic=<n>. Depois uma operação por linha:
// ticket;símbolo;tipo;lotes;abertura;fechamento;preço abertura;preço fechamento;lucro;swap;comissão;comentário
export function parseTrades(body: string) {
  const lines = body.replace(/\r/g, "").split("\n").filter(Boolean);
  const head = Object.fromEntries((lines[0] ?? "").split(";").map((x) => [x.slice(0, x.indexOf("=")), x.slice(x.indexOf("=") + 1)]));
  const gmt = Number(head.gmt);
  const trades: ParsedTrade[] = [];
  for (const line of lines.slice(1, 501)) {
    const f = line.split(";");
    if (f.length < 11) continue;
    const t: ParsedTrade = {
      ticket: Number(f[0]),
      brokerSymbol: f[1].slice(0, 32),
      side: Number(f[2]),
      lots: Number(f[3]),
      open: Number(f[4]),
      close: Number(f[5]),
      openPrice: Number(f[6]),
      closePrice: Number(f[7]),
      profit: Number(f[8]),
      swap: Number(f[9]),
      commission: Number(f[10]),
      comment: (f[11] ?? "").slice(0, 64),
      key: f[12] && SYMBOL_KEY.test(f[12]) ? f[12] : null,
    };
    const nums = [t.ticket, t.lots, t.open, t.close, t.openPrice, t.closePrice, t.profit, t.swap, t.commission];
    if (!nums.every(Number.isFinite) || !(t.ticket > 0) || (t.side !== 0 && t.side !== 1) || !(t.lots > 0) || t.close < t.open) continue;
    trades.push(t);
  }
  return { gmt: Number.isFinite(gmt) && Math.abs(gmt) <= 14 * 3600 ? gmt : 0, version: String(head.v ?? "").trim().slice(0, 32), trades };
}

export async function saveTrades(product: string, login: string, body: string) {
  if (!(await registered(product, login))) return 0;
  const { gmt, version, trades } = parseTrades(body);
  // fuso da corretora (o painel "Hoje" do Assistente usa pra saber quando o dia da conta começa)
  await db()
    .update(schema.accountStats)
    .set({ brokerGmt: gmt })
    .where(and(eq(schema.accountStats.product, product), eq(schema.accountStats.login, login)));
  if (!trades.length) return 0;
  const history = await db()
    .select({ params: schema.robotConfigHistory.params, createdAt: schema.robotConfigHistory.createdAt })
    .from(schema.robotConfigHistory)
    .where(and(eq(schema.robotConfigHistory.product, product), eq(schema.robotConfigHistory.login, login)))
    .orderBy(asc(schema.robotConfigHistory.createdAt));
  // Ajustes do par quando a operação abriu = a última configuração salva antes disso (o robô recebe em ~30 s).
  const paramsAt = (symbol: string, at: Date) => {
    let cfg: StoredConfig | null = null;
    for (const h of history) {
      if (h.createdAt.getTime() + 60_000 > at.getTime()) break;
      cfg = h.params as StoredConfig;
    }
    const p = cfg?.pairs?.[symbol];
    return p ? { ...DEFAULT_PAIR, ...p } : null;
  };
  const rows = trades.map((t) => {
    const symbol = t.key ?? baseSymbol(t.brokerSymbol);
    const openAt = new Date((t.open - gmt) * 1000);
    return {
      product,
      login,
      ticket: t.ticket,
      symbol,
      brokerSymbol: t.brokerSymbol,
      side: t.side,
      lots: t.lots.toFixed(2),
      openAt,
      closeAt: new Date((t.close - gmt) * 1000),
      openPrice: String(t.openPrice),
      closePrice: String(t.closePrice),
      profit: t.profit.toFixed(2),
      swap: t.swap.toFixed(2),
      commission: t.commission.toFixed(2),
      net: (t.profit + t.swap + t.commission).toFixed(2),
      comment: t.comment || null,
      eaVersion: version || null,
      params: paramsAt(symbol, openAt),
    };
  });
  const inserted = await db().insert(schema.robotTrades).values(rows).onConflictDoNothing().returning({ id: schema.robotTrades.id });
  return inserted.length;
}

const toLite = (r: { login: string; symbol: string; lots: string; net: string; closeAt: Date; params: unknown }): TradeLite => ({
  login: r.login,
  symbol: r.symbol,
  lots: Number(r.lots),
  net: Number(r.net),
  closeAt: r.closeAt,
  params: (r.params as Partial<PairParams> | null) ?? null,
});

export async function tradesFor(product: string, login: string, days = 365) {
  const rows = await db()
    .select()
    .from(schema.robotTrades)
    .where(
      and(eq(schema.robotTrades.product, product), eq(schema.robotTrades.login, login), gte(schema.robotTrades.closeAt, new Date(Date.now() - days * 86_400_000)))
    )
    .orderBy(asc(schema.robotTrades.closeAt));
  return rows;
}

export async function communityTrades(product: string, days = 180) {
  const rows = await db()
    .select({
      login: schema.robotTrades.login,
      symbol: schema.robotTrades.symbol,
      lots: schema.robotTrades.lots,
      net: schema.robotTrades.net,
      closeAt: schema.robotTrades.closeAt,
      params: schema.robotTrades.params,
    })
    .from(schema.robotTrades)
    .where(and(eq(schema.robotTrades.product, product), gte(schema.robotTrades.closeAt, new Date(Date.now() - days * 86_400_000))));
  return rows.map(toLite);
}

export async function tradeCountsByLogin(product: string) {
  const rows = await db()
    .select({ login: schema.robotTrades.login, n: sql<number>`count(*)::int`, net: sql<string>`sum(${schema.robotTrades.net})` })
    .from(schema.robotTrades)
    .where(eq(schema.robotTrades.product, product))
    .groupBy(schema.robotTrades.login);
  return new Map(rows.map((r) => [r.login, { trades: r.n, net: Number(r.net) }]));
}

// ------------------------------------------------------------------ estudo de velas

export const SCAN_PERIODS = ["1000", "10000", "1m", "2m", "3m", "6m", "1y"] as const;
export type ScanPeriod = (typeof SCAN_PERIODS)[number];
export const SCAN_RSI_PERIODS = [3, 5, 7, 10, 14];
const EXPIRE_MS = 30 * 60_000;
export const SCANS_PER_DAY = 30;

// mode "full" = leitura completa (robô v7.2+); fix = grupos que o cliente não pode mudar (ficam com o valor atual).
// daily = pedido do Assistente: precisa do resultado dia a dia (robô v7.4+, que manda fs=3).
export type ScanSpec = { bars?: number; days?: number; tf: number; tfs: number[]; per: number[]; period: ScanPeriod; mode?: "full"; fix?: string[]; daily?: boolean };

export function buildSpec(period: ScanPeriod, pair: PairParams, full?: { fix: string[]; daily?: boolean }): ScanSpec {
  const base = buildBasicSpec(period, pair);
  return full ? { ...base, mode: "full", fix: full.fix, ...(full.daily ? { daily: true } : {}) } : base;
}

// Nível do robô de cada conta visto na consulta de 30 s: 0 = antigo, 2 = v7.3 (leitura completa), 3 = v7.4+ (+ dia a dia).
// Só em memória (o portal roda num processo só); some 5 min depois do robô parar de consultar.
const LEVELS = ((globalThis as { __aixRobotLevels?: Map<string, { level: number; at: number }> }).__aixRobotLevels ??= new Map());
export function noteRobotLevel(product: string, login: string, level: number) {
  LEVELS.set(`${product}|${login}`, { level, at: Date.now() });
}
export function robotLevel(product: string, login: string): number | null {
  const v = LEVELS.get(`${product}|${login}`);
  return v && Date.now() - v.at < 5 * 60_000 ? v.level : null;
}

function buildBasicSpec(period: ScanPeriod, pair: PairParams): ScanSpec {
  const tfs = [...RSI_TIMEFRAMES] as number[];
  const per = [...new Set([...SCAN_RSI_PERIODS, pair.rsiPeriod])].sort((a, b) => a - b);
  const days = { "1m": 30, "2m": 61, "3m": 92, "6m": 183, "1y": 365 } as Record<string, number>;
  if (period === "1000" || period === "10000") return { bars: Number(period), tf: pair.rsiTf, tfs, per, period };
  return { days: days[period], tf: pair.rsiTf, tfs, per, period };
}

const specText = (symbol: string, s: ScanSpec) =>
  [
    `sym=${symbol}`,
    `bars=${s.bars ?? 0}`,
    `days=${s.days ?? 0}`,
    `tf=${s.tf}`,
    `tfs=${s.tfs.join(",")}`,
    `per=${s.per.join(",")}`,
    ...(s.mode === "full" ? ["mode=full", `fix=${(s.fix ?? []).join(",")}`] : []),
  ].join(";");

// Pedidos parados (robô desligado, versão antiga) vencem em 30 min.
// Leitura completa que nenhum robô v7.3+ pegou: vence com o aviso de atualizar o robô (do Assistente: v7.4+).
async function expireStale(product: string, login: string) {
  const limit = new Date(Date.now() - EXPIRE_MS);
  await db()
    .update(schema.robotScans)
    .set({ status: "expired", finishedAt: new Date(), error: "needs v7.4" })
    .where(
      and(
        eq(schema.robotScans.product, product),
        eq(schema.robotScans.login, login),
        eq(schema.robotScans.status, "pending"),
        lt(schema.robotScans.createdAt, limit),
        sql`${schema.robotScans.spec}->>'daily' = 'true'`
      )
    );
  await db()
    .update(schema.robotScans)
    .set({ status: "expired", finishedAt: new Date(), error: "needs v7.3" })
    .where(
      and(
        eq(schema.robotScans.product, product),
        eq(schema.robotScans.login, login),
        eq(schema.robotScans.status, "pending"),
        lt(schema.robotScans.createdAt, limit),
        sql`${schema.robotScans.spec}->>'mode' = 'full'`
      )
    );
  await db()
    .update(schema.robotScans)
    .set({ status: "expired", finishedAt: new Date() })
    .where(
      and(
        eq(schema.robotScans.product, product),
        eq(schema.robotScans.login, login),
        or(
          and(eq(schema.robotScans.status, "pending"), lt(schema.robotScans.createdAt, limit)),
          and(eq(schema.robotScans.status, "running"), lt(schema.robotScans.startedAt, limit))
        )
      )
    );
}

// Um pedido por par (v7.1: "todos os pares ligados" = vários de uma vez; o robô faz um de cada vez, na ordem).
export async function requestScan(product: string, login: string, items: { symbol: string; spec: ScanSpec }[], requestedBy: string) {
  await expireStale(product, login);
  const active = await db()
    .select({ id: schema.robotScans.id })
    .from(schema.robotScans)
    .where(and(eq(schema.robotScans.product, product), eq(schema.robotScans.login, login), inArray(schema.robotScans.status, ["pending", "running"])))
    .limit(1);
  if (active.length) return { ok: false as const, error: "busy" as const };
  const today = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.robotScans)
    .where(and(eq(schema.robotScans.product, product), eq(schema.robotScans.login, login), gte(schema.robotScans.createdAt, new Date(Date.now() - 86_400_000))));
  if ((today[0]?.n ?? 0) + items.length > SCANS_PER_DAY) return { ok: false as const, error: "limit" as const };
  const rows = await db()
    .insert(schema.robotScans)
    .values(items.map(({ symbol, spec }) => ({ product, login, symbol, spec, requestedBy })))
    .returning({ id: schema.robotScans.id });
  return { ok: true as const, ids: rows.map((r) => r.id) };
}

// Linha que o robô recebe na consulta de 30 s (sem assinatura - quem chama assina).
// level = fs que o robô mandou: 2 (v7.3) recebe leitura completa; 3 (v7.4+) também as do Assistente (dia a dia).
// Robô antigo só recebe leitura normal (a v7.2 travava na completa).
export async function pendingScan(product: string, login: string, level = 0) {
  await expireStale(product, login);
  const [row] = await db()
    .select()
    .from(schema.robotScans)
    .where(
      and(
        eq(schema.robotScans.product, product),
        eq(schema.robotScans.login, login),
        eq(schema.robotScans.status, "pending"),
        level >= 2 ? undefined : sql`coalesce(${schema.robotScans.spec}->>'mode', '') <> 'full'`,
        level >= 3 ? undefined : sql`coalesce(${schema.robotScans.spec}->>'daily', '') <> 'true'`
      )
    )
    .orderBy(asc(schema.robotScans.createdAt))
    .limit(1);
  return row ? { id: String(row.id), spec: specText(row.symbol, row.spec as ScanSpec) } : null;
}

export async function scanReport(product: string, login: string, id: number, body: string) {
  const where = and(eq(schema.robotScans.id, id), eq(schema.robotScans.product, product), eq(schema.robotScans.login, login));
  if (body.trim() === "start") {
    await db().update(schema.robotScans).set({ status: "running", startedAt: new Date() }).where(and(where, eq(schema.robotScans.status, "pending")));
    return;
  }
  if (body.startsWith("error=")) {
    await db().update(schema.robotScans).set({ status: "error", error: body.slice(6, 300), finishedAt: new Date() }).where(where);
    await restartQueue(product, login);
    return;
  }
  const result = parseScan(body);
  await db()
    .update(schema.robotScans)
    .set(result ? { status: "done", result, finishedAt: new Date() } : { status: "error", error: "invalid result", finishedAt: new Date() })
    .where(where);
  await restartQueue(product, login);
}

// Fila: terminou um, os que estão esperando ganham mais 30 min (o prazo conta a partir do anterior).
async function restartQueue(product: string, login: string) {
  await db()
    .update(schema.robotScans)
    .set({ createdAt: new Date() })
    .where(and(eq(schema.robotScans.product, product), eq(schema.robotScans.login, login), eq(schema.robotScans.status, "pending")));
}

export async function scansFor(product: string, login: string, limit = 10) {
  await expireStale(product, login);
  return db()
    .select()
    .from(schema.robotScans)
    .where(and(eq(schema.robotScans.product, product), eq(schema.robotScans.login, login)))
    .orderBy(desc(schema.robotScans.createdAt))
    .limit(limit);
}

// Estudos concluídos de todas as contas (os mais recentes de cada conta/par), pra somar por par.
export async function communityScans(product: string, days = 120) {
  const rows = await db()
    .select({ login: schema.robotScans.login, symbol: schema.robotScans.symbol, result: schema.robotScans.result, finishedAt: schema.robotScans.finishedAt })
    .from(schema.robotScans)
    .where(and(eq(schema.robotScans.product, product), eq(schema.robotScans.status, "done"), gte(schema.robotScans.createdAt, new Date(Date.now() - days * 86_400_000))))
    .orderBy(desc(schema.robotScans.finishedAt));
  const seen = new Set<string>();
  const out: { login: string; symbol: string; result: ScanResult }[] = [];
  for (const r of rows) {
    const k = `${r.login}|${r.symbol}`;
    if (seen.has(k) || !r.result) continue;
    seen.add(k);
    out.push({ login: r.login, symbol: r.symbol, result: r.result as ScanResult });
  }
  return out;
}
