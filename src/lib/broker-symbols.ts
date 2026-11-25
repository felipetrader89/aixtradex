import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ROBOT_SYMBOLS, SYMBOL_KEY, type AssetCategory } from "@/lib/robot-options";

// v7.1: ativos negociáveis da corretora de cada conta. O robô manda (POST /api/license/check?symbols=1) 30 s depois de ligar,
// a cada 6 h e quando o portal pede (linha "SYMS" na consulta de 30 s). O cliente liga os que quiser em Configurar robô.

export type BrokerSymbol = {
  k: string; // nome no portal (sem prefixo/sufixo da corretora): US30, BTCUSD...
  n: string; // nome na corretora: US30m, BTCUSDm...
  c: AssetCategory;
  g: string; // pasta na corretora (Forex\Majors, Crypto...)
  d: string; // descrição
  dg: number; // dígitos
  p: number; // 1 pip (preço) - o mesmo cálculo do robô
  cs: number; // contrato
  cb: string; // moeda base
  cp: string; // moeda do lucro
};

const CURRENCIES = new Set(
  "USD EUR GBP JPY AUD NZD CAD CHF NOK SEK DKK PLN HUF CZK TRY ZAR MXN SGD HKD CNH CNY RUB ILS THB INR BRL KRW TWD".split(" ")
);
const CRYPTO =
  /^(BTC|ETH|LTC|XRP|BCH|ADA|DOT|SOL|DOGE|BNB|LINK|XLM|EOS|TRX|AVAX|MATIC|POL|UNI|SHIB|ATOM|XTZ|ALGO|FIL|ETC|NEAR|APT|ARB|OP|TON|SUI|PEPE|AAVE|XMR|DASH|ZEC|BAT|MKR|COMP|SAND|MANA|AXS|CRV|ICP|HBAR|VET|INJ|RNDR|FET|WLD)/;
const INDEX =
  /^(US30|US500|US100|USTEC|NAS100|NAS|SPX|SP500|DJ30|DJI|DE30|DE40|GER30|GER40|DAX|UK100|FTSE|JP225|JPN225|NIKKEI|AUS200|AU200|FRA40|FR40|CAC|HK50|HSI|STOXX50|EU50|ESP35|ES35|IT40|NL25|SWI20|CHINA50|CN50|CHINAH|SG30|IND50|NIFTY|VIX|USDX|DXY|US2000|RUSSELL)/;
const ENERGY = /^(USOIL|UKOIL|WTI|BRENT|XTIUSD|XBRUSD|XNGUSD|NGAS|NATGAS|CL-OIL|OIL|GASOIL|HEATOIL)/;
const METAL = /^(XAU|XAG|XPT|XPD|GOLD|SILVER|PLATINUM|PALLADIUM|COPPER|XCU)/;
const SOFTS = /^(COFFEE|COCOA|SUGAR|CORN|WHEAT|SOYBEAN|COTTON|OJ|CATTLE|HOGS)/;

// Categoria: primeiro a pasta da corretora, depois o nome.
export function categorize(key: string, path: string, desc: string, base: string, profit: string): AssetCategory {
  const g = path.toLowerCase();
  const k = key.toUpperCase();
  if (/crypto|bitcoin|coin/.test(g) || CRYPTO.test(k)) return "crypto";
  if (/metal|gold|silver|spot\s*metal/.test(g) || METAL.test(k)) return "metals";
  if (/energ|oil|gas/.test(g) || ENERGY.test(k)) return "energy";
  if (/indic|index|indices|cash|future/.test(g) || INDEX.test(k)) return "indices";
  if (/stock|share|equit|nasdaq|nyse|etf|\bus\b|\buk\b|\bde\b/.test(g)) return "stocks";
  if (/commod|soft|agri|grain/.test(g) || SOFTS.test(k)) return "commodities";
  if (/forex|\bfx\b|currenc|major|minor|exotic|cross/.test(g)) return "forex";
  const six = k.replace(/[^A-Z]/g, "").slice(0, 6);
  if (six.length === 6 && CURRENCIES.has(six.slice(0, 3)) && CURRENCIES.has(six.slice(3))) return "forex";
  if (base && profit && CURRENCIES.has(base.toUpperCase()) && CURRENCIES.has(profit.toUpperCase()) && base !== profit) return "forex";
  if (/\.(us|nas|nyse|de|uk)$/i.test(key) || /\binc\b|\bcorp\b|\bltd\b|\bplc\b/i.test(desc)) return "stocks";
  return "other";
}

