import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PLACEHOLDER_EMAIL_DOMAIN, isPlaceholderEmail } from "@/lib/auth";
import { licenseState } from "@/lib/licensing";
import { Badge, PageHeader, Panel, adminBtn, adminInput, fmtDate, usd } from "@/components/admin/ui";

type Props = { searchParams: Promise<{ q?: string; filter?: string }> };

const FILTERS = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Com licença ativa" },
  { value: "noemail", label: "Sem email" },
] as const;

export default async function AdminCustomers({ searchParams }: Props) {
  const { q = "", filter = "all" } = await searchParams;
  const term = q.trim();
  const search = term
    ? or(ilike(schema.users.email, `%${term}%`), ilike(schema.users.name, `%${term}%`), ilike(schema.users.country, `%${term}%`))
    : undefined;
  const noEmail = filter === "noemail" ? ilike(schema.users.email, `%@${PLACEHOLDER_EMAIL_DOMAIN}`) : undefined;

  const users = await db()
    .select()
    .from(schema.users)
    .where(and(search, noEmail))
    .orderBy(desc(schema.users.createdAt))
    .limit(300);
  const ids = users.map((u) => u.id);
  const [licenses, orders] = ids.length
    ? await Promise.all([
        db().select().from(schema.licenses).where(inArray(schema.licenses.userId, ids)),
        db()
          .select({ userId: schema.orders.userId, status: schema.orders.status, amountUsd: schema.orders.amountUsd })
          .from(schema.orders)
          .where(and(inArray(schema.orders.userId, ids), eq(schema.orders.status, "paid"))),
      ])
    : [[], []];

  const now = new Date();
  const rows = users
    .map((user) => {
      const own = licenses.filter((l) => l.userId === user.id);
      const active = own.filter((l) => licenseState(l, now) === "active");
      const nextExpiry = active
        .map((l) => l.expiresAt)
        .filter((d): d is Date => Boolean(d))
        .sort((a, b) => a.getTime() - b.getTime())[0];
      const paid = orders.filter((o) => o.userId === user.id).reduce((sum, o) => sum + Number(o.amountUsd), 0);
      return { user, total: own.length, active: active.length, lifetime: active.some((l) => !l.expiresAt), nextExpiry, paid };
    })
    .filter((r) => (filter === "active" ? r.active > 0 : true));

  return (
    <div>
      <PageHeader title="Clientes" description="Todo mundo que já comprou ou tem licença. Clique no email pra ver as licenças da pessoa." />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <a
              key={f.value}
              href={`/admin/customers?filter=${f.value}`}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                filter === f.value ? "bg-brand-accent text-brand-bg" : "border border-brand-hairline text-brand-ink-dim hover:text-brand-accent"
              }`}
            >
              {f.label}
            </a>
          ))}
        </div>
        <form className="flex gap-2">
          <input type="hidden" name="filter" value={filter} />
          <input name="q" defaultValue={term} placeholder="Nome, email ou país" className={adminInput} />
          <button type="submit" className={adminBtn}>
            Buscar
          </button>
        </form>
      </div>

      <Panel title={`Clientes (${rows.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-brand-ink-dim">
              <tr>
                <th className="py-2 pr-4 font-medium">Cliente</th>
                <th className="py-2 pr-4 font-medium">Licenças</th>
                <th className="py-2 pr-4 font-medium">Vence</th>
                <th className="py-2 pr-4 font-medium">Pago pelo site</th>
                <th className="py-2 font-medium">Desde</th>
              </tr>
            </thead>
            <tbody className="text-brand-ink">
              {rows.map(({ user, total, active, lifetime, nextExpiry, paid }) => (
                <tr key={user.id} className="border-t border-brand-hairline">
                  <td className="py-2.5 pr-4">
                    <p className="font-medium">{user.name ?? "-"}</p>
                    {isPlaceholderEmail(user.email) ? (
                      <a href={`/admin/licenses?q=${encodeURIComponent(user.name ?? "")}`}>
                        <Badge tone="warn">sem email</Badge>
                      </a>
                    ) : (
                      <a href={`/admin/licenses?q=${encodeURIComponent(user.email)}`} className="text-xs text-brand-accent hover:underline">
                        {user.email}
                      </a>
                    )}
                    {user.country && <span className="ml-2 text-xs text-brand-ink-dim">{user.country}</span>}
                  </td>
                  <td className="py-2.5 pr-4">
                    {active > 0 ? <Badge tone="ok">{active} ativa(s)</Badge> : total > 0 ? <Badge tone="warn">vencida</Badge> : <Badge tone="muted">nenhuma</Badge>}
                  </td>
                  <td className="py-2.5 pr-4 text-xs">{lifetime ? "Vitalícia" : nextExpiry ? fmtDate(nextExpiry) : "-"}</td>
                  <td className="py-2.5 pr-4 text-xs">{paid ? usd(paid) : "-"}</td>
                  <td className="py-2.5 text-xs text-brand-ink-dim">{fmtDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
