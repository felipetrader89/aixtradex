import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { getSmtpConfig, type SmtpConfig } from "@/lib/config";

// Envio pelo email da Hostinger (SMTP). Configuração em Admin → Configurações → Email (ou no .env do servidor).
// Sem senha configurada (ambiente local), o email só aparece no terminal.
let cached: { signature: string; transporter: Transporter } | undefined;

function transporterFor(config: SmtpConfig) {
  const signature = JSON.stringify([config.host, config.port, config.user, config.pass]);
  if (!cached || cached.signature !== signature) {
    cached = {
      signature,
      transporter: nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: { user: config.user, pass: config.pass ?? undefined },
      }),
    };
  }
  return cached.transporter;
}

export async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text: string }) {
  const config = await getSmtpConfig();
  if (!config.pass) {
    console.log(`[email:dev] para ${to} | ${subject}\n${text}`);
    return;
  }
  await transporterFor(config).sendMail({ from: config.from, to, subject, text, html });
}

// Botão "Testar" do admin: confere usuário/senha no servidor de email sem mandar nada.
export async function verifySmtp(config: SmtpConfig) {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass ?? undefined },
  });
  await transporter.verify();
}