// 1ª linha: v=..;pre=..;suf=..;chart=..;company=..;server=..  Depois um ativo por linha:
// nome no portal;nome na corretora;pasta;descrição;dígitos;pip;contrato;moeda base;moeda do lucro
export function parseSymbols(body: string) {
  const lines = body.replace(/\r/g, "").split("\n").filter(Boolean);
  const head = Object.fromEntries(
    (lines[0] ?? "")
      .split(";")
      .filter((x) => x.includes("="))
      .map((x) => [x.slice(0, x.indexOf("=")), x.slice(x.indexOf("=") + 1)])
  );
  const pre = String(head.pre ?? "").slice(0, 12);
  const suf = String(head.suf ?? "").slice(0, 12);
  const byKey = new Map<string, BrokerSymbol & { rank: number }>();
  for (const line of lines.slice(1, 3001)) {
    const f = line.split(";");
    if (f.length < 9) continue;
    const [k, n, g, d] = f;
    if (!SYMBOL_KEY.test(k) || !n || n.length > 40) continue;
    const dg = Number(f[4]);
    const p = Number(f[5]);
    if (!Number.isInteger(dg) || dg < 0 || dg > 10 || !(p > 0)) continue;
    const item = {
      k,
      n,
      c: categorize(k, g ?? "", d ?? "", f[7] ?? "", f[8] ?? ""),
      g: (g ?? "").slice(0, 80),
      d: (d ?? "").slice(0, 80),
      dg,
      p,
      cs: Number(f[6]) || 0,
      cb: (f[7] ?? "").slice(0, 8),
      cp: (f[8] ?? "").slice(0, 8),
      // a corretora pode ter mais de um com o mesmo nome no portal (XAUUSD e XAUUSD.sb): fica o que o robô usaria
      rank: n === `${pre}${k}${suf}` ? 0 : n === k ? 1 : 2,
    };
    const old = byKey.get(k);
    if (!old || item.rank < old.rank) byKey.set(k, item);
  }
  const symbols: BrokerSymbol[] = [...byKey.values()]
    .map((s) => ({ k: s.k, n: s.n, c: s.c, g: s.g, d: s.d, dg: s.dg, p: s.p, cs: s.cs, cb: s.cb, cp: s.cp }))
    .sort((a, b) => a.k.localeCompare(b.k));
  return {
    prefix: pre,
    suffix: suf,
    company: String(head.company ?? "").slice(0, 120) || null,
    server: String(head.server ?? "").slice(0, 120) || null,
    symbols,
  };
}

export async function saveBrokerSymbols(product: string, login: string, body: string) {
  const parsed = parseSymbols(body);
  if (!parsed.symbols.length) return 0;
  const values = { ...parsed, updatedAt: new Date(), refreshRequestedAt: null };
  await db()
    .insert(schema.brokerSymbols)
    .values({ product, login, ...values })
    .onConflictDoUpdate({ target: [schema.brokerSymbols.product, schema.brokerSymbols.login], set: values });
  return parsed.symbols.length;
}

export async function getBrokerSymbols(product: string, login: string) {
  const [row] = await db()
    .select()
    .from(schema.brokerSymbols)
    .where(and(eq(schema.brokerSymbols.product, product), eq(schema.brokerSymbols.login, login)));
  if (!row) return null;
  return { ...row, symbols: row.symbols as BrokerSymbol[] };
}

// Nomes que a conta pode ligar: os 8 de sempre + os que a corretora tem.
export async function allowedSymbolKeys(product: string, login: string) {
  const b = await getBrokerSymbols(product, login);
  return new Set<string>([...ROBOT_SYMBOLS, ...(b?.symbols.map((s) => s.k) ?? [])]);
}

// Portal pediu a lista de novo: o robô recebe "SYMS" na próxima consulta de 30 s.
export async function requestBrokerSymbols(product: string, login: string) {
  await db()
    .update(schema.brokerSymbols)
    .set({ refreshRequestedAt: new Date() })
    .where(and(eq(schema.brokerSymbols.product, product), eq(schema.brokerSymbols.login, login)));
}

// Pedido vale 10 min (robô antigo ignora a linha; não fica mandando pra sempre).
export async function symbolsRefreshPending(product: string, login: string) {
  const [row] = await db()
    .select({ at: schema.brokerSymbols.refreshRequestedAt })
    .from(schema.brokerSymbols)
    .where(and(eq(schema.brokerSymbols.product, product), eq(schema.brokerSymbols.login, login)));
  return !!row?.at && Date.now() - row.at.getTime() < 10 * 60_000;
}
