"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EMAIL_RE, normalizeEmail, requireAdmin } from "@/lib/auth";
import { fetchDepositAddress, fetchKeyPermissions } from "@/lib/binance";
import {
  getAdminEmails,
  getBinanceCreds,
  getBinanceSettings,
  getSetting,
  getSmtpConfig,
  getWallets,
  logEvent,
  seal,
  setSetting,
  type BinanceCreds,
  type WalletSettings,
} from "@/lib/config";
import { sendEmail, verifySmtp } from "@/lib/email";
import { PAYMENT_METHODS, METHOD_LABELS, type MethodKey } from "@/lib/payment-methods";
import { syncBinance, testBinanceConnection } from "@/lib/payments";

const field = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

// Volta pra aba de onde veio com o aviso (verde) ou erro (vermelho) no topo.
function back(tab: string, msg: string, error = false): never {
  revalidatePath("/admin", "layout");
  redirect(`/admin/settings/${tab}?${error ? "err" : "msg"}=${encodeURIComponent(msg)}`);
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

//=== Binance ==========================================================================================================

// Salva a chave SÓ depois de conferir com a Binance que ela é de leitura: chave com saque/trade é recusada.
export async function saveBinanceKeyAction(form: FormData) {
  const admin = await requireAdmin();
  const saved = await getBinanceSettings();
  const apiKey = field(form, "apiKey") || saved.apiKey || "";
  const newSecret = field(form, "apiSecret");
  const current = await getBinanceCreds();
  const apiSecret = newSecret || (current?.source === "admin" ? current.apiSecret : "");
  if (!/^[A-Za-z0-9]{20,128}$/.test(apiKey)) back("binance", "API Key inválida - cole a chave inteira, sem espaços.", true);
  if (!/^[A-Za-z0-9]{20,128}$/.test(apiSecret)) back("binance", "Secret Key inválida - cole a Secret Key inteira.", true);

  const creds: BinanceCreds = { apiKey, apiSecret, source: "admin" };
  let permissions;
  try {
    permissions = await fetchKeyPermissions(creds);
  } catch (error) {
    back("binance", `A Binance recusou a chave: ${errorText(error)}`, true);
  }
  if (permissions.withdrawals || permissions.trading || permissions.transfers) {
    const bad = [permissions.withdrawals && "saque", permissions.trading && "trade", permissions.transfers && "transferência"]
      .filter(Boolean)
      .join(", ");
    back("binance", `Por segurança, essa chave NÃO foi salva: ela tem ${bad} habilitado. Edite a chave na Binance e deixe só "Habilitar leitura".`, true);
  }
  if (!permissions.reading) back("binance", 'Essa chave está sem "Habilitar leitura". Ligue essa permissão na Binance.', true);

  const test = await testBinanceConnection(creds);
  await setSetting("binance_config", {
    ...saved,
    apiKey,
    apiSecretBox: seal(apiSecret),
    autoPay: saved.autoPay ?? true,
    savedAt: new Date().toISOString(),
    savedBy: admin.email,
    lastTest: test,
  });
  await logEvent(admin.email, "binance.key", `Chave salva (…${apiKey.slice(-4)}), IP restrito: ${permissions.ipRestrict ? "sim" : "não"}`);
  back(
    "binance",
    permissions.ipRestrict
      ? "Chave conectada e conferida: só leitura, com IP restrito. ✅"
      : "Chave conectada (só leitura). Recomendado: restringir a chave ao IP do servidor na Binance.",
  );
}

export async function testBinanceAction() {
  const admin = await requireAdmin();
  const creds = await getBinanceCreds();
  if (!creds) back("binance", "Nenhuma chave configurada ainda.", true);
  const test = await testBinanceConnection(creds);
  await setSetting("binance_config", { ...(await getBinanceSettings()), lastTest: test });
  await logEvent(admin.email, "binance.test", test.ok ? "Conexão OK" : `Falhou: ${test.error}`);
  if (!test.ok) back("binance", `Falhou: ${test.error}`, true);
  back("binance", `Conexão OK - ${test.deposits24h ?? 0} depósito(s) nas últimas 24h${test.payOk ? ", Binance Pay OK" : ", Binance Pay sem acesso"}.`);
}

export async function syncBinanceNowAction() {
  const admin = await requireAdmin();
  const state = await syncBinance();
  await logEvent(admin.email, "binance.sync", JSON.stringify(state));
  if (!state.ok) back("binance", `Leitura falhou: ${state.error}`, true);
  back("binance", `Leitura feita: ${state.newDeposits ?? 0} recebimento(s) novo(s), ${state.matched ?? 0} pedido(s) pago(s).`);
}

export async function setAutoPayAction(form: FormData) {
  const admin = await requireAdmin();
  const autoPay = field(form, "autoPay") === "on";
  await setSetting("binance_config", { ...(await getBinanceSettings()), autoPay });
  await logEvent(admin.email, "binance.autopay", autoPay ? "Ligado" : "Desligado");
  back("binance", autoPay ? "Confirmação automática LIGADA." : "Confirmação automática DESLIGADA - pedidos voltam a ser aprovados à mão.");
}

export async function removeBinanceKeyAction() {
  const admin = await requireAdmin();
  const saved = await getBinanceSettings();
  await setSetting("binance_config", { autoPay: saved.autoPay });
  await logEvent(admin.email, "binance.remove", "Chave removida do painel");
  back("binance", "Chave removida. Lembre de apagar a chave também na Binance, se não for mais usar.");
}

//=== Carteiras ========================================================================================================

const ADDRESS_RULES: Partial<Record<MethodKey, RegExp>> = {
  binancePay: /^\d{6,12}$/,
  usdtTrc20: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
  usdtBep20: /^0x[0-9a-fA-F]{40}$/,
  usdtErc20: /^0x[0-9a-fA-F]{40}$/,
  usdc: /^0x[0-9a-fA-F]{40}$/,
  eth: /^0x[0-9a-fA-F]{40}$/,
  btc: /^(bc1[0-9a-z]{20,80}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$/,
  ltc: /^(ltc1[0-9a-z]{20,80}|[LM3][1-9A-HJ-NP-Za-km-z]{26,33})$/,
};

export async function saveWalletsAction(form: FormData) {
  const admin = await requireAdmin();
  const next: WalletSettings = {};
  const problems: string[] = [];
  for (const m of PAYMENT_METHODS) {
    const value = field(form, `value_${m.key}`);
    const enabled = field(form, `enabled_${m.key}`) === "on";
    if (enabled && !value) problems.push(`${METHOD_LABELS[m.key]}: ligado mas sem endereço`);
    if (value && ADDRESS_RULES[m.key] && !ADDRESS_RULES[m.key]!.test(value)) problems.push(`${METHOD_LABELS[m.key]}: formato não parece válido`);
    next[m.key] = { value, enabled };
  }
  if (problems.length) back("wallets", `Nada foi salvo. ${problems.join(" · ")}`, true);
  if (!Object.values(next).some((w) => w?.enabled)) back("wallets", "Deixe pelo menos uma forma de pagamento ligada.", true);

  const before = await getWallets();
  const changed = PAYMENT_METHODS.filter((m) => {
    const old = before.find((b) => b.key === m.key)!;
    return old.value !== next[m.key]!.value || old.enabled !== next[m.key]!.enabled;
  }).map((m) => METHOD_LABELS[m.key]);
  await setSetting("wallets", next);
  await logEvent(admin.email, "wallets.save", changed.length ? `Alterado: ${changed.join(", ")}` : "Sem mudanças");
  back("wallets", changed.length ? `Carteiras salvas (${changed.length} alteração(ões)). O checkout já mostra os novos dados.` : "Nada mudou.");
}

// Compara cada carteira com o endereço de depósito que a Binance informa pra conta conectada.
export async function verifyWalletsAction() {
  const admin = await requireAdmin();
  const creds = await getBinanceCreds();
  if (!creds) back("wallets", "Conecte a Binance primeiro (aba Binance) pra conferir as carteiras.", true);
  const wallets = await getWallets();
  const results: Partial<Record<MethodKey, "ok" | "different" | "error">> = {};
  const binanceAddresses: Partial<Record<MethodKey, string>> = {};
  for (const w of wallets) {
    if (!w.binance || !w.value) continue;
    try {
      const address = await fetchDepositAddress(creds, w.binance.coin, w.binance.network);
      binanceAddresses[w.key] = address;
      results[w.key] = address.toLowerCase() === w.value.toLowerCase() ? "ok" : "different";
    } catch {
      results[w.key] = "error";
    }
  }
  await setSetting("binance_config", {
    ...(await getBinanceSettings()),
    walletCheck: { at: new Date().toISOString(), results, binanceAddresses },
  });
  const different = Object.values(results).filter((r) => r === "different").length;
  await logEvent(admin.email, "wallets.verify", JSON.stringify(results));
  back("wallets", different ? `${different} carteira(s) diferente(s) do endereço atual da Binance - veja abaixo.` : "Conferido: as carteiras batem com a sua conta Binance. ✅", different > 0);
}

//=== Email ============================================================================================================

export async function saveSmtpAction(form: FormData) {
  const admin = await requireAdmin();
  const saved = (await getSetting("smtp")) ?? {};
  const host = field(form, "host");
  const port = Number(field(form, "port"));
  const user = normalizeEmail(field(form, "user"));
  const fromName = field(form, "fromName") || "Ai X TradeX";
  const pass = field(form, "pass");
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) back("email", "Servidor ou porta inválidos.", true);
  if (!EMAIL_RE.test(user)) back("email", "Email de envio inválido.", true);

  const current = await getSmtpConfig();
  const candidate = { host, port, user, pass: pass || current.pass, from: `${fromName} <${user}>`, source: "admin" as const };
  try {
    await verifySmtp(candidate);
  } catch (error) {
    back("email", `O servidor de email recusou: ${errorText(error)}. Nada foi salvo.`, true);
  }
  await setSetting("smtp", {
    host,
    port,
    user,
    from: candidate.from,
    passBox: pass ? seal(pass) : saved.passBox,
  });
  await logEvent(admin.email, "email.save", `${user} via ${host}:${port}${pass ? " (senha nova)" : ""}`);
  back("email", "Email salvo e conferido com o servidor. ✅");
}

export async function sendTestEmailAction(form: FormData) {
  const admin = await requireAdmin();
  const to = normalizeEmail(field(form, "to") || admin.email);
  if (!EMAIL_RE.test(to)) back("email", "Email de destino inválido.", true);
  try {
    await sendEmail({
      to,
      subject: "Teste de email - Ai X TradeX",
      text: "Se você recebeu esta mensagem, o envio de emails do portal está funcionando (códigos de login e confirmações de pagamento).",
      html: '<p style="font-family:Arial,sans-serif">Se você recebeu esta mensagem, o envio de emails do portal está funcionando (códigos de login e confirmações de pagamento). ✅</p>',
    });
  } catch (error) {
    back("email", `Falhou: ${errorText(error)}`, true);
  }
  await logEvent(admin.email, "email.test", to);
  back("email", `Email de teste enviado pra ${to}. Confira a caixa de entrada (e o spam).`);
}

//=== Administradores ==================================================================================================

export async function addAdminAction(form: FormData) {
  const admin = await requireAdmin();
  const email = normalizeEmail(field(form, "email"));
  if (!EMAIL_RE.test(email)) back("admins", "Email inválido.", true);
  const { owners, extra } = await getAdminEmails();
  if (owners.includes(email) || extra.includes(email)) back("admins", "Esse email já é administrador.", true);
  await setSetting("admins", { emails: [...extra, email] });
  await logEvent(admin.email, "admins.add", email);
  back("admins", `${email} agora é administrador. Ele entra em app.aixtradex.com/admin com código no email.`);
}

export async function removeAdminAction(form: FormData) {
  const admin = await requireAdmin();
  const email = normalizeEmail(field(form, "email"));
  const { owners, extra } = await getAdminEmails();
  if (owners.includes(email)) back("admins", "Administrador principal (definido no servidor) não pode ser removido por aqui.", true);
  await setSetting("admins", { emails: extra.filter((e) => e !== email) });
  await logEvent(admin.email, "admins.remove", email);
  back("admins", `${email} não é mais administrador.`);
}
