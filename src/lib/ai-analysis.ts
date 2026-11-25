import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { AI_CLIENT_DAILY_DEFAULT, getAiKey, getAiSettings } from "@/lib/config";
import { statsFor } from "@/lib/account-stats";
import { getRobotConfig } from "@/lib/robot-settings";
import { communityScans, communityTrades, scansFor, tradesFor } from "@/lib/intelligence";
import {
  betterSet,
  learn,
  mergeScans,
  policyCan,
  rankScan,
  scanRowAllowed,
  stats,
  type RatedRow,
  type ScanResult,
  type Stats,
} from "@/lib/intel-stats";
import { enforcePolicy, symbolLabel, tfLabel, type RobotPolicy } from "@/lib/robot-options";
import { pairSummary, valuePt } from "@/components/intel/strategy-text";

// Ai X Intelligence: texto de análise escrito pela IA (Claude) em cima das estatísticas de UMA conta
// (resultados reais, leituras de velas e sugestões da comunidade). A IA só explica e prioriza: os números e as
// combinações que podem ser aplicadas vêm do portal (já filtradas pelas permissões do admin).

export const AI_MODEL = "claude-opus-5-5";
const LANG: Record<string, string> = { pt: "português do Brasil", en: "English", es: "español" };

const r2 = (v: number) => Math.round(v * 100) / 100;
const statLine = (s: Stats) => ({
  trades: s.trades,
  winRatePct: r2(s.winRate * 100),
  profitFactor: s.pf >= 99 ? "sem perdas" : r2(s.pf),
  net: r2(s.net),
  maxDrawdown: r2(s.maxDD),
  maxLosingStreak: s.maxConsecLoss,
});
const comboLine = (r: RatedRow) => ({
  combo: `RSI ${tfLabel(r.tf)} período ${r.per} ${valuePt("rsiZone", r.zone)} ${r.logic ? "rompimento" : "reversão"}`,
  trades: r.trades,
  winRatePct: r2(r.winRate * 100),
  profitFactor: r.pf >= 99 ? "sem perdas" : r2(r.pf),
  resultR: r2(r.netR),
  maxDrawdownR: r2(r.ddR),
  positiveInBothHalves: r.consistent,
});

