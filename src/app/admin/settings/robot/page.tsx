import { getRobotAdminSettings } from "@/lib/robot-settings";
import { saveRobotAdminAction } from "@/app/actions/robot";
import { Flash, Panel, adminBtn, adminInput, adminLabel } from "@/components/admin/ui";

type Props = { searchParams: Promise<{ msg?: string; err?: string }> };

// Limites do robô que só o admin define (o resto cada cliente ajusta em Contas MT4 → Configurar robô).
export default async function RobotSettingsAdmin({ searchParams }: Props) {
  const { msg, err } = await searchParams;
  const s = await getRobotAdminSettings();

  return (
    <div className="flex flex-col gap-6">
      <Flash msg={msg} err={err} tight />
      <Panel title="Rebaixamento máximo">
        <p className="mb-5 max-w-3xl text-sm text-brand-ink-dim">
          Se as operações abertas do robô (todos os pares somados) perderem essa % do saldo, ele fecha tudo e pausa até o dia
          seguinte. Cada cliente escolhe o valor no painel dele, até o teto daqui. Vale a partir do robô v6.8.
        </p>
        <form action={saveRobotAdminAction} className="flex flex-wrap items-end gap-4">
          <label>
            <span className={adminLabel}>Teto (cliente escolhe até)</span>
            <input name="ddCap" type="number" min={1} max={100} step={1} defaultValue={s.ddCap} className={`${adminInput} w-32`} />
          </label>
          <label>
            <span className={adminLabel}>Padrão (quem não mexeu)</span>
            <input name="ddDefault" type="number" min={0} max={100} step={1} defaultValue={s.ddDefault} className={`${adminInput} w-32`} />
          </label>
          <button type="submit" className={adminBtn}>
            Salvar
          </button>
        </form>
        <p className="mt-3 text-xs text-brand-ink-dim">Padrão 0 = desligado. Se você baixar o teto, quem tinha escolhido mais passa a usar o teto.</p>
      </Panel>
    </div>
  );
}
