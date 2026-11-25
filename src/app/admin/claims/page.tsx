import { desc, eq, inArray, ne } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { isPlaceholderEmail } from "@/lib/auth";
import { licenseState } from "@/lib/licensing";
import { planLabelPt } from "@/lib/plans";
import { approveClaimAction, rejectClaimAction } from "@/app/actions/admin";
import { Badge, Flash, PageHeader, Panel, adminBtn, adminBtnDanger, fmtDateTime } from "@/components/admin/ui";

type Props = { searchParams: Promise<{ msg?: string; err?: string }> };

const LANG: Record<string, string> = { pt: "Português", en: "Inglês", es: "Espanhol" };

export default async function AdminClaims({ searchParams }: Props) {
  const { msg, err } = await searchParams;
  const back = "/admin/claims";

  const pending = await db()
    .select({ claim: schema.licenseClaims, license: schema.licenses, owner: schema.users })
    .from(schema.licenseClaims)
    .innerJoin(schema.licenses, eq(schema.licenses.id, schema.licenseClaims.licenseId))
    .innerJoin(schema.users, eq(schema.users.id, schema.licenses.userId))
    .where(eq(schema.licenseClaims.status, "pending"))
    .orderBy(schema.licenseClaims.createdAt);
  const decided = await db()
    .select()
    .from(schema.licenseClaims)
    .where(ne(schema.licenseClaims.status, "pending"))
    .orderBy(desc(schema.licenseClaims.decidedAt))
    .limit(20);

  // Tudo que o cadastro provisório tem (pra conferir com o cliente antes de aprovar).
  const ownerIds = [...new Set(pending.map((p) => p.owner.id))];
  const ownerLicenses = ownerIds.length
    ? await db().select().from(schema.licenses).where(inArray(schema.licenses.userId, ownerIds))
    : [];
  const accounts = ownerLicenses.length
    ? await db()
        .select()
        .from(schema.licenseAccounts)
        .where(
          inArray(
            schema.licenseAccounts.licenseId,
            ownerLicenses.map((l) => l.id)
          )
        )
    : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pedidos de acesso"
        description="Clientes antigos (importados do robô, sem email) pedindo acesso ao portal pela página 'Já sou cliente'. Confira se é a pessoa mesmo (ex.: pelo Telegram) antes de aprovar: ao aprovar, todas as licenças do cadastro passam pro email informado e o cliente recebe o passo a passo."
      />
      <Flash msg={msg} err={err} />

      <Panel title={`Aguardando (${pending.length})`}>
        {pending.length === 0 && <p className="text-sm text-brand-ink-dim">Nenhum pedido aguardando.</p>}
        <ul className="flex flex-col gap-4">
          {pending.map(({ claim, license, owner }) => {
            const own = ownerLicenses.filter((l) => l.userId === owner.id);
            const loginRow = accounts.find((a) => a.login === claim.login);
            return (
              <li key={claim.id} className="rounded-xl bg-brand-surface-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-ink">{claim.email}</p>
                    <p className="mt-1 text-xs text-brand-ink-dim">
                      Conta informada <span className="font-mono text-brand-ink">{claim.login}</span> · pedido em {fmtDateTime(claim.createdAt)} ·{" "}
                      idioma {LANG[claim.locale ?? ""] ?? "-"} · IP {claim.ip ?? "-"}
                    </p>
                    <p className="mt-1 text-xs text-brand-ink-dim">
                      Última consulta do robô nessa conta: {fmtDateTime(loginRow?.lastCheckAt) || "nunca"}
                      {loginRow?.lastServer ? ` · ${loginRow.lastServer}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <form action={approveClaimAction}>
                      <input type="hidden" name="claimId" value={claim.id} />
                      <input type="hidden" name="back" value={back} />
                      <button type="submit" className={adminBtn}>
                        Aprovar
                      </button>
                    </form>
                    <form action={rejectClaimAction}>
                      <input type="hidden" name="claimId" value={claim.id} />
                      <input type="hidden" name="back" value={back} />
                      <button type="submit" className={adminBtnDanger}>
                        Recusar
                      </button>
                    </form>
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-brand-hairline p-3 text-xs">
                  <p className="mb-2 text-brand-ink-dim">
                    Cadastro importado: <span className="text-brand-ink">{owner.name ?? "-"}</span>
                    {isPlaceholderEmail(owner.email) ? "" : ` (já tem email: ${owner.email})`} · {own.length} licença
                    {own.length === 1 ? "" : "s"}
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {own.map((l) => (
                      <li key={l.id} className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-semibold text-brand-accent">{l.key}</span>
                        <Badge tone={licenseState(l) === "active" ? "ok" : "warn"}>
                          {planLabelPt(l.plan)}
                        </Badge>
                        <span className="font-mono text-brand-ink">
                          {accounts
                            .filter((a) => a.licenseId === l.id)
                            .map((a) => a.login)
                            .join(", ") || "sem contas"}
                        </span>
                        {l.id === license.id && <span className="text-brand-ink-dim">← conta do pedido</span>}
                        {l.notes && <span className="w-full text-brand-ink-dim">Anotação: {l.notes}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="Resolvidos recentemente">
        {decided.length === 0 && <p className="text-sm text-brand-ink-dim">Nada por aqui ainda.</p>}
        <ul className="flex flex-col divide-y divide-brand-hairline text-sm">
          {decided.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="text-brand-ink">
                {c.email} <span className="font-mono text-xs text-brand-ink-dim">· conta {c.login}</span>
              </span>
              <span className="flex items-center gap-2 text-xs text-brand-ink-dim">
                <Badge tone={c.status === "approved" ? "ok" : "muted"}>{c.status === "approved" ? "aprovado" : "recusado"}</Badge>
                {fmtDateTime(c.decidedAt)}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