// Tudo que a IA recebe (JSON compacto, sem dados pessoais).
export async function buildAnalysisInput(product: string, login: string, policy: RobotPolicy | null) {
  const [full, trades, accStats, scans, community, cScans] = await Promise.all([
    getRobotConfig(product, login),
    tradesFor(product, login),
    statsFor(product, [login]),
    scansFor(product, login, 40),
    communityTrades(product),
    communityScans(product),
  ]);
  const config = policy && full.admin ? enforcePolicy(full, policy) : full;
  const can = policyCan(policy);
  const acc = accStats.get(login);
  const monthAgo = Date.now() - 30 * 86_400_000;

  const lastDone = new Map<string, ScanResult & { finishedAt: Date | null; period?: string }>();
  for (const s of scans)
    if (s.status === "done" && s.result && !lastDone.has(s.symbol))
      lastDone.set(s.symbol, { ...(s.result as ScanResult), finishedAt: s.finishedAt, period: (s.spec as { period?: string }).period });
  const learning = new Map(learn(community).map((l) => [l.symbol, l]));
  const scansBy = new Map<string, ScanResult[]>();
  for (const c of cScans) scansBy.set(c.symbol, [...(scansBy.get(c.symbol) ?? []), c.result]);

  const symbols = [...new Set([...config.symbols, ...lastDone.keys(), ...trades.map((t) => t.symbol)])];
  const pairs = symbols.map((sym) => {
    const pair = config.pairs[sym] ?? config.pairs[config.symbols[0]];
    const mine = trades.filter((t) => t.symbol === sym).map((t) => Number(t.net));
    const scan = lastDone.get(sym);
    const ranked = scan ? rankScan(scan, scanRowAllowed(can, pair), 3) : null;
    const better = betterSet(learning.get(sym), pair, can);
    const merged = (scansBy.get(sym)?.length ?? 0) >= 2 ? mergeScans(scansBy.get(sym)!) : null;
    const top = merged ? rankScan(merged, scanRowAllowed(can, pair), 1).best[0] : undefined;
    return {
      pair: symbolLabel(sym),
      enabled: config.symbols.includes(sym),
      currentSettings: Object.fromEntries(pairSummary(pair)),
      realResults: mine.length ? statLine(stats(mine)) : null,
      candleReading: scan
        ? {
            period: scan.period ?? null,
            from: new Date(scan.meta.from * 1000).toISOString().slice(0, 10),
            to: new Date(scan.meta.to * 1000).toISOString().slice(0, 10),
            m1Bars: scan.meta.m1,
            lossDistancePips: scan.meta.pip ? Math.round(scan.meta.loss / scan.meta.pip) : null,
            currentCombo: ranked?.current ? comboLine(ranked.current) : "a combinação atual não entrou no estudo",
            bestCombosClientCanApply: ranked?.best.map(comboLine) ?? [],
          }
        : null,
      communityBetterSettings: better
        ? {
            changes: better.diff.map((d) => `${d.key}: ${valuePt(d.key, d.from)} -> ${valuePt(d.key, d.to)}`),
            ...statLine(better.set.stats),
            accounts: better.set.accounts,
            note: "resultado por operação normalizado a 0,01 lote",
          }
        : null,
      communityCandleReadingBest: top ? { accounts: scansBy.get(sym)!.length, ...comboLine(top) } : null,
    };
  });

  const all = trades.map((t) => Number(t.net));
  return {
    hasData: all.length > 0 || lastDone.size > 0,
    data: {
      robot: "Ai X PULSE RS (MT4): entra pelo RSI (zona, período, tempo gráfico, reversão ou rompimento), com filtros ATR/ADX/zonas/notícias e saída por alvo, limite de perda, break-even e stop móvel.",
      account: acc
        ? { currency: acc.currency, balance: r2(Number(acc.balance)), equity: r2(Number(acc.equity)), robotVersion: acc.eaVersion }
        : null,
      accountSettings: {
        enabledPairs: config.symbols.map(symbolLabel),
        maxPositions: config.maxPositions,
        maxDrawdownPct: config.ddPct,
        dailyGoalPct: config.dailyGoalPct,
        dailyLossPct: config.dailyLossPct,
        hours: `${config.startHour}h-${config.endHour}h (servidor)`,
        newsFilter: config.newsFilter,
      },
      realResults: {
        allTime: all.length ? statLine(stats(all)) : null,
        last30Days: statLine(stats(trades.filter((t) => t.closeAt.getTime() >= monthAgo).map((t) => Number(t.net)))),
        currency: acc?.currency ?? "USD",
      },
      pairs,
      notes: [
        "Leitura de velas: só o gatilho do RSI com a saída do par, sem os filtros (ATR, ADX, zonas, notícias). Resultado em R = múltiplos do limite de perda.",
        "Critério das combinações listadas: 20+ operações, fator de lucro acima de 1 e positivas nas duas metades do período.",
        "Cada combinação listada em bestCombosClientCanApply tem um botão Aplicar ao lado, no painel, que troca só o RSI daquele par.",
      ],
    },
  };
}

const system = (lang: string, admin: boolean) => `Você é a Ai X Intelligence, a analista de estatísticas do robô de trading Ai X PULSE RS (MetaTrader 4).
Escreva em ${lang}. Quem vai ler: ${admin ? "o administrador (dono do robô), olhando a conta de um cliente" : "o cliente dono da conta"}.

Use só os dados do JSON. Não invente números nem combinações. Explique de forma direta e simples, sem jargão e sem hype:
1. Como a conta está (resultados reais, se houver): o que está indo bem e o que preocupa.
2. Cada par: compare a combinação atual com as melhores da leitura de velas e com a comunidade. Diga qual mudança parece mais sólida e por quê (amostra, fator de lucro, queda máxima em R, consistência nas duas metades). Se a amostra for pequena, diga que é cedo.
3. Próximos passos práticos, em ordem de prioridade: por exemplo "aplicar a combinação X no EUR/USD pelo botão Aplicar", "pedir uma leitura de 6 meses", "esperar mais operações".

Só recomende mudanças que aparecem em bestCombosClientCanApply, communityBetterSettings ou communityCandleReadingBest (já respeitam o que o cliente pode mudar). Se nada for claramente melhor, diga para manter.
Nunca prometa lucro nem resultado; trate como estatística do passado. Não fale de alavancagem, depósito ou indicação de corretora.
Formato: títulos curtos começando com "## ", listas com "- ", destaque com **negrito**. Sem tabelas. Até 350 palavras.`;

