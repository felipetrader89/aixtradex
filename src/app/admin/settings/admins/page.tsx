import { getAdminEmails } from "@/lib/config";
import { addAdminAction, removeAdminAction } from "@/app/actions/settings";
import { Badge, Flash, Panel, adminBtn, adminBtnDanger, adminInput } from "@/components/admin/ui";

type Props = { searchParams: Promise<{ msg?: string; err?: string }> };

export default async function AdminsSettings({ searchParams }: Props) {
  const { msg, err } = await searchParams;
  const { owners, extra } = await getAdminEmails();

  return (
    <div className="flex flex-col gap-6">
      <Flash msg={msg} err={err} />

      <Panel title={`Administradores (${owners.length + extra.length})`}>
        <ul className="flex flex-col divide-y divide-brand-hairline">
          {owners.map((email) => (
            <li key={email} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span className="text-sm text-brand-ink">{email}</span>
              <Badge tone="ok">Principal</Badge>
            </li>
          ))}
          {extra.map((email) => (
            <li key={email} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span className="text-sm text-brand-ink">{email}</span>
              <form action={removeAdminAction}>
                <input type="hidden" name="email" value={email} />
                <button type="submit" className={adminBtnDanger}>
                  Remover
                </button>
              </form>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-brand-ink-dim">
          O principal é definido no servidor e não pode ser removido por aqui. Administradores têm acesso total ao painel: pedidos,
          licenças, clientes e configurações.
        </p>
      </Panel>

      <Panel title="Adicionar administrador">
        <form action={addAdminAction} className="flex flex-wrap gap-2">
          <input name="email" type="email" required placeholder="email@exemplo.com" className={`${adminInput} min-w-0 flex-1`} />
          <button type="submit" className={adminBtn}>
            Adicionar
          </button>
        </form>
        <p className="mt-2 text-xs text-brand-ink-dim">A pessoa entra em app.aixtradex.com/admin com o código que chega nesse email.</p>
      </Panel>
    </div>
  );
}
