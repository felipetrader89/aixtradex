import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { isPlaceholderEmail } from "@/lib/auth";
import { compareAccounts, liveState, statsFor, type AccountLiveState } from "@/lib/account-stats";
import { PRODUCT } from "@/lib/plans";
import { Badge, PageHeader, Panel, adminBtn, adminInput, fmtDateTime } from "@/components/admin/ui";

type Props = { searchParams: Promise<{ q?: string; filter?: string }> };

const STATE: Record<AccountLiveState, { label: string; tone: "ok" | "warn" | "bad" | "muted" }> = {
  running: { label: "operando", tone: "ok" },
  autotradingOff: { label: "AutoTrading desligado", tone: "warn" },
  inactive: { label: "sem sinal", tone: "bad" },
  waiting: { label: "sem dados ainda", tone: "muted" },
};

const FILTERS = [
  { value: "all", label: "Todas" },
  { value: "running", label: "Operando" },
  { value: "problem", label: "Sem sinal / AutoTrading off" },
  { value: "waiting", label: "Sem dados (robô antigo)" },
] as const;

const money = (v: string | number, cur?: string | null) =>
  `${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${cur ? ` ${cur}` : ""}`;
const tone = (v: string | number) => (Number(v) > 0 ? "text-brand-accent" : Number(v) < 0 ? "text-red-400" : "text-brand-ink-dim");

export default async function AdminAccounts({ searchParams }: Props) {
  const { q = "", filter = "all" } = await searchParams;
  const term = q.trim().toLowerCase();

  const rows = await db()
    .select({ account: schema.licenseAccounts, license: schema.licenses, user: schema.users })
    .from(schema.licenseAccounts)
    .innerJoin(schema.licenses, eq(schema.licenses.id, schema.licenseAccounts.licenseId))
    .innerJoin(schema.users, eq(schema.users.id, schema.licenses.userId))
    .where(eq(schema.licenseAccounts.product, PRODUCT.slug));
  const stats = await statsFor(
    PRODUCT.slug,
    rows.map((r) => r.account.login)
  );
  const now = new Date();
  const list = rows
    .map((r) => {
      const s = stats.get(r.account.login);
      return { ...r, stats: s, state: liveState(s, now) };
    })
    .filter((r) =>
      term
        ? [r.account.login, r.user.email, r.user.name ?? "", r.stats?.company ?? "", r.stats?.server ?? "", r.license.key]
            .join(" ")
            .toLowerCase()
            .includes(term)
        : true
    )
    .filter((r) =>
      filter === "running"
        ? r.state === "running"
        : filter === "problem"
          ? r.state === "inactive" || r.state === "autotradingOff"
          : filter === "waiting"
            ? r.state === "waiting"
            : true
    )
    .sort(compareAccounts);

  const counts = { running: 0, autotradingOff: 0, inactive: 0, waiting: 0 };
  for (const r of rows) counts[liveState(stats.get(r.account.login), now)]++;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Contas MT4"
        description="Todas as contas cadastradas nas licenças, com os dados que o robô envia a cada 5 min (versão do robô de 2026-11-24 em diante). Sem sinal = mais de 15 min sem enviar."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(Object.keys(counts) as AccountLiveState[]).map((k) => (
          <div key={k} className="panel-card rounded-2xl border border-brand-hairline bg-brand-surface/90 p-4">
            <p className="text-xs text-brand-ink-dim">{STATE[k].label}</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-chrome">{counts[k]}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={`/admin/accounts?filter=${f.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-full px-3 py-1.5 text-xs ${filter === f.value ? "bg-brand-accent text-brand-bg" : "bg-brand-surface-2 text-brand-ink-dim"}`}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <form className="flex gap-2">
          <input type="hidden" name="filter" value={filter} />
          <input name="q" defaultValue={q} placeholder="Conta, email, corretora..." className={`${adminInput} w-56`} />
          <button type="submit" className={adminBtn}>
            Buscar
          </button>
        </form>
      </div>

      <Panel title={`Contas (${list.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="text-brand-ink-dim">
              <tr>
                <th className="py-2 pr-3 font-medium">Conta</th>
                <th className="py-2 pr-3 font-medium">Cliente</th>
                <th className="py-2 pr-3 font-medium">Corretora</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 text-right font-medium">Saldo</th>
                <th className="py-2 pr-3 text-right font-medium">Flutuante</th>
                <th className="py-2 pr-3 text-right font-medium">Hoje</th>
                <th className="py-2 pr-3 text-right font-medium">Mês</th>
                <th className="py-2 font-medium">Atualizado</th>
              </tr>
            </thead>
            <tbody className="text-brand-ink">
              {list.map(({ account, license, user, stats: s, state }) => (
                <tr key={account.id} className="border-t border-brand-hairline align-top">
                  <td className="py-2 pr-3">
                    <p className="font-mono font-semibold">{account.login}</p>
                    <p className="font-mono text-[10px] text-brand-ink-dim">{license.key}</p>
                  </td>
                  <td className="py-2 pr-3">
                    <p>{user.name ?? "-"}</p>
                    <p className="text-[10px] text-brand-ink-dim">{isPlaceholderEmail(user.email) ? "sem email" : user.email}</p>
                  </td>
                  <td className="py-2 pr-3">
                    <p>{s?.company ?? "-"}</p>
                    <p className="text-[10px] text-brand-ink-dim">{s?.server ?? account.lastServer ?? ""}</p>
                  </td>
                  <td className="py-2 pr-3">
                    <Badge tone={STATE[state].tone}>{STATE[state].label}</Badge>
                  </td>
                  <td className="py-2 pr-3 text-right font-mono">{s ? money(s.balance, s.currency) : "-"}</td>
                  <td className={`py-2 pr-3 text-right font-mono ${s ? tone(s.floating) : ""}`}>
                    {s ? `${money(s.floating)} (${s.openOrders})` : "-"}
                  </td>
                  <td className={`py-2 pr-3 text-right font-mono ${s ? tone(s.resultToday) : ""}`}>{s ? money(s.resultToday) : "-"}</td>
                  <td className={`py-2 pr-3 text-right font-mono ${s ? tone(s.resultMonth) : ""}`}>{s ? money(s.resultMonth) : "-"}</td>
                  <td className="py-2 text-brand-ink-dim">{s ? fmtDateTime(s.reportedAt) : fmtDateTime(account.lastCheckAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
