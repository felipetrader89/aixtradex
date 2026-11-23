import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { Flash, Panel, adminBtn, adminInput } from "@/components/admin/ui";
import { OrdersTable } from "@/components/admin/OrdersTable";

type Props = { searchParams: Promise<{ status?: string; q?: string; msg?: string }> };

const FILTERS = [
  { value: "pending", label: "Pendentes" },
  { value: "paid", label: "Pagos" },
  { value: "cancelled", label: "Cancelados" },
  { value: "all", label: "Todos" },
] as const;

export default async function AdminOrders({ searchParams }: Props) {
  const { status = "pending", q = "", msg } = await searchParams;
  const term = q.trim();
  const statusFilter =
    status === "pending" || status === "paid" || status === "cancelled" ? eq(schema.orders.status, status) : undefined;
  const search = term
    ? or(
        ilike(schema.orders.code, `%${term}%`),
        ilike(schema.users.email, `%${term}%`),
        ilike(schema.users.name, `%${term}%`)
      )
    : undefined;

  const rows = await db()
    .select({ order: schema.orders, user: schema.users })
    .from(schema.orders)
    .innerJoin(schema.users, eq(schema.users.id, schema.orders.userId))
    .where(and(statusFilter, search))
    .orderBy(desc(schema.orders.createdAt))
    .limit(200);

  const back = `/admin/orders?status=${status}${term ? `&q=${encodeURIComponent(term)}` : ""}`;

  return (
    <div>
      <Flash msg={msg} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <a
              key={f.value}
              href={`/admin/orders?status=${f.value}`}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                status === f.value
                  ? "bg-brand-accent text-brand-bg"
                  : "border border-brand-hairline text-brand-ink-dim hover:text-brand-accent"
              }`}
            >
              {f.label}
            </a>
          ))}
        </div>
        <form className="flex gap-2">
          <input type="hidden" name="status" value={status} />
          <input name="q" defaultValue={term} placeholder="Pedido, email ou nome" className={adminInput} />
          <button type="submit" className={adminBtn}>
            Buscar
          </button>
        </form>
      </div>
      <Panel title={`Pedidos (${rows.length})`}>
        <OrdersTable rows={rows} back={back} />
      </Panel>
    </div>
  );
}
