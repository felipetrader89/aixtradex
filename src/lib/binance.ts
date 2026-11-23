import "server-only";
import { createHmac } from "node:crypto";
import type { BinanceCreds } from "@/lib/config";

// Leitura da conta pessoal da Binance com chave de API SÓ LEITURA (sem saque, sem trade).
// Usa dois históricos: depósitos na rede (USDT TRC-20/ERC-20/BEP-20, USDC BASE, BTC...) e transferências Binance Pay.

// BINANCE_API_URL só existe pra teste (simulador local); em produção fica sem e usa a API oficial.
const BASE_URL = process.env.BINANCE_API_URL || "https://api.binance.com";

export class BinanceError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: number
  ) {
    super(message);
  }
}

// Traduz os erros mais comuns da Binance pra algo que dá pra agir.
function explain(status: number, body: string) {
  let code: number | undefined;
  let msg = body.slice(0, 200);
  try {
    const json = JSON.parse(body) as { code?: number; msg?: string };
    code = json.code;
    msg = json.msg ?? msg;
  } catch {}
  const hints: Record<number, string> = {
    [-2014]: "API Key em formato inválido - confira se copiou inteira.",
    [-2015]: "Chave recusada: API Key/Secret errados, IP do servidor não liberado na chave, ou permissão de leitura desligada.",
    [-1022]: "Assinatura inválida - a Secret Key não confere com a API Key.",
    [-1021]: "Relógio fora de sincronia com a Binance - tente de novo.",
  };
  return new BinanceError(code && hints[code] ? `${hints[code]} (${code})` : `Binance HTTP ${status}: ${msg}`, status, code);
}

async function signedGet<T>(creds: BinanceCreds, path: string, params: Record<string, string> = {}): Promise<T> {
  const query = new URLSearchParams({ ...params, recvWindow: "10000", timestamp: String(Date.now()) }).toString();
  const signature = createHmac("sha256", creds.apiSecret).update(query).digest("hex");
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}?${query}&signature=${signature}`, {
      headers: { "X-MBX-APIKEY": creds.apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    throw new BinanceError(`Sem resposta da Binance (${error instanceof Error ? error.message : "rede"}).`);
  }
  const text = await res.text();
  if (!res.ok) throw explain(res.status, text);
  return JSON.parse(text) as T;
}

export type IncomingPayment = {
  source: "deposit" | "pay";
  externalId: string;
  coin: string;
  network: string | null;
  amount: string;
  txId: string | null;
  sender: string | null;
  receivedAt: Date;
};

type DepositRow = { id?: string; amount: string; coin: string; network?: string; status: number; txId?: string; insertTime: number };
type PayRow = {
  transactionId: string;
  transactionTime: number;
  amount: string;
  currency: string;
  payerInfo?: { name?: string; binanceId?: number | string };
};

// Depósitos confirmados na rede desde `since`. Status 1 = sucesso; 6 = creditado (ainda sem poder sacar) — os dois contam.
export async function fetchDeposits(creds: BinanceCreds, since: Date): Promise<IncomingPayment[]> {
  const rows = await signedGet<DepositRow[]>(creds, "/sapi/v1/capital/deposit/hisrec", {
    startTime: String(since.getTime()),
    limit: "1000",
  });
  return rows
    .filter((d) => d.status === 1 || d.status === 6)
    .map((d) => ({
      source: "deposit",
      externalId: `deposit:${d.id ?? d.txId}`,
      coin: d.coin.toUpperCase(),
      network: d.network ?? null,
      amount: String(d.amount),
      txId: d.txId ?? null,
      sender: null,
      receivedAt: new Date(d.insertTime),
    }));
}

// Recebimentos pelo Binance Pay (valor positivo = entrou dinheiro).
export async function fetchPayReceipts(creds: BinanceCreds, since: Date): Promise<IncomingPayment[]> {
  const body = await signedGet<{ data?: PayRow[] }>(creds, "/sapi/v1/pay/transactions", {
    startTime: String(since.getTime()),
    limit: "100",
  });
  return (body.data ?? [])
    .filter((t) => Number(t.amount) > 0)
    .map((t) => ({
      source: "pay",
      externalId: `pay:${t.transactionId}`,
      coin: t.currency.toUpperCase(),
      network: "Binance Pay",
      amount: String(t.amount),
      txId: t.transactionId,
      sender: t.payerInfo?.name ?? (t.payerInfo?.binanceId ? `ID ${t.payerInfo.binanceId}` : null),
      receivedAt: new Date(t.transactionTime),
    }));
}

// Permissões da chave — usado pra RECUSAR chave com saque/trade ligado.
export type KeyPermissions = {
  reading: boolean;
  trading: boolean;
  withdrawals: boolean;
  transfers: boolean;
  ipRestrict: boolean;
};

export async function fetchKeyPermissions(creds: BinanceCreds): Promise<KeyPermissions> {
  const r = await signedGet<Record<string, boolean | number>>(creds, "/sapi/v1/account/apiRestrictions");
  return {
    reading: Boolean(r.enableReading),
    trading: Boolean(r.enableSpotAndMarginTrading || r.enableMargin || r.enableFutures || r.enableVanillaOptions || r.enablePortfolioMarginTrading),
    withdrawals: Boolean(r.enableWithdrawals),
    transfers: Boolean(r.enableInternalTransfer || r.permitsUniversalTransfer),
    ipRestrict: Boolean(r.ipRestrict),
  };
}

// Endereço de depósito da conta pra uma moeda/rede (pra conferir as carteiras do checkout).
export async function fetchDepositAddress(creds: BinanceCreds, coin: string, network: string) {
  const r = await signedGet<{ address: string; tag?: string }>(creds, "/sapi/v1/capital/deposit/address", { coin, network });
  return r.address;
}
