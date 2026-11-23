import { approveOrderAction, cancelOrderAction } from "@/app/actions/admin";
import { Badge, adminBtn, adminBtnDanger, adminInput, fmtDateTime, usd } from "@/components/admin/ui";
import { partnerBrokers } from "@/lib/site-config";
import type { Order, User } from "@/lib/db/schema";

const STATUS = {
  pending: { tone: "warn", label: "Pendente" },
  paid: { tone: "ok", label: "Pago" },
  cancelled: { tone: "muted", label: "Cancelado" },
} as const;

export function OrdersTable({ rows, back }: { rows: { order: Order; user: User }[]; back: string }) {
  if (rows.length === 0) return <p className="text-sm text-brand-ink-dim">Nenhum pedido aqui.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {rows.map(({ order, user }) => {
        const broker = partnerBrokers.find((b) => b.slug === order.broker)?.name;
        const status = STATUS[order.status];
        return (
          <li key={order.id} className="rounded-xl bg-brand-surface-2 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold text-brand-ink">{order.code}</span>
                  <Badge tone={status.tone}>{status.label}</Badge>
                  <span className="text-xs text-brand-ink-dim">{fmtDateTime(order.createdAt)}</span>
                </p>
                <p className="mt-1 text-sm text-brand-ink">
                  {user.name ?? "-"} · {user.country ?? "-"} ·{" "}
                  <a href={`/admin/licenses?q=${encodeURIComponent(user.email)}`} className="text-brand-accent hover:underline">
                    {user.email}
                  </a>
                </p>
                <p className="mt-1 text-xs text-brand-ink-dim">
                  {order.plan === "monthly" ? "Mensal" : "Vitalícia"}
                  {order.licenseId && order.mt4Logins.length === 0 ? " (renovação)" : ""} ·{" "}
                  <strong className="text-brand-ink">{usd(order.amountUsd)}</strong>
                  {order.payAmount ? ` (exato: ${Number(order.payAmount).toFixed(2)} USDT/USDC)` : ""}
                  {broker ? ` · desconto IB ${broker}` : ""}
                  {order.mt4Logins.length ? ` · MT4: ${order.mt4Logins.join(", ")}` : ""}
                </p>
                {order.status === "paid" && (
                  <p className="mt-1 text-xs text-brand-ink-dim">
                    Pago em {fmtDateTime(order.paidAt)} via {order.paymentMethod ?? "-"}
                    {order.paymentRef ? ` · ref ${order.paymentRef}` : ""}
                  </p>
                )}
              </div>
              {order.status === "pending" && (
                <div className="flex flex-wrap items-center gap-2">
                  <form action={approveOrderAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="back" value={back} />
                    <select name="method" className={adminInput} defaultValue="usdt">
                      <option value="usdt">USDT</option>
                      <option value="binance-pay">Binance Pay</option>
                      <option value="btc">BTC</option>
                      <option value="usdc">USDC</option>
                      <option value="eth">ETH</option>
                      <option value="ltc">LTC</option>
                      <option value="manual">Outro</option>
                    </select>
                    <input name="ref" placeholder="TxID / ref (opcional)" className={`${adminInput} w-44`} />
                    <button type="submit" className={adminBtn}>
                      ✓ Aprovar
                    </button>
                  </form>
                  <form action={cancelOrderAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="back" value={back} />
                    <button type="submit" className={adminBtnDanger}>
                      Cancelar
                    </button>
                  </form>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
