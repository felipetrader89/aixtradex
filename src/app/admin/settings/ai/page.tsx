import { AI_CLIENT_DAILY_DEFAULT, BIAS_EVERY_DEFAULT, BIAS_EVERY_OPTIONS, SCAN_DAILY_DEFAULT, SCAN_DAILY_OPTIONS, getAiKey, getAiSettings } from "@/lib/config";
import { biasUsage30d, currentBias } from "@/lib/market-bias";
import { symbolLabel } from "@/lib/robot-options";
import { AI_MODEL, aiUsage30d } from "@/lib/ai-analysis";
import { removeAiKeyAction, saveAiKeyAction, saveAiLimitAction, saveBiasEveryAction, saveScanLimitAction, testAiAction } from "@/app/actions/settings";
import { Badge, Flash, InfoRow, Panel, adminBtn, adminBtnGhost, adminInput, adminLabel, fmtDateTime } from "@/components/admin/ui";

type Props = { searchParams: Promise<{ msg?: string; err?: string }> };

// Preço do Claude Opus 5.5 (US$ por milhão de tokens) - pra estimar o gasto.
const PRICE_IN = 4;
const PRICE_OUT = 20;

export default async function AiSettings({ searchParams }: Props) {
  const { msg, err } = await searchParams;
  const [saved, creds] = await Promise.all([getAiSettings(), getAiKey()]);
  const [usage, biasUse, bias] = await Promise.all([aiUsage30d(), biasUsage30d(), currentBias()]);
  const cost = (usage.input * PRICE_IN + usage.output * PRICE_OUT) / 1_000_000;
  const biasCost = (biasUse.input * PRICE_IN + biasUse.output * PRICE_OUT) / 1_000_000;
  const biasEvery = saved.biasEvery ?? BIAS_EVERY_DEFAULT;
  const biasLabel: Record<string, string> = { buy: "Compra", sell: "Venda", both: "Os dois lados", none: "Não operar" };
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

      <Panel title="Trader sênior (viés do dia da Mesa de Análise)">
        <p className="mb-3 text-sm text-brand-ink-dim">
          Os robôs v7.5 mandam o resumo do mercado (velas D1/H4/H1, médias, RSI, ADX, ATR, máximas e mínimas) de cada par que operam. A IA, no papel de
          um trader com décadas de mercado, decide o viés das próximas horas de cada ativo: compra, venda, os dois ou não operar. O viés vale pra todas as
          contas e entra na Mesa de Análise do robô (contra = não entra naquele lado). Cada leitura custa em média US$ 0,03 a 0,08.
        </p>
        <form action={saveBiasEveryAction} className="flex flex-wrap items-end gap-3">
          <div>
            <label className={adminLabel} htmlFor="biasEvery">
              Reler cada ativo a cada
            </label>
            <select id="biasEvery" name="biasEvery" defaultValue={biasEvery} className={adminInput}>
              {BIAS_EVERY_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "Desligado" : `${n} h`}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={adminBtnGhost}>
            Salvar
          </button>
        </form>
        <InfoRow label="Últimos 30 dias">{`${biasUse.n} leitura(s) · ~US$ ${biasCost.toFixed(2)}`}</InfoRow>
        {bias.size > 0 ? (
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {[...bias.values()].map((b) => (
              <li key={b.symbol} className="rounded-lg border border-brand-hairline px-3 py-2">
                <span className="font-semibold text-brand-ink">{symbolLabel(b.symbol)}</span>{" "}
                <Badge tone={b.bias === "none" ? "bad" : b.bias === "both" ? "warn" : "ok"}>{biasLabel[b.bias] ?? b.bias}</Badge>{" "}
                <span className="text-xs text-brand-ink-dim">
                  {b.confidence}% · {fmtDateTime(b.createdAt)}
                </span>
                <p className="mt-1 text-xs text-brand-ink-dim">{(b.analysis as { pt?: string }).pt}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-brand-ink-dim">Nenhuma leitura ainda (chega quando um robô v7.5 manda o resumo do mercado).</p>
        )}
      </Panel>
    </div>
  );
}
