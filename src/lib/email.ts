import "server-only";

// Envio via Resend (https://resend.com). Sem RESEND_API_KEY (ambiente local), o email só aparece no terminal.
export async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email:dev] para ${to} | ${subject}\n${text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Ai X TradeX <noreply@aixtradex.com>",
      to: [to],
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) {
    throw new Error(`Falha ao enviar email (${res.status}): ${await res.text()}`);
  }
}
