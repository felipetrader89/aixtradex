import { AI_CLIENT_DAILY_DEFAULT, SCAN_DAILY_DEFAULT, SCAN_DAILY_OPTIONS, getAiKey, getAiSettings } from "@/lib/config";
import { AI_MODEL, aiUsage30d } from "@/lib/ai-analysis";
import { removeAiKeyAction, saveAiKeyAction, saveAiLimitAction, saveScanLimitAction, testAiAction } from "@/app/actions/settings";
import { Badge, Flash, InfoRow, Panel, adminBtn, adminBtnGhost, adminInput, adminLabel, fmtDateTime } from "@/components/admin/ui";

type Props = { searchParams: Promise<{ msg?: string; err?: string }> };

// Preço do Claude Opus 5.5 (US$ por milhão de tokens) - pra estimar o gasto.
const PRICE_IN = 4;
const PRICE_OUT = 20;

export default async function AiSettings({ searchParams }: Props) {
  const { msg, err } = await searchParams;
  const [saved, creds] = await Promise.all([getAiSettings(), getAiKey()]);
  const usage = await aiUsage30d();
  const cost = (usage.input * PRICE_IN + usage.output * PRICE_OUT) / 1_000_000;
  const daily = saved.clientDaily ?? AI_CLIENT_DAILY_DEFAULT;
  const scanDaily = saved.scanDaily ?? SCAN_DAILY_DEFAULT;

  return (
    <div className="flex flex-col gap-6">
      <Flash msg={msg} err={err} tight />

      <div className="grid gap-6 lg:grid-cols-5">
        <Panel title="Situação" className="lg:col-span-2">
          <InfoRow label="Análise por IA">{creds ? <Badge tone="ok">Ligada</Badge> : <Badge tone="warn">Sem chave</Badge>}</InfoRow>
          {creds && <InfoRow label="Chave">{creds.source === "admin" ? `…${saved.keyHint ?? ""} (painel)` : "Servidor (.env)"}</InfoRow>}
          <InfoRow label="Modelo">{AI_MODEL}</InfoRow>
          {saved.lastTest && (
            <InfoRow label="Último teste">
              {saved.lastTest.ok ? <Badge tone="ok">OK</Badge> : <Badge tone="bad">Falhou</Badge>} {fmtDateTime(new Date(saved.lastTest.at))}
            </InfoRow>
          )}
          <InfoRow label="Últimos 30 dias">{`${usage.n} análise(s) · ~US$ ${cost.toFixed(2)}`}</InfoRow>
          <p className="mt-4 text-xs text-brand-ink-dim">
            A IA lê as estatísticas da conta (resultados reais, leituras de velas e o que funciona na comunidade) e escreve uma análise curta com os
            próximos passos, no idioma do cliente. Os números e as combinações com botão Aplicar continuam vindo do portal. Cada análise custa em média
            US$ 0,05 a 0,15 na conta da Anthropic.
          </p>
          {creds && (
            <div className="mt-4 flex flex-wrap gap-2">
              <form action={testAiAction}>
                <button type="submit" className={adminBtnGhost}>
                  Testar conexão
                </button>
              </form>
              {creds.source === "admin" && (
                <form action={removeAiKeyAction}>
                  <button type="submit" className={adminBtnGhost}>
                    Remover chave
                  </button>
                </form>
              )}
            </div>
          )}
        </Panel>

        <Panel title={creds ? "Trocar a chave da API" : "Ligar a análise por IA"} className="lg:col-span-3">
          <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-brand-ink-dim">
            <li>Entre em console.anthropic.com (mesma conta do Claude ou uma nova).</li>
            <li>Em Billing, coloque crédito (US$ 5 ou 10 dão pra centenas de análises).</li>
            <li>Em API Keys, crie uma chave chamada &quot;Ai X TradeX portal&quot; e cole aqui.</li>
          </ol>
          <form action={saveAiKeyAction} className="flex flex-col gap-3">
            <div>
              <label className={adminLabel} htmlFor="apiKey">
                Chave da API (sk-ant-...)
              </label>
              <input id="apiKey" name="apiKey" type="password" autoComplete="off" required className={`${adminInput} w-full font-mono`} />
            </div>
            <div>
              <button type="submit" className={adminBtn}>
                Conferir e salvar
              </button>
              <p className="mt-2 text-xs text-brand-ink-dim">O painel testa a chave com a Anthropic antes de salvar. Ela fica criptografada no banco.</p>
            </div>
          </form>
        </Panel>
      </div>

      <Panel title="Quantas análises os clientes podem gerar">
        <form action={saveAiLimitAction} className="flex flex-wrap items-end gap-3">
          <div>
            <label className={adminLabel} htmlFor="clientDaily">
              Por conta, a cada 24 h
            </label>
            <select id="clientDaily" name="clientDaily" defaultValue={daily} className={adminInput}>
              {[0, 1, 2, 3, 5, 10].map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "Nenhuma (só eu)" : n}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={adminBtnGhost}>
            Salvar
          </button>
        </form>
        <p className="mt-2 text-xs text-brand-ink-dim">Você (admin) pode gerar até 20 por conta por dia, em qualquer conta.</p>
      </Panel>

      <Panel title="Leituras de velas por conta (Assistente IA e Ai X Intelligence)">
        <form action={saveScanLimitAction} className="flex flex-wrap items-end gap-3">
          <div>
            <label className={adminLabel} htmlFor="scanDaily">
              Pares lidos por conta, a cada 24 h
            </label>
            <select id="scanDaily" name="scanDaily" defaultValue={scanDaily} className={adminInput}>
              {SCAN_DAILY_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "Sem limite" : n}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={adminBtnGhost}>
            Salvar
          </button>
        </form>
        <p className="mt-2 text-xs text-brand-ink-dim">
          Cada par lido conta 1. Uma análise do Assistente IA lê de 8 a 12 pares de uma vez, então 60 dão umas 5 análises por dia. A leitura roda no MT4 do
          cliente e não gasta crédito da IA. Não contam: o que você (admin) pede e a reanálise diária automática do Assistente.
        </p>
      </Panel>
    </div>
  );
}