export type AnalysisError = "nokey" | "nodata" | "limit" | "auth" | "busy" | "refused" | "api";

export async function analysesToday(product: string, login: string) {
  const [row] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.robotAnalyses)
    .where(and(eq(schema.robotAnalyses.product, product), eq(schema.robotAnalyses.login, login), gte(schema.robotAnalyses.createdAt, new Date(Date.now() - 86_400_000))));
  return row?.n ?? 0;
}

export async function clientDailyLimit() {
  const s = await getAiSettings();
  return s.clientDaily ?? AI_CLIENT_DAILY_DEFAULT;
}

export async function latestAnalysis(product: string, login: string) {
  const [row] = await db()
    .select()
    .from(schema.robotAnalyses)
    .where(and(eq(schema.robotAnalyses.product, product), eq(schema.robotAnalyses.login, login)))
    .orderBy(desc(schema.robotAnalyses.createdAt))
    .limit(1);
  return row ?? null;
}

// Uma chamada à API do Claude. Testes do admin usam o mesmo caminho (texto curto).
export async function callClaude(apiKey: string, systemText: string, user: string) {
  const client = new Anthropic({ apiKey, timeout: 120_000, maxRetries: 2 });
  const response = await client.beta.messages.create({
    model: AI_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default", // se o modelo recusar por engano, a API tenta no modelo recomendado
    output_config: { effort: "medium" },
    system: systemText,
    messages: [{ role: "user", content: user }],
  });
  if (response.stop_reason === "refusal") return { ok: false as const, error: "refused" as const };
  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("\n")
    .trim();
  if (!text) return { ok: false as const, error: "api" as const };
  return { ok: true as const, text, model: response.model, usage: response.usage };
}

export function aiErrorOf(error: unknown): AnalysisError {
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) return "auth";
  if (error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError) return "busy";
  return "api";
}

export async function generateAnalysis(opts: { product: string; login: string; locale: string; policy: RobotPolicy | null; requestedBy: string; isAdmin: boolean }) {
  const key = await getAiKey();
  if (!key) return { ok: false as const, error: "nokey" as AnalysisError };
  const limit = opts.isAdmin ? 20 : await clientDailyLimit();
  if ((await analysesToday(opts.product, opts.login)) >= limit) return { ok: false as const, error: "limit" as AnalysisError };
  const input = await buildAnalysisInput(opts.product, opts.login, opts.policy);
  if (!input.hasData) return { ok: false as const, error: "nodata" as AnalysisError };
  const lang = LANG[opts.locale] ?? LANG.en;
  try {
    const r = await callClaude(key.key, system(lang, opts.isAdmin), `Dados da conta (JSON):\n${JSON.stringify(input.data)}`);
    if (!r.ok) return { ok: false as const, error: r.error as AnalysisError };
    await db()
      .insert(schema.robotAnalyses)
      .values({
        product: opts.product,
        login: opts.login,
        locale: opts.locale,
        text: r.text.slice(0, 20000),
        model: r.model,
        inputTokens: r.usage.input_tokens,
        outputTokens: r.usage.output_tokens,
        requestedBy: opts.requestedBy,
      });
    return { ok: true as const };
  } catch (error) {
    console.error("ai analysis failed", opts.login, error);
    return { ok: false as const, error: aiErrorOf(error) };
  }
}

// Uso dos últimos 30 dias (Admin → Configurações → IA).
export async function aiUsage30d() {
  const [row] = await db()
    .select({
      n: sql<number>`count(*)::int`,
      input: sql<number>`coalesce(sum(${schema.robotAnalyses.inputTokens}), 0)::int`,
      output: sql<number>`coalesce(sum(${schema.robotAnalyses.outputTokens}), 0)::int`,
    })
    .from(schema.robotAnalyses)
    .where(gte(schema.robotAnalyses.createdAt, new Date(Date.now() - 30 * 86_400_000)));
  return row ?? { n: 0, input: 0, output: 0 };
}
