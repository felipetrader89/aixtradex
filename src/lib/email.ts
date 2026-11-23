import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// Envio pelo email da Hostinger (SMTP). Sem SMTP_PASS (ambiente local), o email só aparece no terminal.
let transporter: Transporter | undefined;

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "smtp.hostinger.com",
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text: string }) {
  if (!process.env.SMTP_PASS) {
    console.log(`[email:dev] para ${to} | ${subject}\n${text}`);
    return;
  }
  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM ?? `Ai X TradeX <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });
}
