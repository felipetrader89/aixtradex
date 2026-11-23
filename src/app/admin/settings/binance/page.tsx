import { getBinanceCreds, getBinanceSettings } from "@/lib/config";
import { getBinanceState } from "@/lib/payments";
import { maskTail } from "@/lib/secret-box";
import { binanceEgressIp } from "@/lib/binance";
import {
  removeBinanceKeyAction,
  saveBinanceKeyAction,
  setAutoPayAction,
  syncBinanceNowAction,
  testBinanceAction,
} from "@/app/actions/settings";
import { CopyButton } from "@/components/ui/CopyButton";
import {
  Badge,
  Flash,
  InfoRow,
  Panel,
  adminBtn,
  adminBtnDanger,
  adminBtnGhost,
  adminInput,
  adminLabel,
  fmtDateTime,
} from "@/components/admin/ui";

type Props = { searchParams: Promise<{ msg?: string; err?: string }> };

function Perm({ ok, good, label, hint }: { ok: boolean; good: boolean; label: string; hint: string }) {
  const fine = ok === good;
  return (
    <div className="flex items-start justify-between gap-3 border-b border-brand-hairline py-2.5 last:border-0">
      <div>
        <p className="text-sm text-brand-ink">{label}</p>
        <p className="text-xs text-brand-ink-dim">{hint}</p>
      </div>
      <Badge tone={fine ? "ok" : good ? "warn" : "bad"}>{ok ? "Ligada" : "Desligada"}</Badge>
    </div>
  );
}

