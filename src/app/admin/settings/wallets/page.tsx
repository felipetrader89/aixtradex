import { getBinanceCreds, getBinanceSettings, getWallets, isAutoPayActive } from "@/lib/config";
import { METHOD_LABELS } from "@/lib/payment-methods";
import { saveWalletsAction, verifyWalletsAction } from "@/app/actions/settings";
import { Badge, Flash, Panel, adminBtn, adminBtnGhost, adminInput, fmtDateTime } from "@/components/admin/ui";

type Props = { searchParams: Promise<{ msg?: string; err?: string }> };

export default async function WalletsSettings({ searchParams }: Props) {
  const { msg, err } = await searchParams;
  const [wallets, saved, creds, auto] = await Promise.all([getWallets(), getBinanceSettings(), getBinanceCreds(), isAutoPayActive()]);
  const check = saved.walletCheck;

  return (
    <div className="flex flex-col gap-6">
      <Flash msg={msg} err={err} />

      <Panel title="Formas de pagamento do checkout">
        <p className="mb-5 text-sm text-brand-ink-dim">
          O que estiver ligado aparece pro cliente na página de pagamento e na Minha Conta. As marcadas como{" "}
          <Badge tone="ok">automática</Badge> são confirmadas sozinhas pela Binance (quando a conexão está ligada) - por isso os
          endereços precisam ser <strong className="text-brand-ink">da mesma conta Binance conectada</strong>.
        </p>

        <form action={saveWalletsAction} className="flex flex-col gap-3">
          {wallets.map((w) => {
            const binanceAddress = check?.binanceAddresses?.[w.key];
            // Compara com o endereço salvo AGORA (se você editou depois da conferência, o selo acompanha).
            const result = binanceAddress
              ? binanceAddress.toLowerCase() === w.value.toLowerCase()
                ? "ok"
                : "different"
              : check?.results[w.key];
            return (
              <div key={w.key} className="rounded-xl bg-brand-surface-2 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-brand-ink">{METHOD_LABELS[w.key]}</span>
                    {w.auto && <Badge tone={auto ? "ok" : "muted"}>automática</Badge>}
                    {result === "ok" && <Badge tone="ok">✓ bate com a Binance</Badge>}
                    {result === "different" && <Badge tone="warn">diferente da Binance</Badge>}
                    {result === "error" && <Badge tone="muted">não deu pra conferir</Badge>}
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-brand-ink-dim">
                    <input type="checkbox" name={`enabled_${w.key}`} defaultChecked={w.enabled} className="h-4 w-4 accent-[#33d6a0]" />
                    Mostrar no checkout
                  </label>
                </div>
                <input
                  name={`value_${w.key}`}
                  defaultValue={w.value}
                  spellCheck={false}
                  autoComplete="off"
                  placeholder={w.key === "binancePay" ? "Seu Pay ID (só números)" : "Endereço da carteira"}
                  className={`${adminInput} w-full font-mono text-xs`}
                />
                {result === "different" && binanceAddress && (
                  <p className="mt-2 break-all text-xs text-amber-300">
                    A Binance informa hoje: <span className="font-mono">{binanceAddress}</span>. Se o endereço acima for antigo, ele
                    ainda pode funcionar - mas o mais seguro é usar o atual.
                  </p>
                )}
                {w.key === "binancePay" && (
                  <p className="mt-2 text-xs text-brand-ink-dim">
                    O Pay ID não dá pra conferir automaticamente: veja no app da Binance em Perfil → Pay ID.
                  </p>
                )}
              </div>
            );
          })}
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="submit" className={adminBtn}>
              Salvar carteiras
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Conferir com a Binance">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl text-sm text-brand-ink-dim">
            Compara cada endereço acima com o endereço de depósito que a Binance informa pra conta conectada (USDT, USDC, BTC, ETH,
            LTC).{" "}
            {check ? `Última conferência: ${fmtDateTime(new Date(check.at))}.` : "Ainda não conferido."}
          </p>
          <form action={verifyWalletsAction}>
            <button type="submit" className={creds ? adminBtn : adminBtnGhost} disabled={!creds}>
              Conferir com a Binance
            </button>
          </form>
        </div>
        {!creds && <p className="mt-3 text-xs text-amber-300">Conecte a chave na aba Binance primeiro.</p>}
      </Panel>
    </div>
  );
}
