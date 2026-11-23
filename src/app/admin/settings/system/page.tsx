import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getBinanceCreds, getSmtpConfig, recentEvents } from "@/lib/config";
import { getBinanceState } from "@/lib/payments";
import { licenseServerUrl } from "@/lib/site-config";
import { PRODUCT } from "@/lib/plans";
import { Badge, InfoRow, Panel, fmtDateTime } from "@/components/admin/ui";

const BACKUP_DIR = "/srv/pulse/backups";

async function latestBackup() {
  try {
    const files = await Promise.all(
      (await readdir(BACKUP_DIR)).map(async (name) => ({ name, ...(await stat(path.join(BACKUP_DIR, name))) }))
    );
    const latest = files.filter((f) => f.isFile()).sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
    return latest ? { name: latest.name, at: latest.mtime, size: latest.size, total: files.length } : null;
  } catch {
    return null;
  }
}

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const ACTION_LABELS: Record<string, string> = {
  "binance.key": "Chave da Binance",
  "binance.test": "Teste da Binance",
  "binance.sync": "Leitura manual da Binance",
  "binance.autopay": "Confirmação automática",
  "binance.remove": "Chave da Binance removida",
  "wallets.save": "Carteiras",
  "wallets.verify": "Conferência de carteiras",
  "email.save": "Email de envio",
  "email.test": "Email de teste",
  "admins.add": "Admin adicionado",
  "admins.remove": "Admin removido",
  "order.approve": "Pedido aprovado",
  "order.cancel": "Pedido cancelado",
  "deposit.link": "Recebimento vinculado",
  "deposit.ignore": "Recebimento ignorado",
  "license.create": "Licença criada",
  "license.status": "Licença bloqueada/reativada",
  "license.extend": "Licença estendida",
  "license.accounts": "Contas MT4 alteradas",
  "license.owner": "Dono da licença trocado",
  "files.upload": "Versão do robô enviada",
  "files.current": "Versão atual do robô",
  "files.delete": "Versão do robô apagada",
};

export default async function SystemSettings() {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 86_400_000);
  const [backup, creds, smtp, state, events, [checks], [dbSize]] = await Promise.all([
    latestBackup(),
    getBinanceCreds(),
    getSmtpConfig(),
    getBinanceState(),
    recentEvents(60),
    db()
      .select({ n: count() })
      .from(schema.licenseAccounts)
      .where(and(eq(schema.licenseAccounts.product, PRODUCT.slug), gte(schema.licenseAccounts.lastCheckAt, dayAgo))),
    db().execute<{ size: string }>(sql`select pg_size_pretty(pg_database_size(current_database())) as size`),
  ]);
  const release = path.basename(process.cwd());
  const backupOld = !backup || now.getTime() - backup.at.getTime() > 36 * 3_600_000;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Saúde do portal">
          <InfoRow label="Site">
            <Badge tone="ok">No ar</Badge> <span className="ml-1 font-mono text-xs text-brand-ink-dim">{release}</span>
          </InfoRow>
          <InfoRow label="Servidor de licença">
            <span className="font-mono text-xs">{licenseServerUrl}</span>
          </InfoRow>
          <InfoRow label="Robôs que consultaram (24h)">{checks.n} conta(s) MT4</InfoRow>
          <InfoRow label="Leitura da Binance">
            {!creds ? (
              <Badge tone="muted">Sem chave</Badge>
            ) : state?.ok ? (
              <Badge tone="ok">OK · {fmtDateTime(new Date(state.lastRunAt))}</Badge>
            ) : (
              <Badge tone="bad">Erro</Badge>
            )}
          </InfoRow>
          <InfoRow label="Email de envio">{smtp.pass ? <Badge tone="ok">{smtp.user}</Badge> : <Badge tone="bad">Sem senha</Badge>}</InfoRow>
          <InfoRow label="Chave de criptografia das configurações">
            {process.env.SETTINGS_KEY ? <Badge tone="ok">Própria</Badge> : <Badge tone="warn">Derivada da chave de licença</Badge>}
          </InfoRow>
        </Panel>

        <Panel title="Banco de dados e backup">
          <InfoRow label="Tamanho do banco">{dbSize?.size ?? "-"}</InfoRow>
          <InfoRow label="Último backup">
            {backup ? (
              <Badge tone={backupOld ? "warn" : "ok"}>{fmtDateTime(backup.at)}</Badge>
            ) : (
              <Badge tone="bad">Não encontrado</Badge>
            )}
          </InfoRow>
          {backup && (
            <>
              <InfoRow label="Arquivo">
                <span className="font-mono text-xs">
                  {backup.name} · {mb(backup.size)}
                </span>
              </InfoRow>
              <InfoRow label="Backups guardados">{backup.total} (últimos 14 dias)</InfoRow>
            </>
          )}
          <p className="mt-3 text-xs text-brand-ink-dim">
            O backup roda sozinho todo dia às 02:15 (horário de Brasília) e fica no próprio servidor.
          </p>
        </Panel>
      </div>

      <Panel title="Histórico de alterações">
        {events.length === 0 ? (
          <p className="text-sm text-brand-ink-dim">Nada registrado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-brand-ink-dim">
                <tr>
                  <th className="py-2 pr-4 font-medium">Quando</th>
                  <th className="py-2 pr-4 font-medium">Quem</th>
                  <th className="py-2 pr-4 font-medium">O quê</th>
                  <th className="py-2 font-medium">Detalhe</th>
                </tr>
              </thead>
              <tbody className="text-brand-ink">
                {events.map((e) => (
                  <tr key={e.id} className="border-t border-brand-hairline align-top">
                    <td className="whitespace-nowrap py-2 pr-4">{fmtDateTime(e.createdAt)}</td>
                    <td className="py-2 pr-4">{e.actor}</td>
                    <td className="whitespace-nowrap py-2 pr-4">{ACTION_LABELS[e.action] ?? e.action}</td>
                    <td className="break-all py-2 text-brand-ink-dim">{e.detail ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
