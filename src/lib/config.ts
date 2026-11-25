import "server-only";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/secret-box";
import { PAYMENT_METHODS, type MethodKey, type PublicPaymentMethod } from "@/lib/payment-methods";

// Configurações editáveis no admin (/admin/settings). Ficam na tabela `settings`; o que não foi salvo lá
// cai no .env do servidor (é assim que funcionava antes, então nada quebra).

export type BinanceTest = {
  at: string;
  ok: boolean;
  error?: string;
  permissions?: {
    reading: boolean;
    trading: boolean;
    withdrawals: boolean;
    transfers: boolean;
    ipRestrict: boolean;
  };
  deposits24h?: number;
  payOk?: boolean;
  payError?: string;
};

export type BinanceSettings = {
  apiKey?: string;
  apiSecretBox?: string;
  autoPay?: boolean;
  savedAt?: string;
  savedBy?: string;
  lastTest?: BinanceTest;
  walletCheck?: { at: string; results: Partial<Record<MethodKey, "ok" | "different" | "error">>; binanceAddresses?: Partial<Record<MethodKey, string>> };
};

export type SmtpSettings = { host?: string; port?: number; user?: string; passBox?: string; from?: string };
export type WalletSettings = Partial<Record<MethodKey, { value: string; enabled: boolean }>>;
export type AdminSettings = { emails: string[] };

type SettingsMap = {
  binance_config: BinanceSettings;
  smtp: SmtpSettings;
  wallets: WalletSettings;
  admins: AdminSettings;
  robot: { ddCap: number; ddDefault: number };
};

// Cache curto em memória (o site roda num processo só): evita ir no banco a cada página.
const cache = new Map<string, { value: unknown; at: number }>();
const CACHE_MS = 15_000;

export async function getSetting<K extends keyof SettingsMap>(key: K): Promise<SettingsMap[K] | null> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value as SettingsMap[K] | null;
  const [row] = await db().select().from(schema.settings).where(eq(schema.settings.key, key));
  const value = (row?.value as SettingsMap[K]) ?? null;
  cache.set(key, { value, at: Date.now() });
  return value;
}

export async function setSetting<K extends keyof SettingsMap>(key: K, value: SettingsMap[K]) {
  await db()
    .insert(schema.settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
  cache.delete(key);
}

export async function logEvent(actor: string, action: string, detail?: string) {
  try {
    await db().insert(schema.adminEvents).values({ actor, action, detail: detail?.slice(0, 1000) ?? null });
  } catch (error) {
    console.error("logEvent", error);
  }
}

export async function recentEvents(limit = 50) {
  return db().select().from(schema.adminEvents).orderBy(desc(schema.adminEvents.createdAt)).limit(limit);
}

export const seal = encryptSecret;

//--- Binance ---------------------------------------------------------------------------------------------------------
export type BinanceCreds = { apiKey: string; apiSecret: string; source: "admin" | "env" };

export async function getBinanceSettings() {
  return (await getSetting("binance_config")) ?? {};
}

export async function getBinanceCreds(): Promise<BinanceCreds | null> {
  const saved = await getBinanceSettings();
  const secret = decryptSecret(saved.apiSecretBox);
  if (saved.apiKey && secret) return { apiKey: saved.apiKey, apiSecret: secret, source: "admin" };
  if (process.env.BINANCE_API_KEY && process.env.BINANCE_API_SECRET) {
    return { apiKey: process.env.BINANCE_API_KEY, apiSecret: process.env.BINANCE_API_SECRET, source: "env" };
  }
  return null;
}

// Confirmação automática ligada = tem chave + o admin não desligou o interruptor.
export async function isAutoPayActive() {
  const [creds, saved] = await Promise.all([getBinanceCreds(), getBinanceSettings()]);
  return Boolean(creds) && saved.autoPay !== false;
}

//--- Email (SMTP) ----------------------------------------------------------------------------------------------------
export type SmtpConfig = { host: string; port: number; user: string; pass: string | null; from: string; source: "admin" | "env" };

export async function getSmtpConfig(): Promise<SmtpConfig> {
  const saved = (await getSetting("smtp")) ?? {};
  const pass = decryptSecret(saved.passBox) ?? process.env.SMTP_PASS ?? null;
  const user = saved.user || process.env.SMTP_USER || "";
  return {
    host: saved.host || process.env.SMTP_HOST || "smtp.hostinger.com",
    port: saved.port || Number(process.env.SMTP_PORT ?? 465),
    user,
    pass,
    from: saved.from || process.env.EMAIL_FROM || `Ai X TradeX <${user}>`,
    source: saved.passBox || saved.user ? "admin" : "env",
  };
}

//--- Carteiras -------------------------------------------------------------------------------------------------------
export async function getWallets() {
  const saved = (await getSetting("wallets")) ?? {};
  return PAYMENT_METHODS.map((m) => ({
    ...m,
    value: saved[m.key]?.value ?? m.defaultValue,
    enabled: saved[m.key]?.enabled ?? true,
  }));
}

export async function getPublicPaymentMethods(): Promise<PublicPaymentMethod[]> {
  const [wallets, auto] = await Promise.all([getWallets(), isAutoPayActive()]);
  return wallets
    .filter((w) => w.enabled && w.value)
    .map((w) => ({ key: w.key, value: w.value, auto: auto && w.auto }));
}

//--- Administradores -------------------------------------------------------------------------------------------------
const normalize = (e: string) => e.trim().toLowerCase();

// Os do .env (ADMIN_EMAILS) são os principais e não podem ser removidos pelo painel.
export async function getAdminEmails() {
  const owners = (process.env.ADMIN_EMAILS ?? "").split(",").map(normalize).filter(Boolean);
  const extra = ((await getSetting("admins"))?.emails ?? []).map(normalize).filter((e) => !owners.includes(e));
  return { owners, extra, all: [...owners, ...extra] };
}

export async function isAdmin(email: string) {
  return (await getAdminEmails()).all.includes(normalize(email));
}
