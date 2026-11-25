import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { liveState, statsFor } from "@/lib/account-stats";
import { PRODUCT } from "@/lib/plans";
import { getRobotConfig } from "@/lib/robot-settings";
import { SYMBOL_LABEL } from "@/lib/robot-options";
import { IntelPanel } from "@/components/intel/IntelPanel";
import { pairSummary } from "@/components/intel/strategy-text";
import { Badge, InfoRow, PageHeader, Panel, adminBtn, adminBtnGhost, fmtDateTime } from "@/components/admin/ui";

type Props = { params: Promise<{ login: string }> };

const money = (v: string | number, cur?: string | null) =>
  `${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${cur ? ` ${cur}` : ""}`;

// Detalhe de uma conta MT4: quem é, como está, os parâmetros em uso e a Ai X Intelligence (resultados, leitura, sugestões).
export default async function AdminAccountDetail({ params }: Props) {
  await requireAdmin();
  const { login } = await params;
  const [row] = await db()
    .select({ account: schema.licenseAccounts, license: schema.licenses, user: schema.users })
    .from(schema.licenseAccounts)
    .innerJoin(schema.licenses, eq(schema.licenses.id, schema.licenseAccounts.licenseId))
    .innerJoin(schema.users, eq(schema.users.id, schema.licenses.userId))
    .where(and(eq(schema.licenseAccounts.product, PRODUCT.slug), eq(schema.licenseAccounts.login, login)));
  if (!row) notFound();
  const [stats, config] = await Promise.all([statsFor(PRODUCT.slug, [login]), getRobotConfig(PRODUCT.slug, login)]);
  const s = stats.get(login);
  const state = liveState(s);
  const STATE = { running: ["operando", "ok"], autotradingOff: ["AutoTrading desligado", "warn"], inactive: ["sem sinal", "bad"], waiting: ["sem dados ainda", "muted"] } as const;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={`Conta ${login}`} description={`${row.user.name ?? row.user.email} · licença ${row.license.key}`}>
        <div className="flex flex-wrap gap-2">
          <Link href={`/pt/account/accounts/${login}`} className={adminBtn}>
            Editar configuração do robô
          </Link>
          <Link href="/admin/accounts" className={adminBtnGhost}>
            ← Contas MT4
          </Link>
        </div>
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Conta">
          <InfoRow label="Situação">
            <Badge tone={STATE[state][1]}>{STATE[state][0]}</Badge>
          </InfoRow>
          <InfoRow label="Cliente">{row.user.email}</InfoRow>
          <InfoRow label="Corretora">{s ? `${s.company ?? "-"} · ${s.server ?? ""}` : (row.account.lastServer ?? "-")}</InfoRow>
          <InfoRow label="Saldo / capital">{s ? `${money(s.balance, s.currency)} / ${money(s.equity, s.currency)}` : "-"}</InfoRow>
          <InfoRow label="Robô">{s?.eaVersion ?? row.account.lastEaVersion ?? "-"}</InfoRow>
          <InfoRow label="Último sinal">{fmtDateTime(s?.reportedAt ?? row.account.lastCheckAt)}</InfoRow>
        </Panel>
        <Panel title="Configuração da conta">
          <InfoRow label="Pares ligados">{config.symbols.map((x) => SYMBOL_LABEL[x] ?? x).join(", ")}</InfoRow>
          <InfoRow label="Operações simultâneas">{config.maxPositions}</InfoRow>
          <InfoRow label="Rebaixamento máximo">{config.ddPct ? `${config.ddPct}%` : "desligado"}</InfoRow>
          <InfoRow label="Meta / perda do dia">{`${config.dailyGoalPct || "-"}% / ${config.dailyLossPct || "-"}%`}</InfoRow>
          <InfoRow label="Horário">{`${config.startHour}h às ${config.endHour}h`}</InfoRow>
          <InfoRow label="Notícias">{config.newsFilter ? `pausa ${config.newsBefore} min antes / ${config.newsAfter} depois` : "desligado"}</InfoRow>
          <InfoRow label="Salvo por">{config.updatedAt ? `${config.admin ? "admin" : "cliente"} em ${fmtDateTime(config.updatedAt)}` : "padrões (nunca salvo)"}</InfoRow>
        </Panel>
      </div>

      <Panel title="Parâmetros em uso (cada par ligado)">
        <div className="grid gap-5 lg:grid-cols-2">
          {config.symbols.map((sym) => (
            <div key={sym} className="rounded-xl bg-brand-surface-2/40 p-4">
              <p className="mb-2 text-sm font-bold text-brand-ink">{SYMBOL_LABEL[sym] ?? sym}</p>
              {pairSummary(config.pairs[sym]).map(([k, v]) => (
                <InfoRow key={k} label={k}>
                  <span className="text-xs">{v}</span>
                </InfoRow>
              ))}
            </div>
          ))}
        </div>
      </Panel>

      <IntelPanel login={login} locale="pt" policy={null} />
    </div>
  );
}
