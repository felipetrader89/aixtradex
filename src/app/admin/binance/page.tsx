import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getBinanceCreds, getBinanceSettings } from "@/lib/config";
import { getBinanceState } from "@/lib/payments";
import { approveDepositAction, ignoreDepositAction } from "@/app/actions/admin";
import { Badge, Flash, PageHeader, Panel, adminBtn, adminBtnGhost, adminInput, fmtDateTime } from "@/components/admin/ui";

type Props = { searchParams: Promise<{ msg?: string; filter?: string }> };

const FILTERS = [
  { value: "unmatched", label: "Sem pedido" },
  { value: "matched", label: "Pagaram pedido" },
  { value: "ignored", label: "Ignorados" },
  { value: "all", label: "Todos" },
] as const;

const STATUS = {
  matched: { tone: "ok", label: "Pagou pedido" },
  unmatched: { tone: "warn", label: "Sem pedido" },
  ignored: { tone: "muted", label: "Ignorado" },
} as const;

export default async function AdminBinance({ searchParams }: Props) {
  const { msg, filter = "unmatched" } = await searchParams;
  const [creds, settings, state] = await Promise.all([getBinanceCreds(), getBinanceSettings(), getBinanceState()]);
  const configured = Boolean(creds);
  const autoPay = settings.autoPay !== false;
  const statusFilter =
    filter === "matched" || filter === "unmatched" || filter === "ignored"
      ? eq(schema.cryptoDeposits.status, filter)
      : undefined;

  const deposits = await db()
    .select()
    .from(schema.cryptoDeposits)
    .where(statusFilter)
    .orderBy(desc(schema.cryptoDeposits.receivedAt))
    .limit(200);
  const orderIds = deposits.map((d) => d.orderId).filter((id): id is string => Boolean(id));
  const orders = orderIds.length
    ? await db()
        .select({ id: schema.orders.id, code: schema.orders.code })
        .from(schema.orders)
        .where(inArray(schema.orders.id, orderIds))
    : [];
  const back = `/admin/binance?filter=${filter}`;
  const lastRun = state ? new Date(state.lastRunAt) : null;
  const now = new Date();
  const stale = lastRun ? now.getTime() - lastRun.getTime() > 5 * 60_000 : true;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Recebimentos"
        description="Tudo que entrou na sua Binance (depósitos e Binance Pay). O que bateu com um pedido foi pago sozinho; o resto você vincula ou ignora."
      >
        <Link href="/admin/settings/binance" className={adminBtnGhost}>
          Configurar Binance
        </Link>
      </PageHeader>
      <Flash msg={msg} />

      <Panel title="Leitura automática da Binance">
        <div className="flex flex-wrap items-center gap-3 text-sm text-brand-ink">
          {!configured ? (
            <Badge tone="bad">Chave não configurada</Badge>
          ) : state?.ok && !stale ? (
            <Badge tone="ok">{autoPay ? "Funcionando" : "Lendo (confirmação automática desligada)"}</Badge>
          ) : (
            <Badge tone="bad">{stale ? "Parada" : "Com erro"}</Badge>
          )}
          <span className="text-brand-ink-dim">
            Última leitura: {fmtDateTime(lastRun)}
            {state?.ok ? ` · ${state.newDeposits ?? 0} novos · ${state.matched ?? 0} pedidos pagos` : ""}
          </span>
        </div>
        {state?.error && <p className="mt-3 break-all text-xs text-red-300">Erro: {state.error}</p>}
        {state?.payError && (
          <p className="mt-2 break-all text-xs text-amber-300">Binance Pay sem leitura (os depósitos na rede seguem): {state.payError}</p>
        )}
        <p className="mt-4 text-xs text-brand-ink-dim">
          A cada minuto o servidor lê os depósitos (USDT, USDC, BTC...) e os recebimentos do Binance Pay. Quando um
          depósito em USDT ou USDC tem exatamente o valor de um pedido pendente (ex.: 99.37), o pedido é pago sozinho, a
          licença é liberada e o cliente recebe o email. O resto aparece abaixo como &quot;Sem pedido&quot; pra você
          vincular ou ignorar.
        </p>
      </Panel>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <a
            key={f.value}
            href={`/admin/binance?filter=${f.value}`}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
              filter === f.value
                ? "bg-brand-accent text-brand-bg"
                : "border border-brand-hairline text-brand-ink-dim hover:text-brand-accent"
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      <Panel title={`Recebimentos (${deposits.length})`}>
        {deposits.length === 0 && <p className="text-sm text-brand-ink-dim">Nada por aqui.</p>}
        <ul className="flex flex-col gap-3">
          {deposits.map((d) => {
            const status = STATUS[d.status];
            const code = orders.find((o) => o.id === d.orderId)?.code;
            return (
              <li key={d.id} className="rounded-xl bg-brand-surface-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-bold text-brand-ink">
                        {Number(d.amount)} {d.coin}
                      </span>
                      <Badge tone={status.tone}>{status.label}</Badge>
                      {code && (
                        <a href={`/admin/orders?status=all&q=${code}`} className="font-mono text-xs text-brand-accent hover:underline">
                          {code}
                        </a>
                      )}
                    </p>
                    <p className="mt-1 break-all text-xs text-brand-ink-dim">
                      {fmtDateTime(d.receivedAt)} · {d.source === "pay" ? "Binance Pay" : `Depósito ${d.network ?? ""}`}
                      {d.sender ? ` · de ${d.sender}` : ""}
                      {d.txId ? ` · ${d.txId}` : ""}
                    </p>
                  </div>
                  {d.status !== "matched" && (
                    <div className="flex flex-wrap items-center gap-2">
                      {d.status === "unmatched" && (
                        <form action={approveDepositAction} className="flex gap-2">
                          <input type="hidden" name="depositId" value={d.id} />
                          <input type="hidden" name="back" value={back} />
                          <input name="orderCode" required placeholder="AX-XXXXXX" className={`${adminInput} w-32 font-mono`} />
                          <button type="submit" className={adminBtn}>
                            Pagar pedido
                          </button>
                        </form>
                      )}
                      <form action={ignoreDepositAction}>
                        <input type="hidden" name="depositId" value={d.id} />
                        <input type="hidden" name="back" value={back} />
                        <input type="hidden" name="status" value={d.status === "ignored" ? "unmatched" : "ignored"} />
                        <button type="submit" className={adminBtnGhost}>
                          {d.status === "ignored" ? "Voltar pra lista" : "Não é de cliente"}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
