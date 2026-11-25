import { getRobotPolicy } from "@/lib/robot-settings";
import { RobotPolicyForm } from "@/components/admin/RobotPolicyForm";

// O que cada cliente vê e pode escolher em Contas MT4 → Configurar robô (padrão, ocultar, opções liberadas, máximo).
export default async function RobotSettingsAdmin() {
  return <RobotPolicyForm initial={await getRobotPolicy()} />;
}
