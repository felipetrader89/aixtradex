import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { BIAS_EVERY_DEFAULT, getAiKey, getAiSettings } from "@/lib/config";
import { AI_MODEL } from "@/lib/ai-analysis";
import { SYMBOL_KEY } from "@/lib/robot-options";

// v7.5 MESA DE ANÁLISE - o trader sênior.
// Os robôs v7.5 mandam, a cada vela nova do H4, um resumo do mercado de cada par que operam (velas D1/H4/H1 fechadas + médias 50/200,
// RSI, ADX, ATR, máx/mín do dia e da semana anteriores). A IA (Claude), no papel de um trader com décadas de mercado, lê e decide o viés
// das próximas horas: compra, venda, os dois (lateral com limites claros) ou não operar. O viés vale pra todas as contas (é do mercado, não
// da conta), volta pro robô na configuração (chave "ai") e entra na Mesa de Análise como mais uma confluência (contra = veto).
// Frequência e liga/desliga: Admin → Configurações → IA (padrão: a cada 8 h por ativo).

export type BiasKind = "buy" | "sell" | "both" | "none";
export type BiasAnalysis = { pt: string; en: string; es: string; supports: number[]; resistances: number[]; invalidation: number; regime: string };
export const BIAS_CODE: Record<BiasKind, number> = { buy: 1, sell: 2, both: 3, none: 4 };

type Block = { symbol: string; text: string };

// "#XAUUSD;broker=...;..." + linhas D1/H4/H1 → um bloco por ativo
export function parseSnapshot(body: string): Block[] {
  const out: Block[] = [];
  let cur: Block | null = null;
  for (const line of body.replace(/\r/g, "").split("\n")) {
    if (line.startsWith("#")) {
      const symbol = line.slice(1, line.indexOf(";") > 0 ? line.indexOf(";") : undefined).trim();
      cur = SYMBOL_KEY.test(symbol) ? { symbol, text: line + "\n" } : null;
      if (cur) out.push(cur);
    } else if (cur && /^(D1|H4|H1) /.test(line)) cur.text += line.slice(0, 12000) + "\n";
  }
  return out.slice(0, 40);
}

async function biasEveryHours() {
  const s = await getAiSettings();
  return s.biasEvery ?? BIAS_EVERY_DEFAULT;
}

async function latestFor(symbols: string[], sinceMs: number) {
  if (!symbols.length) return [];
  return db()
    .select()
    .from(schema.marketBias)
    .where(and(inArray(schema.marketBias.symbol, symbols), gte(schema.marketBias.createdAt, new Date(Date.now() - sinceMs))))
    .orderBy(desc(schema.marketBias.createdAt));
}

// Viés atual de cada ativo (o mais recente ainda válido). Usado na configuração que vai pro robô e nas telas.
export async function currentBias(symbols?: string[]) {
  const every = await biasEveryHours();
  if (every <= 0) return new Map<string, typeof schema.marketBias.$inferSelect>();
  const validMs = (every + 2) * 3600_000;
  const rows = symbols
    ? await latestFor(symbols, validMs)
    : await db().select().from(schema.marketBias).where(gte(schema.marketBias.createdAt, new Date(Date.now() - validMs))).orderBy(desc(schema.marketBias.createdAt));
  const map = new Map<string, typeof schema.marketBias.$inferSelect>();
  for (const r of rows) if (!map.has(r.symbol)) map.set(r.symbol, r);
  return map;
}

// { XAUUSD: 1, EURUSD: 4, ... } pro configPayload (0 = sem viés: a Mesa segue sem essa confluência).
export async function biasForConfig(): Promise<Record<string, number>> {
  const map = await currentBias();
  return Object.fromEntries([...map].map(([s, r]) => [s, BIAS_CODE[r.bias as BiasKind] ?? 0]));
}

// Leituras em andamento (um processo só no servidor): o mesmo ativo não é lido duas vezes ao mesmo tempo.
const RUNNING = ((globalThis as { __aixBiasRunning?: Set<string> }).__aixBiasRunning ??= new Set());

