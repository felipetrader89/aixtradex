import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { User } from "@/lib/db/schema";

const SESSION_COOKIE = "aix_session";
const SESSION_DAYS = 30;
const CODE_MINUTES = 10;
const CODE_MAX_ATTEMPTS = 5;
const CODE_RESEND_SECONDS = 60;

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isAdminEmail(email: string) {
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => normalizeEmail(e))
    .filter(Boolean);
  return admins.includes(normalizeEmail(email));
}

function hashCode(email: string, code: string) {
  return sha256(`${normalizeEmail(email)}:${code}`);
}

// Gera e grava um código novo. Retorna null se pediu outro código há menos de 1 minuto.
export async function createLoginCode(email: string): Promise<string | null> {
  const normalized = normalizeEmail(email);
  const [last] = await db()
    .select({ createdAt: schema.loginCodes.createdAt })
    .from(schema.loginCodes)
    .where(eq(schema.loginCodes.email, normalized))
    .orderBy(desc(schema.loginCodes.createdAt))
    .limit(1);
  if (last && Date.now() - last.createdAt.getTime() < CODE_RESEND_SECONDS * 1000) return null;

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db()
    .insert(schema.loginCodes)
    .values({
      email: normalized,
      codeHash: hashCode(normalized, code),
      expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000),
    });
  return code;
}

// Confere o código mais recente ainda válido. Cada erro conta tentativa; 5 erros invalida o código.
export async function verifyLoginCode(email: string, code: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const [row] = await db()
    .select()
    .from(schema.loginCodes)
    .where(
      and(
        eq(schema.loginCodes.email, normalized),
        isNull(schema.loginCodes.usedAt),
        gt(schema.loginCodes.expiresAt, new Date())
      )
    )
    .orderBy(desc(schema.loginCodes.createdAt))
    .limit(1);
  if (!row || row.attempts >= CODE_MAX_ATTEMPTS) return false;

  const expected = Buffer.from(row.codeHash, "hex");
  const given = Buffer.from(hashCode(normalized, code.trim()), "hex");
  if (!timingSafeEqual(expected, given)) {
    await db()
      .update(schema.loginCodes)
      .set({ attempts: row.attempts + 1 })
      .where(eq(schema.loginCodes.id, row.id));
    return false;
  }
  await db().update(schema.loginCodes).set({ usedAt: new Date() }).where(eq(schema.loginCodes.id, row.id));
  return true;
}

export async function findOrCreateUser(email: string, data: { name?: string; country?: string } = {}) {
  const normalized = normalizeEmail(email);
  const [existing] = await db().select().from(schema.users).where(eq(schema.users.email, normalized)).limit(1);
  if (existing) {
    if (data.name || data.country) {
      const [updated] = await db()
        .update(schema.users)
        .set({ name: data.name ?? existing.name, country: data.country ?? existing.country })
        .where(eq(schema.users.id, existing.id))
        .returning();
      return updated;
    }
    return existing;
  }
  const [created] = await db()
    .insert(schema.users)
    .values({ email: normalized, name: data.name, country: data.country })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const [raced] = await db().select().from(schema.users).where(eq(schema.users.email, normalized)).limit(1);
  return raced;
}

export async function startSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db().insert(schema.sessions).values({ tokenHash: sha256(token), userId, expiresAt });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db().delete(schema.sessions).where(eq(schema.sessions.tokenHash, sha256(token)));
  }
  jar.delete(SESSION_COOKIE);
}

export type SessionUser = User & { isAdmin: boolean };

// Pra actions e rotas do admin: lança erro se não for admin.
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user?.isAdmin) throw new Error("Acesso negado");
  return user;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db()
    .select({ user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.tokenHash, sha256(token)), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  if (!row) return null;
  return { ...row.user, isAdmin: isAdminEmail(row.user.email) };
}
