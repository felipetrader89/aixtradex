import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Segredos salvos pelo admin (secret da Binance, senha do email) ficam CRIPTOGRAFADOS no banco (AES-256-GCM).
// A chave fica só no .env do servidor (SETTINGS_KEY) — um backup do banco sozinho não revela nada.
function key() {
  const base = process.env.SETTINGS_KEY || process.env.LICENSE_SECRET;
  if (!base) throw new Error("SETTINGS_KEY não configurada");
  return createHash("sha256").update(`aix-settings:${base}`).digest();
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}

export function decryptSecret(box: string | null | undefined) {
  if (!box) return null;
  const [version, iv, tag, data] = box.split(":");
  if (version !== "v1") return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// "••••a1b2" — pra mostrar no admin que existe um valor salvo sem revelar o valor.
export const maskTail = (value: string | null | undefined, visible = 4) =>
  value ? `••••${value.slice(-visible)}` : "";
