import { createHmac } from "node:crypto";
import { checkLicense } from "@/lib/licensing";
import { parseReport, saveReport, validReportSignature } from "@/lib/account-stats";
import { MT4_LOGIN, PRODUCT } from "@/lib/plans";
import { configPayload, getRobotConfig } from "@/lib/robot-settings";

// Consulta feita pelo robô (MQL4 WebRequest):
//   GET /api/license/check?account=12345678&product=pulse-rs&nonce=abc123&v=1.00&server=Broker-Live
// Resposta em texto simples, fácil de ler no MQL4:
//   STATUS|plano|vencimento_unix|hora_servidor_unix|assinatura
// STATUS: ACTIVE, EXPIRED, SUSPENDED, NOT_FOUND ou ERROR. Vencimento 0 = vitalícia.
// Assinatura = HMAC-SHA256(LICENSE_SECRET, "conta|STATUS|plano|vencimento|hora|nonce") em hex,
// pra ninguém conseguir fingir ser o servidor (o nonce muda a cada consulta).
// Opcional (robô a partir de 2026-11-24): &d=<dados da conta>&ds=<assinatura> - ver src/lib/account-stats.ts.
// Os dados vão pro painel do cliente; se vierem errados/sem assinatura, são ignorados e a licença responde normal.
// Opcional (robô v6.7+): &cfg=1 acrescenta uma 2ª linha com a configuração escolhida no portal:
//   CFG|sym=XAUUSD,EURUSD;risk=2;...|assinatura   (assinatura = HMAC(LICENSE_SECRET, "conta|nonce|configuração"))
// Robôs antigos não mandam cfg=1 e recebem exatamente a resposta de sempre.

const NONCE = /^[A-Za-z0-9]{8,64}$/;

function reply(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const account = params.get("account")?.trim() ?? "";
  const product = params.get("product")?.trim() || PRODUCT.slug;
  const nonce = params.get("nonce")?.trim() ?? "";
  const secret = process.env.LICENSE_SECRET;

  if (!MT4_LOGIN.test(account) || !NONCE.test(nonce)) return reply("ERROR|bad_request", 400);
  if (!secret) return reply("ERROR|not_configured", 500);

  try {
    const result = await checkLicense({
      product,
      login: account,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
      eaVersion: params.get("v"),
      server: params.get("server"),
    });
    const d = params.get("d");
    const ds = params.get("ds");
    if (d && ds && d.length <= 600 && validReportSignature(secret, account, nonce, d, ds)) {
      const report = parseReport(d);
      if (report) {
        await saveReport({
          product,
          login: account,
          report,
          server: params.get("server"),
          eaVersion: params.get("v"),
          licenseStatus: result.status,
        }).catch((error) => console.error("account report failed", account, error));
      }
    }
    const expires = result.expiresAt ? Math.floor(result.expiresAt.getTime() / 1000) : 0;
    const now = Math.floor(Date.now() / 1000);
    const payload = `${account}|${result.status}|${result.plan}|${expires}|${now}|${nonce}`;
    const sig = createHmac("sha256", secret).update(payload).digest("hex");
    let body = `${result.status}|${result.plan}|${expires}|${now}|${sig}`;
    if (params.get("cfg") === "1" && result.status !== "NOT_FOUND") {
      const cfg = configPayload(await getRobotConfig(product, account));
      body += `
CFG|${cfg}|${createHmac("sha256", secret).update(`${account}|${nonce}|${cfg}`).digest("hex")}`;
    }
    return reply(body);
  } catch (error) {
    console.error("license check failed", error);
    return reply("ERROR|server", 500);
  }
}
