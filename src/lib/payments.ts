import "server-only";
import { and, eq, gte, isNotNull, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { binanceConfigured, fetchDeposits, fetchPayReceipts, type IncomingPayment } from "@/lib/binance";
import { approveOrder } from "@/lib/licensing";
import { notifyOrderPaid } from "@/lib/notify";

// Moedas que pagam pedido sozinhas (1 USDT/USDC = 1 USD). BTC/ETH/LTC ficam registrados, mas o admin aprova.
const STABLE = new Set(["USDT", "USDC"]);
// Janela: o pedido tem que existir antes do depósito (5 min de folga pro relógio) e ter no máximo 7 dias.
const ORDER_MAX_AGE_MS = 7 * 86_400_000;
const CLOCK_SLACK_MS = 5 * 60_000;
// Na primeira leitura olha só as últimas 24h; depois, sempre os últimos 3 dias (o banco ignora o que já viu).
const FIRST_LOOKBACK_MS = 86_400_000;
const LOOKBACK_MS = 3 * 86_400_000;

export const BINANCE_STATE_KEY = "binance";

export type BinanceState = {
  lastRunAt: string;
  ok: boolean;
  error?: string;
  newDeposits?: number;
  matched?: number;
  payError?: string;
};

async function saveState(state: BinanceState) {
  await db()
    .insert(schema.settings)
    .values({ key: BINANCE_STATE_KEY, value: state })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: state, updatedAt: new Date() } });
}

export async function getBinanceState(): Promise<BinanceState | null> {
  const [row] = await db().select().from(schema.settings).where(eq(schema.settings.key, BINANCE_STATE_KEY));
  return (row?.value as BinanceState) ?? null;
}

// Acha o único pedido pendente com exatamente esse valor. Mais de um (ou nenhum) = deixa pro admin.
async function findOrderFor(payment: IncomingPayment) {
  if (!STABLE.has(payment.coin)) return null;
  const amount = Number(payment.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const exact = amount.toFixed(2);
  if (Math.abs(amount - Number(exact)) > 0.000001) return null; // 99.375 não é 99.37
  const received = payment.receivedAt.getTime();
  const candidates = await db()
    .select({ id: schema.orders.id, code: schema.orders.code })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.status, "pending"),
        isNotNull(schema.orders.payAmount),
        eq(schema.orders.payAmount, exact),
        lte(schema.orders.createdAt, new Date(received + CLOCK_SLACK_MS)),
        gte(schema.orders.createdAt, new Date(received - ORDER_MAX_AGE_MS))
      )
    );
  return candidates.length === 1 ? candidates[0] : null;
}

// Rodado a cada minuto pelo timer da VPS (pulse-binance.timer → /api/cron/binance).
export async function syncBinance(): Promise<BinanceState> {
  const startedAt = new Date();
  if (!binanceConfigured()) {
    const state = { lastRunAt: startedAt.toISOString(), ok: false, error: "Chave da Binance não configurada." };
    await saveState(state);
    return state;
  }

  const previous = await getBinanceState();
  const since = new Date(startedAt.getTime() - (previous?.ok ? LOOKBACK_MS : FIRST_LOOKBACK_MS));
  const state: BinanceState = { lastRunAt: startedAt.toISOString(), ok: true, newDeposits: 0, matched: 0 };

  let incoming: IncomingPayment[] = [];
  try {
    incoming = await fetchDeposits(since);
  } catch (error) {
    state.ok = false;
    state.error = String(error instanceof Error ? error.message : error).slice(0, 500);
  }
  // Binance Pay é opcional: se essa permissão falhar, os depósitos na rede continuam funcionando.
  try {
    incoming = incoming.concat(await fetchPayReceipts(since));
  } catch (error) {
    state.payError = String(error instanceof Error ? error.message : error).slice(0, 500);
  }

  for (const payment of incoming.sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime())) {
    const [saved] = await db()
      .insert(schema.cryptoDeposits)
      .values({
        source: payment.source,
        externalId: payment.externalId,
        coin: payment.coin,
        network: payment.network,
        amount: payment.amount,
        txId: payment.txId,
        sender: payment.sender,
        receivedAt: payment.receivedAt,
      })
      .onConflictDoNothing()
      .returning({ id: schema.cryptoDeposits.id });
    if (!saved) continue; // já visto antes
    state.newDeposits! += 1;

    const order = await findOrderFor(payment);
    if (!order) continue;
    const via = `Binance ${payment.source === "pay" ? "Pay" : payment.network ?? "depósito"} · ${payment.amount} ${payment.coin}`;
    const result = await approveOrder(order.id, { method: "binance", ref: `${payment.externalId}` });
    if (!result.ok) continue;
    await db()
      .update(schema.cryptoDeposits)
      .set({ status: "matched", orderId: order.id })
      .where(eq(schema.cryptoDeposits.id, saved.id));
    state.matched! += 1;
    await notifyOrderPaid(order.id, via);
  }

  await saveState(state);
  return state;
}
