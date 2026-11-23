import { and, count, desc, eq, gt, gte, isNull, lte, or, sum } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { Flash, Panel } from "@/components/admin/ui";
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

  const stats = [
    { label: "Pedidos pendentes", value: pending.n, href: "/admin/orders" },
    { label: "Licenças ativas", value: active.n, href: "/admin/licenses" },
    { label: "Contas MT4 online (24h)", value: online.n, href: "/admin/licenses" },
    { label: "Vencem em 7 dias", value: expiring.n, href: "/admin/licenses?filter=expiring" },
    { label: "Recebido no mês", value: `$${Number(revenue.total ?? 0).toFixed(0)}`, href: "/admin/orders?status=paid" },
  ];

  return (
    <div>
      <Flash msg={msg} />
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <a
            key={s.label}
            href={s.href}
            className="rounded-2xl border border-brand-hairline bg-brand-surface p-4 transition-colors hover:border-brand-accent"
          >
            <p className="font-display text-2xl font-extrabold text-chrome">{s.value}</p>
            <p className="mt-1 text-xs text-brand-ink-dim">{s.label}</p>
          </a>
        ))}
      </div>
      <Panel title="Pedidos aguardando confirmação">
        <OrdersTable rows={pendingRows} back="/admin" />
      </Panel>
    </div>
  );
}
