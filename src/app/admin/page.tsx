import { and, count, desc, eq, gt, gte, ilike, isNull, lte, or, sum } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PLACEHOLDER_EMAIL_DOMAIN } from "@/lib/auth";
import { getBinanceCreds, getBinanceSettings, getSmtpConfig } from "@/lib/config";
import { getBinanceState } from "@/lib/payments";
import { onlineCustomers } from "@/lib/activity";
import { Flash, PageHeader, Panel } from "@/components/admin/ui";
import { OrdersTable } from "@/components/admin/OrdersTable";

type Props = { searchParams: Promise<{ msg?: string }> };

export default async function AdminHome({ searchParams }: Props) {
  const { msg } = await searchParams;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayAgo = new Date(now.getTime() - 86_400_000);
  const weekAhead = new Date(now.getTime() + 7 * 86_400_000);

  const [[pending], [active], [online], [revenue], [expiring], pendingRows] = await Promise.all([
    db().select({ n: count() }).from(schema.orders).where(eq(schema.orders.status, "pending")),
    db()
      .select({ n: count() })
      .from(schema.licenses)
      .where(
        and(
          eq(schema.licenses.status, "active"),
          or(isNull(schema.licenses.expiresAt), gt(schema.licenses.expiresAt, now))
        )
      ),
    db().select({ n: count() }).from(schema.licenseAccounts).where(gte(schema.licenseAccounts.lastCheckAt, dayAgo)),
    db()
      .select({ total: sum(schema.orders.amountUsd) })
      .from(schema.orders)
      .where(and(eq(schema.orders.status, "paid"), gte(schema.orders.paidAt, monthStart))),
    db()
      .select({ n: count() })
      .from(schema.licenses)
      .where(
        and(
          eq(schema.licenses.status, "active"),
          gt(schema.licenses.expiresAt, now),
          lte(schema.licenses.expiresAt, weekAhead)
        )
      ),
    db()
      .select({ order: schema.orders, user: schema.users })
      .from(schema.orders)
      .innerJoin(schema.users, eq(schema.users.id, schema.orders.userId))
      .where(eq(schema.orders.status, "pending"))
      .orderBy(desc(schema.orders.createdAt))
      .limit(20),
  ]);

  const [creds, binance, smtp, state, [noEmail], [unmatched], [robot]] = await Promise.all([
    getBinanceCreds(),
    getBinanceSettings(),
    getSmtpConfig(),
    getBinanceState(),
    db().select({ n: count() }).from(schema.users).where(ilike(schema.users.email, `%@${PLACEHOLDER_EMAIL_DOMAIN}`)),
    db().select({ n: count() }).from(schema.cryptoDeposits).where(eq(schema.cryptoDeposits.status, "unmatched")),
    db().select({ n: count() }).from(schema.productVersions).where(eq(schema.productVersions.isCurrent, true)),
  ]);
  const walletChecks = Object.values(binance.walletCheck?.results ?? {});
  const binanceStale = !state || now.getTime() - new Date(state.lastRunAt).getTime() > 5 * 60_000;

  // O que falta pra tudo rodar sozinho.
  const checklist = [
    { done: Boolean(smtp.pass), label: "Email de envio configurado", href: "/admin/settings/email" },
    { done: Boolean(creds), label: "Binance conectada (chave só leitura)", href: "/admin/settings/binance" },
    {
      done: walletChecks.length > 0 && walletChecks.every((r) => r === "ok"),
      label: "Carteiras do checkout conferidas com a Binance",
      href: "/admin/settings/wallets",
    },
    { done: robot.n > 0, label: "Versão atual do robô disponível pra download", href: "/admin/files" },
    { done: noEmail.n === 0, label: `Email de todos os clientes importados (${noEmail.n} sem email)`, href: "/admin/licenses?filter=noemail" },
  ];
  const doneCount = checklist.filter((c) => c.done).length;

  // Avisos que pedem ação agora.
  const alerts = [
    creds && state && !state.ok ? { text: `Leitura da Binance com erro: ${state.error}`, href: "/admin/settings/binance" } : null,
    creds && binanceStale ? { text: "A leitura da Binance não roda há mais de 5 minutos.", href: "/admin/settings/system" } : null,
    unmatched.n > 0 ? { text: `${unmatched.n} recebimento(s) na Binance sem pedido - vincule ou ignore.`, href: "/admin/binance" } : null,
    expiring.n > 0 ? { text: `${expiring.n} licença(s) vencem nos próximos 7 dias.`, href: "/admin/licenses?filter=expiring" } : null,
  ].filter((a): a is { text: string; href: string } => Boolean(a));

  const onlineNow = await onlineCustomers();
  const stats = [
    { label: "Clientes online agora", value: onlineNow.length, href: "/admin/customers" },
    { label: "Pedidos pendentes", value: pending.n, href: "/admin/orders" },
    { label: "Licenças ativas", value: active.n, href: "/admin/licenses" },
    { label: "Contas MT4 online (24h)", value: online.n, href: "/admin/licenses" },
    { label: "Vencem em 7 dias", value: expiring.n, href: "/admin/licenses?filter=expiring" },
    { label: "Recebido no mês", value: `$${Number(revenue.total ?? 0).toFixed(0)}`, href: "/admin/orders?status=paid" },
  ];

  return (
    <div>
      <PageHeader title="Painel" description="Resumo do portal: vendas, licenças, robôs online e o que precisa da sua atenção." />
      <Flash msg={msg} />

      {alerts.length > 0 && (
        <div className="mb-6 flex flex-col gap-2">
          {alerts.map((a) => (
            <a
              key={a.text}
              href={a.href}
              className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 transition-colors hover:border-amber-400/60"
            >
              <span>⚠️ {a.text}</span>
              <span className="text-xs text-amber-300">Resolver →</span>
            </a>
          ))}
        </div>
      )}

      <div className="stagger mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <a
            key={s.label}
            href={s.href}
            className="panel-card rounded-2xl border border-brand-hairline bg-brand-surface/90 p-4"
          >
            <p className="font-display text-2xl font-extrabold text-chrome">{s.value}</p>
            <p className="mt-1 text-xs text-brand-ink-dim">{s.label}</p>
          </a>
        ))}
      </div>
      {doneCount < checklist.length && (
        <Panel title={`Configuração do portal - ${doneCount} de ${checklist.length}`} className="mb-6">
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-brand-surface-2">
            <div className="h-full rounded-full bg-brand-accent" style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
          </div>
          <ul className="flex flex-col gap-1">
            {checklist.map((c) => (
              <li key={c.label}>
                <a href={c.href} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-brand-surface-2">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      c.done ? "bg-brand-accent text-brand-bg" : "border border-brand-hairline text-brand-ink-dim"
                    }`}
                  >
                    {c.done ? "✓" : ""}
                  </span>
                  <span className={c.done ? "text-brand-ink-dim line-through" : "text-brand-ink"}>{c.label}</span>
                  {!c.done && <span className="ml-auto text-xs text-brand-accent">Fazer →</span>}
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Pedidos aguardando confirmação">
        <OrdersTable rows={pendingRows} back="/admin" />
      </Panel>
    </div>
  );
}
