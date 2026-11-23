import { getSmtpConfig } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth";
import { saveSmtpAction, sendTestEmailAction } from "@/app/actions/settings";
import { Badge, Flash, InfoRow, Panel, adminBtn, adminBtnGhost, adminInput, adminLabel } from "@/components/admin/ui";

type Props = { searchParams: Promise<{ msg?: string; err?: string }> };

export default async function EmailSettings({ searchParams }: Props) {
  const { msg, err } = await searchParams;
  const [smtp, me] = await Promise.all([getSmtpConfig(), getCurrentUser()]);
  const fromName = smtp.from.replace(/\s*<.*>\s*$/, "") || "Ai X TradeX";

  return (
    <div className="flex flex-col gap-6">
      <Flash msg={msg} err={err} tight />

      <div className="grid gap-6 lg:grid-cols-5">
        <Panel title="Situação" className="lg:col-span-2">
          <InfoRow label="Envio">{smtp.pass ? <Badge tone="ok">Configurado</Badge> : <Badge tone="bad">Sem senha</Badge>}</InfoRow>
          <InfoRow label="Remetente">{smtp.from}</InfoRow>
          <InfoRow label="Servidor">
            {smtp.host}:{smtp.port}
          </InfoRow>
          <InfoRow label="Origem">{smtp.source === "admin" ? "Painel" : "Servidor (.env)"}</InfoRow>
          <p className="mt-4 text-xs text-brand-ink-dim">
            Usado pros códigos de login, confirmações de pagamento e avisos pra você. Se trocar a senha do email na Hostinger,
            atualize aqui também.
          </p>
        </Panel>

        <Panel title="Servidor de envio (SMTP)" className="lg:col-span-3">
          <form action={saveSmtpAction} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={adminLabel} htmlFor="user">
                Email que envia
              </label>
              <input id="user" name="user" type="email" required defaultValue={smtp.user} className={`${adminInput} w-full`} />
            </div>
            <div>
              <label className={adminLabel} htmlFor="fromName">
                Nome que aparece
              </label>
              <input id="fromName" name="fromName" defaultValue={fromName} className={`${adminInput} w-full`} />
            </div>
            <div>
              <label className={adminLabel} htmlFor="pass">
                Senha do email
              </label>
              <input
                id="pass"
                name="pass"
                type="password"
                autoComplete="new-password"
                placeholder={smtp.pass ? "Deixe em branco pra manter" : "Senha da caixa de email"}
                className={`${adminInput} w-full`}
              />
            </div>
            <div>
              <label className={adminLabel} htmlFor="host">
                Servidor
              </label>
              <input id="host" name="host" required defaultValue={smtp.host} className={`${adminInput} w-full font-mono`} />
            </div>
            <div>
              <label className={adminLabel} htmlFor="port">
                Porta
              </label>
              <input id="port" name="port" type="number" required defaultValue={smtp.port} className={`${adminInput} w-full font-mono`} />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className={adminBtn}>
                Conferir e salvar
              </button>
              <p className="mt-2 text-xs text-brand-ink-dim">
                O painel testa usuário e senha com o servidor de email antes de salvar. A senha fica criptografada. Hostinger:
                smtp.hostinger.com, porta 465.
              </p>
            </div>
          </form>
        </Panel>
      </div>

      <Panel title="Enviar email de teste">
        <form action={sendTestEmailAction} className="flex flex-wrap gap-2">
          <input name="to" type="email" defaultValue={me?.email} className={`${adminInput} min-w-0 flex-1`} />
          <button type="submit" className={adminBtnGhost}>
            Enviar teste
          </button>
        </form>
      </Panel>
    </div>
  );
}