// Resumo que chegou de um robô: lê com a IA os ativos cujo viés venceu (sem esperar - o robô recebe "OK" na hora).
export async function handleSnapshot(login: string, body: string) {
  const blocks = parseSnapshot(body);
  const every = await biasEveryHours();
  if (!blocks.length || every <= 0) return blocks.length;
  const key = await getAiKey();
  if (!key) return blocks.length;
  const fresh = await latestFor(
    blocks.map((b) => b.symbol),
    every * 3600_000 - 15 * 60_000
  );
  const done = new Set(fresh.map((r) => r.symbol));
  for (const b of blocks) {
    if (done.has(b.symbol) || RUNNING.has(b.symbol)) continue;
    RUNNING.add(b.symbol);
    void readBias(key.key, b, login)
      .catch((error) => console.error("market bias failed", b.symbol, error))
      .finally(() => RUNNING.delete(b.symbol));
  }
  return blocks.length;
}

const SYSTEM = `Você é um trader profissional com mais de 25 anos de mercado (forex, metais, índices e cripto), ex-chefe de mesa, conhecido pela disciplina de risco e pela leitura limpa de gráfico. Você é o "trader sênior" da Mesa de Análise de um robô automático.

Sua tarefa: ler o resumo do mercado de UM ativo (velas D1, H4 e H1 fechadas, da mais antiga pra mais nova, no formato abertura,máxima,mínima,fechamento; médias exponenciais 50/200 no D1, H4 e H1; RSI 14; ADX 14 do H4; ATR 14 do D1 e do H1; máxima e mínima do dia e da semana anteriores; preço atual) e decidir o VIÉS das próximas 4 a 8 horas pra esse robô.

Como o robô usa o seu viés: ele entra quando o RSI chega num extremo E as confluências da Mesa batem (tendência H4/H1, zona de suporte/resistência, vela de confirmação, divergência, MACD, horário, espaço até a próxima zona). O seu viés é mais uma confluência: a favor soma pontos; contra BLOQUEIA a entrada naquele lado. "none" bloqueia os dois lados.

Regras de leitura (como um veterano faz):
- Comece pelo D1 (contexto), depois H4 (estrutura: topos e fundos, rompimentos, pullbacks), depois H1 (momento).
- "buy": tendência ou estrutura de alta clara no H4 (de preferência confirmada no D1), preço não esticado demais contra uma resistência forte logo acima.
- "sell": o espelho.
- "both": mercado lateral com limites claros (suporte e resistência bem definidos), sem tendência dominante - o robô pode comprar no fundo e vender no topo.
- "none": mercado sem vantagem - movimento caótico, velas enormes de notícia, preço espremido no meio do nada, conflito forte entre D1 e H4, ou volatilidade anormal. Na dúvida real, prefira "none" ou "both" a um lado errado: proteger o capital vem antes.
- Não invente dados que não estão no resumo. Não fale de notícias que você não vê nos números.
- confidence: 0 a 100, honesto (raramente acima de 80).
- supports / resistances: até 3 níveis de preço cada, os mais relevantes perto do preço atual, com o número de casas decimais do ativo.
- invalidation: o preço que invalida o viés (buy: abaixo do qual a ideia de compra morre; sell: acima do qual a de venda morre). Em "both" ou "none" use 0.
- regime: "trend_up", "trend_down", "range" ou "volatile".
- pt / en / es: o mesmo parecer em português do Brasil, inglês e espanhol, 2 a 4 frases curtas, linguagem simples (o cliente não é especialista), dizendo o que você vê e por que escolheu esse viés. Sem promessas de lucro, sem hype.`;

const SCHEMA = {
  type: "object",
  properties: {
    bias: { type: "string", enum: ["buy", "sell", "both", "none"] },
    confidence: { type: "integer" },
    regime: { type: "string", enum: ["trend_up", "trend_down", "range", "volatile"] },
    supports: { type: "array", items: { type: "number" } },
    resistances: { type: "array", items: { type: "number" } },
    invalidation: { type: "number" },
    pt: { type: "string" },
    en: { type: "string" },
    es: { type: "string" },
  },
  required: ["bias", "confidence", "regime", "supports", "resistances", "invalidation", "pt", "en", "es"],
  additionalProperties: false,
};

