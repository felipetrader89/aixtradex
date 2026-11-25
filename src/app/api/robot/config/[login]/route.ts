import { canConfigure } from "@/lib/robot-access";
import { PRODUCT } from "@/lib/plans";
import { configPayload, getRobotConfig } from "@/lib/robot-settings";

// Arquivo pro BACKTEST no MT4 (o testador não acessa a internet): a mesma configuração que o robô recebe do portal.
// O cliente coloca em Terminal\Common\Files; o robô v6.9+ lê de lá quando roda no testador.
export async function GET(_req: Request, { params }: { params: Promise<{ login: string }> }) {
  const { login } = await params;
  if (!/^\d{3,12}$/.test(login) || !(await canConfigure(login))) return new Response("Not found", { status: 404 });
  return new Response(configPayload(await getRobotConfig(PRODUCT.slug, login)), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="aixtradex_config_${login}.dat"`,
      "Cache-Control": "no-store",
    },
  });
}
