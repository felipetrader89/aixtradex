import { and, desc, eq, gt, ilike, inArray, isNotNull, lte, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { licenseState } from "@/lib/licensing";
import {
  createManualLicenseAction,
  extendLicenseAction,
  saveLicenseNotesAction,
  setLicenseAccountsAction,
  setLicenseOwnerAction,
  setLicenseStatusAction,
} from "@/app/actions/admin";
import { PLACEHOLDER_EMAIL_DOMAIN, isPlaceholderEmail } from "@/lib/auth";
import {
  Badge,
  Flash,
  Panel,
  adminBtn,
  adminBtnDanger,
  adminBtnGhost,
  adminInput,
  fmtDate,
  fmtDateTime,
} from "@/components/admin/ui";

type Props = { searchParams: Promise<{ q?: string; filter?: string; msg?: string }> };

const FILTERS = [
  { value: "all", label: "Todas" },
  { value: "expiring", label: "Vencem em 7 dias" },
  { value: "expired", label: "Vencidas" },
  { value: "suspended", label: "Bloqueadas" },
  { value: "noemail", label: "Sem email" },
] as const;

const STATE = {
  active: { tone: "ok", label: "Ativa" },
  expired: { tone: "warn", label: "Vencida" },
  suspended: { tone: "bad", label: "Bloqueada" },
} as const;

export default async function AdminLicenses({ searchParams }: Props) {
  const { q = "", filter = "all", msg } = await searchParams;
  const term = q.trim();
  const now = new Date();

  const search = term
    ? or(
        ilike(schema.users.email, `%${term}%`),
        ilike(schema.users.name, `%${term}%`),
        ilike(schema.licenses.key, `%${term}%`),
        ilike(schema.licenses.notes, `%${term}%`),
        inArray(
          schema.licenses.id,
          db()
            .select({ id: schema.licenseAccounts.licenseId })
            .from(schema.licenseAccounts)
            .where(ilike(schema.licenseAccounts.login, `%${term}%`))
        )
      )
    : undefined;
  const filterSql =
    filter === "expiring"
      ? and(
          eq(schema.licenses.status, "active"),
          gt(schema.licenses.expiresAt, now),
          lte(schema.licenses.expiresAt, new Date(now.getTime() + 7 * 86_400_000))
        )
      : filter === "expired"
        ? and(isNotNull(schema.licenses.expiresAt), lte(schema.licenses.expiresAt, now))
        : filter === "suspended"
          ? eq(schema.licenses.status, "suspended")
          : filter === "noemail"
            ? ilike(schema.users.email, `%@${PLACEHOLDER_EMAIL_DOMAIN}`)
            : undefined;

  const rows = await db()
    .select({ license: schema.licenses, user: schema.users })
    .from(schema.licenses)
    .innerJoin(schema.users, eq(schema.users.id, schema.licenses.userId))
    .where(and(search, filterSql))
    .orderBy(desc(schema.licenses.createdAt))
    .limit(200);
  const accounts = rows.length
    ? await db()
        .select()
        .from(schema.licenseAccounts)
        .where(
          inArray(
            schema.licenseAccounts.licenseId,
            rows.map((r) => r.license.id)
          )
        )
        .orderBy(schema.licenseAccounts.id)
    : [];

  const back = `/admin/licenses?filter=${filter}${term ? `&q=${encodeURIComponent(term)}` : ""}`;

  return (
    <div>
      <Flash msg={msg} />

      <details className="mb-6 rounded-2xl border border-brand-hairline bg-brand-surface p-5">
        <summary className="cursor-pointer text-sm font-semibold text-brand-accent">+ Criar licença manual</summary>
        <form action={createManualLicenseAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="back" value={back} />
          <input name="email" type="email" required placeholder="Email do cliente" className={adminInput} />
          <input name="name" placeholder="Nome e sobrenome" className={adminInput} />
          <input name="country" placeholder="País" className={adminInput} />
          <select name="plan" className={adminInput} defaultValue="monthly">
            <option value="monthly">Mensal (até 2 contas)</option>
            <option value="lifetime">Vitalícia (até 5 contas)</option>
          </select>
          <input name="days" type="number" min={1} defaultValue={30} placeholder="Dias (mensal)" className={adminInput} />
          <input name="logins" placeholder="Contas MT4 (separadas por vírgula)" className={adminInput} />
          <input name="notes" placeholder="Anotação (opcional)" className={`${adminInput} sm:col-span-2`} />
          <div>
            <button type="submit" className={adminBtn}>
              Criar licença
            </button>
          </div>
        </form>
      </details>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <a
              key={f.value}
              href={`/admin/licenses?filter=${f.value}`}
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
        <form className="flex gap-2">
          <input type="hidden" name="filter" value={filter} />
          <input name="q" defaultValue={term} placeholder="Email, nome, chave ou conta MT4" className={`${adminInput} w-64`} />
          <button type="submit" className={adminBtn}>
            Buscar
          </button>
        </form>
      </div>

      <Panel title={`Licenças (${rows.length})`}>
        {rows.length === 0 && <p className="text-sm text-brand-ink-dim">Nenhuma licença encontrada.</p>}
        <ul className="flex flex-col gap-4">
          {rows.map(({ license, user }) => {
            const state = STATE[licenseState(license, now)];
            const own = accounts.filter((a) => a.licenseId === license.id);
            return (
              <li key={license.id} className="rounded-xl bg-brand-surface-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-brand-accent">{license.key}</span>
                      <Badge tone={state.tone}>{state.label}</Badge>
                      <span className="text-xs text-brand-ink-dim">
                        {license.plan === "monthly" ? "Mensal" : "Vitalícia"} · desde {fmtDate(license.createdAt)}
                        {license.expiresAt ? ` · vence ${fmtDate(license.expiresAt)}` : ""}
                      </span>
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-brand-ink">
                      {user.name ?? "-"} · {user.country ?? "-"} ·{" "}
                      {isPlaceholderEmail(user.email) ? <Badge tone="warn">sem email</Badge> : user.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {license.plan === "monthly" && (
                      <form action={extendLicenseAction} className="flex gap-1">
                        <input type="hidden" name="licenseId" value={license.id} />
                        <input type="hidden" name="back" value={back} />
                        <input name="days" type="number" min={1} defaultValue={30} className={`${adminInput} w-16`} />
                        <button type="submit" className={adminBtnGhost}>
                          + dias
                        </button>
                      </form>
                    )}
                    <form action={setLicenseStatusAction}>
                      <input type="hidden" name="licenseId" value={license.id} />
                      <input type="hidden" name="back" value={back} />
                      <input
                        type="hidden"
                        name="status"
                        value={license.status === "suspended" ? "active" : "suspended"}
                      />
                      <button type="submit" className={license.status === "suspended" ? adminBtnGhost : adminBtnDanger}>
                        {license.status === "suspended" ? "Reativar" : "Bloquear"}
                      </button>
                    </form>
                  </div>
                </div>

                <table className="mt-4 w-full text-left text-xs">
                  <thead className="text-brand-ink-dim">
                    <tr>
                      <th className="py-1 pr-3 font-medium">Conta MT4</th>
                      <th className="py-1 pr-3 font-medium">Última checagem</th>
                      <th className="py-1 pr-3 font-medium">Versão</th>
                      <th className="hidden py-1 pr-3 font-medium sm:table-cell">Servidor</th>
                      <th className="hidden py-1 font-medium md:table-cell">IP</th>
                    </tr>
                  </thead>
                  <tbody className="text-brand-ink">
                    {own.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-1 text-brand-ink-dim">
                          Nenhuma conta cadastrada.
                        </td>
                      </tr>
                    )}
                    {own.map((a) => (
                      <tr key={a.id} className="border-t border-brand-hairline">
                        <td className="py-1.5 pr-3 font-mono">{a.login}</td>
                        <td className="py-1.5 pr-3">{fmtDateTime(a.lastCheckAt)}</td>
                        <td className="py-1.5 pr-3">{a.lastEaVersion ?? "-"}</td>
                        <td className="hidden py-1.5 pr-3 sm:table-cell">{a.lastServer ?? "-"}</td>
                        <td className="hidden py-1.5 md:table-cell">{a.lastIp ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  <form action={setLicenseAccountsAction} className="flex gap-2">
                    <input type="hidden" name="licenseId" value={license.id} />
                    <input type="hidden" name="back" value={back} />
                    <input
                      name="logins"
                      defaultValue={own.map((a) => a.login).join(", ")}
                      placeholder={`Até ${license.maxAccounts} contas, separadas por vírgula`}
                      className={`${adminInput} min-w-0 flex-1 font-mono`}
                    />
                    <button type="submit" className={adminBtnGhost}>
                      Salvar contas
                    </button>
                  </form>
                  <form action={setLicenseOwnerAction} className="flex gap-2">
                    <input type="hidden" name="licenseId" value={license.id} />
                    <input type="hidden" name="back" value={back} />
                    <input
                      name="email"
                      type="email"
                      required
                      defaultValue={isPlaceholderEmail(user.email) ? "" : user.email}
                      placeholder="Email do cliente"
                      className={`${adminInput} min-w-0 flex-1`}
                    />
                    <button type="submit" className={adminBtnGhost}>
                      Trocar email
                    </button>
                  </form>
                  <form action={saveLicenseNotesAction} className="flex gap-2">
                    <input type="hidden" name="licenseId" value={license.id} />
                    <input type="hidden" name="back" value={back} />
                    <input
                      name="notes"
                      defaultValue={license.notes ?? ""}
                      placeholder="Anotação interna"
                      className={`${adminInput} min-w-0 flex-1`}
                    />
                    <button type="submit" className={adminBtnGhost}>
                      Salvar nota
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