async function readBias(apiKey: string, block: Block, login: string) {
  const client = new Anthropic({ apiKey, timeout: 120_000, maxRetries: 2 });
  const response = await client.beta.messages.create({
    model: AI_MODEL,
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content: `Resumo do mercado de ${block.symbol}:\n${block.text}` }],
  });
  if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return;
  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("");
  const r = JSON.parse(text) as { bias: BiasKind; confidence: number } & BiasAnalysis;
  if (!["buy", "sell", "both", "none"].includes(r.bias)) return;
  const nums = (a: unknown) => (Array.isArray(a) ? a.map(Number).filter(Number.isFinite).slice(0, 3) : []);
  await db()
    .insert(schema.marketBias)
    .values({
      symbol: block.symbol,
      bias: r.bias,
      confidence: Math.max(0, Math.min(100, Math.round(Number(r.confidence) || 0))),
      analysis: {
        pt: String(r.pt ?? "").slice(0, 1200),
        en: String(r.en ?? "").slice(0, 1200),
        es: String(r.es ?? "").slice(0, 1200),
        supports: nums(r.supports),
        resistances: nums(r.resistances),
        invalidation: Number(r.invalidation) || 0,
        regime: String(r.regime ?? ""),
      },
      snapshot: block.text.slice(0, 20000),
      sourceLogin: login,
      model: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });
}

// Uso dos últimos 30 dias (Admin → Configurações → IA).
export async function biasUsage30d() {
  const [row] = await db()
    .select({
      n: sql<number>`count(*)::int`,
      input: sql<number>`coalesce(sum(${schema.marketBias.inputTokens}), 0)::int`,
      output: sql<number>`coalesce(sum(${schema.marketBias.outputTokens}), 0)::int`,
    })
    .from(schema.marketBias)
    .where(gte(schema.marketBias.createdAt, new Date(Date.now() - 30 * 86_400_000)));
  return row ?? { n: 0, input: 0, output: 0 };
}

export async function biasHistory(symbol: string, limit = 6) {
  return db().select().from(schema.marketBias).where(eq(schema.marketBias.symbol, symbol)).orderBy(desc(schema.marketBias.createdAt)).limit(limit);
}

// ------------------------------------------------------------------ Mesa: o que funcionou nas operações reais da conta
// mesa = máscara + (nota + 32) × 2^24 (robô v7.5, AiXTradeX_Analysis.mqh Mesa_Pack)
export const MESA_BITS = {
  trendH4: 1,
  trendH1: 2,
  structure: 4,
  zone: 8,
  candle: 16,
  divergence: 32,
  macd: 64,
  session: 128,
  room: 256,
  aiBias: 512,
  counterTrend: 65536,
  intoZone: 131072,
  squeeze: 262144,
  oppositeCandle: 2097152,
  lowRoom: 4194304,
} as const;
export type MesaBit = keyof typeof MESA_BITS;
export const decodeMesa = (v: number) => ({ mask: v % 16777216, score: Math.floor(v / 16777216) - 32 });

type Agg = { n: number; wins: number; net: number };
export async function mesaStats(product: string, login: string) {
  const rows = await db()
    .select({ mesa: schema.robotTrades.mesa, net: schema.robotTrades.net })
    .from(schema.robotTrades)
    .where(and(eq(schema.robotTrades.product, product), eq(schema.robotTrades.login, login), sql`${schema.robotTrades.mesa} is not null`))
    .orderBy(desc(schema.robotTrades.closeAt))
    .limit(3000);
  const add = (a: Agg, net: number) => {
    a.n++;
    a.net += net;
    if (net > 0) a.wins++;
  };
  const all: Agg = { n: 0, wins: 0, net: 0 };
  const bits = Object.fromEntries(Object.keys(MESA_BITS).map((k) => [k, { n: 0, wins: 0, net: 0 }])) as Record<MesaBit, Agg>;
  const bands = { low: { n: 0, wins: 0, net: 0 }, mid: { n: 0, wins: 0, net: 0 }, high: { n: 0, wins: 0, net: 0 }, top: { n: 0, wins: 0, net: 0 } };
  for (const r of rows) {
    const net = Number(r.net);
    const { mask, score } = decodeMesa(Number(r.mesa));
    add(all, net);
    for (const [k, bit] of Object.entries(MESA_BITS) as [MesaBit, number][]) if (mask & bit) add(bits[k], net);
    add(score >= 7 ? bands.top : score >= 5 ? bands.high : score >= 3 ? bands.mid : bands.low, net);
  }
  return { all, bits, bands };
}