export default async function BinanceSettings({ searchParams }: Props) {
  const { msg, err } = await searchParams;
  const [creds, saved, state] = await Promise.all([getBinanceCreds(), getBinanceSettings(), getBinanceState()]);
  const SERVER_IP = binanceEgressIp();
  const autoPay = saved.autoPay !== false;
  const test = saved.lastTest;
  const lastRun = state ? new Date(state.lastRunAt) : null;

  return (
    <div className="flex flex-col gap-6">
      <Flash msg={msg} err={err} tight />

      <div className="grid gap-4 md:grid-cols-3">
        <Panel title="Conexão">
          <div className="flex items-center gap-2">
            {!creds ? (
              <Badge tone="warn">Não configurada</Badge>
            ) : test && !test.ok ? (
              <Badge tone="bad">Com erro</Badge>
            ) : (
              <Badge tone="ok">Conectada</Badge>
            )}
            {creds && <span className="font-mono text-xs text-brand-ink-dim">API Key {maskTail(creds.apiKey, 6)}</span>}
          </div>
          <p className="mt-3 text-xs text-brand-ink-dim">
            {creds
              ? creds.source === "env"
                ? "Chave vinda do servidor (.env). Salvar uma chave aqui passa a valer no lugar dela."
                : `Salva por ${saved.savedBy ?? "-"} em ${fmtDateTime(saved.savedAt ? new Date(saved.savedAt) : null)}.`
              : "Conecte uma chave só de leitura pra o site confirmar pagamentos sozinho."}
          </p>
        </Panel>

        <Panel title="Confirmação automática">
          <form action={setAutoPayAction} className="flex items-center justify-between gap-3">
            <input type="hidden" name="autoPay" value={autoPay ? "off" : "on"} />
            <Badge tone={autoPay && creds ? "ok" : "muted"}>{autoPay ? "Ligada" : "Desligada"}</Badge>
            <button type="submit" className={autoPay ? adminBtnGhost : adminBtn}>
              {autoPay ? "Desligar" : "Ligar"}
            </button>
          </form>
          <p className="mt-3 text-xs text-brand-ink-dim">
            Ligada: depósito em USDT/USDC com o valor exato do pedido paga o pedido, libera a licença e manda o email. Desligada:
            os recebimentos continuam aparecendo, mas você aprova à mão.
          </p>
        </Panel>

        <Panel title="Leitura a cada minuto">
          <div className="flex items-center gap-2">
            {state?.ok ? <Badge tone="ok">Rodando</Badge> : <Badge tone={creds ? "bad" : "muted"}>{creds ? "Com erro" : "Aguardando chave"}</Badge>}
            <span className="text-xs text-brand-ink-dim">{fmtDateTime(lastRun)}</span>
          </div>
          <p className="mt-3 text-xs text-brand-ink-dim">
            {state?.ok
              ? `Última leitura: ${state.newDeposits ?? 0} recebimento(s) novo(s), ${state.matched ?? 0} pedido(s) pago(s).`
              : (state?.error ?? "Ainda não rodou.")}
          </p>
          {state?.payError && <p className="mt-2 text-xs text-amber-300">Binance Pay sem leitura: {state.payError}</p>}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Panel title="Chave de API (só leitura)" className="lg:col-span-3">
          <form action={saveBinanceKeyAction} className="flex flex-col gap-4">
            <div>
              <label className={adminLabel} htmlFor="apiKey">
                API Key
              </label>
              <input
                id="apiKey"
                name="apiKey"
                autoComplete="off"
                spellCheck={false}
                placeholder={creds ? `Atual: ${maskTail(creds.apiKey, 6)} - cole outra pra trocar` : "Cole a API Key"}
                className={`${adminInput} w-full font-mono`}
              />
            </div>
            <div>
              <label className={adminLabel} htmlFor="apiSecret">
                Secret Key
              </label>
              <input
                id="apiSecret"
                name="apiSecret"
                type="password"
                autoComplete="new-password"
                spellCheck={false}
                placeholder={creds?.source === "admin" ? "Deixe em branco pra manter a atual" : "Cole a Secret Key"}
                className={`${adminInput} w-full font-mono`}
              />
              <p className="mt-1.5 text-xs text-brand-ink-dim">
                Fica guardada criptografada no servidor e nunca mais é mostrada. Antes de salvar, o painel confere com a Binance:
                chave com saque, trade ou transferência habilitados é recusada.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className={adminBtn}>
                Conferir e salvar
              </button>
            </div>
          </form>

          {creds && (
            <div className="mt-6 flex flex-wrap gap-2 border-t border-brand-hairline pt-4">
              <form action={testBinanceAction}>
                <button type="submit" className={adminBtnGhost}>
                  Testar conexão
                </button>
              </form>
              <form action={syncBinanceNowAction}>
                <button type="submit" className={adminBtnGhost}>
                  Ler recebimentos agora
                </button>
              </form>
              {creds.source === "admin" && (
                <form action={removeBinanceKeyAction}>
                  <button type="submit" className={adminBtnDanger}>
                    Remover chave
                  </button>
                </form>
              )}
            </div>
          )}
        </Panel>

        <Panel title="Último teste" className="lg:col-span-2">
          {!test ? (
            <p className="text-sm text-brand-ink-dim">Ainda não testado.</p>
          ) : !test.ok ? (
            <>
              <Badge tone="bad">Falhou</Badge>
              <p className="mt-3 break-words text-sm text-red-200">{test.error}</p>
              <p className="mt-2 text-xs text-brand-ink-dim">{fmtDateTime(new Date(test.at))}</p>
            </>
          ) : (
            <>
              <p className="mb-2 text-xs text-brand-ink-dim">{fmtDateTime(new Date(test.at))}</p>
              {test.permissions && (
                <>
                  <Perm ok={test.permissions.reading} good label="Leitura" hint="Precisa estar ligada" />
                  <Perm ok={test.permissions.trading} good={false} label="Trade (spot, margem, futuros)" hint="Precisa estar desligada" />
                  <Perm ok={test.permissions.withdrawals} good={false} label="Saque" hint="Precisa estar desligada" />
                  <Perm ok={test.permissions.transfers} good={false} label="Transferências" hint="Precisa estar desligada" />
                  <Perm ok={test.permissions.ipRestrict} good label="Restrita ao IP do servidor" hint="Recomendado" />
                </>
              )}
              <InfoRow label="Depósitos nas últimas 24h">{test.deposits24h ?? 0}</InfoRow>
              <InfoRow label="Binance Pay">
                {test.payOk ? <Badge tone="ok">OK</Badge> : <Badge tone="warn">Sem acesso</Badge>}
              </InfoRow>
              {test.payError && <p className="mt-1 text-xs text-amber-300">{test.payError}</p>}
            </>
          )}
        </Panel>
      </div>

      <Panel title="Como criar a chave na Binance">
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-brand-ink">
          <li>
            No site da Binance (computador): <strong>Perfil → Gerenciamento de API → Criar API</strong> → &quot;Gerada pelo
            sistema&quot; → nome: <span className="font-mono">aixtradex-leitura</span> → confirme com o 2FA.
          </li>
          <li>
            Na chave criada, clique em <strong>Editar restrições</strong> e deixe marcado <strong>só &quot;Habilitar leitura&quot;</strong>{" "}
            (trade, saque e transferência desmarcados).
          </li>
          <li>
            Em acesso por IP, escolha <strong>&quot;Restringir a IPs confiáveis&quot;</strong> e adicione o IP do servidor:
            <span className="ml-2 inline-flex items-center gap-2 align-middle">
              <span className="rounded-lg bg-brand-bg px-2 py-1 font-mono text-brand-accent">{SERVER_IP}</span>
              <CopyButton value={SERVER_IP} label="Copiar" copiedLabel="Copiado" />
            </span>
          </li>
          <li>Salve, copie a <strong>API Key</strong> e a <strong>Secret Key</strong> (a Secret aparece uma vez só) e cole aqui em cima.</li>
          <li>
            Depois, na aba <strong>Carteiras</strong>, clique em &quot;Conferir com a Binance&quot; pra garantir que os endereços do
            checkout são dessa conta.
          </li>
        </ol>
      </Panel>
    </div>
  );
}
