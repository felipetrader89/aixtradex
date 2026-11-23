import "server-only";
import { createHmac } from "node:crypto";

// Leitura da conta pessoal da Binance com chave de API SÓ LEITURA (sem saque, sem trade).
// Usa dois históricos: depósitos na rede (USDT TRC-20/ERC-20/BEP-20, USDC BASE, BTC...) e transferências Binance Pay.

// BINANCE_API_URL só existe pra teste (simulador local); em produção fica sem e usa a API oficial.
const BASE_URL = process.env.BINANCE_API_URL || "https://api.binance.com";

export const binanceConfigured = () => Boolean(process.env.BINANCE_API_KEY && process.env.BINANCE_API_SECRET);

async function signedGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams({ ...params, recvWindow: "10000", timestamp: String(Date.now()) }).toString();
  const signature = createHmac("sha256", process.env.BINANCE_API_SECRET!).update(query).digest("hex");
  const res = await fetch(`${BASE_URL}${path}?${query}&signature=${signature}`, {
    headers: { "X-MBX-APIKEY": process.env.BINANCE_API_KEY! },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Binance ${path}: HTTP ${res.status} ${text.slice(0, 300)}`);
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

type DepositRow = {
  id?: string;
  amount: string;
  coin: string;
  network?: string;
  status: number;
  txId?: string;
  insertTime: number;
};

type PayRow = {
  transactionId: string;
  transactionTime: number;
  amount: string;
  currency: string;
  orderType?: string;
  payerInfo?: { name?: string; binanceId?: number | string };
};

// Depósitos confirmados na rede desde `since`. Status 1 = sucesso; 6 = creditado (ainda sem poder sacar) — os dois contam.
export async function fetchDeposits(since: Date): Promise<IncomingPayment[]> {
  const rows = await signedGet<DepositRow[]>("/sapi/v1/capital/deposit/hisrec", {
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
export async function fetchPayReceipts(since: Date): Promise<IncomingPayment[]> {
  const body = await signedGet<{ code?: string; data?: PayRow[] }>("/sapi/v1/pay/transactions", {
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
