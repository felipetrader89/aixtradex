import "server-only";
import { and, count, desc, eq, gt, gte, isNull, lt, or, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Activity } from "@/lib/db/schema";

// Feed do sininho do admin: o que os clientes fazem no portal (cadastro, entrou, pedido, pagamento, pedido de acesso).

export type ActivityKind = Activity["kind"];

// Online = abriu alguma página do portal nos últimos 5 min. Entrar de novo depois de 30 min sem aparecer = aviso "online".
export const ONLINE_MS = 5 * 60_000;
const SEEN_EVERY_MS = 60_000;
const BACK_AFTER_MS = 30 * 60_000;

export async function recordActivity(kind: ActivityKind, user: { id?: string | null; email?: string | null } | null, detail?: string) {
  try {
    await db()
      .insert(schema.activity)
      .values({ kind, userId: user?.id ?? null, email: user?.email ?? null, detail: detail?.slice(0, 300) ?? null });
  } catch (error) {
    console.error("recordActivity", kind, error);
  }
}

// Chamado a cada página do portal aberta por um cliente (não admin). Grava no máximo 1x por minuto.
export async function touchLastSeen(user: { id: string; email: string; lastSeenAt: Date | null }) {
  const now = Date.now();
  if (user.lastSeenAt && now - user.lastSeenAt.getTime() < SEEN_EVERY_MS) return;
  try {
    // Volta depois de 30 min (ou primeira vez): só 1 chamada ganha (update condicional) e gera o aviso.
    const back = await db()
      .update(schema.users)
      .set({ lastSeenAt: new Date() })
      .where(
        and(
          eq(schema.users.id, user.id),
          or(isNull(schema.users.lastSeenAt), lt(schema.users.lastSeenAt, new Date(now - BACK_AFTER_MS)))
        )
      )
      .returning({ id: schema.users.id });
    if (back.length) {
      await recordActivity("online", user);
      return;
    }
    await db()
      .update(schema.users)
      .set({ lastSeenAt: new Date() })
      .where(and(eq(schema.users.id, user.id), lt(schema.users.lastSeenAt, new Date(now - SEEN_EVERY_MS))));
  } catch (error) {
    console.error("touchLastSeen", error);
  }
}

export async function onlineCustomers() {
  return db()
    .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name, lastSeenAt: schema.users.lastSeenAt })
    .from(schema.users)
    .where(gte(schema.users.lastSeenAt, new Date(Date.now() - ONLINE_MS)))
    .orderBy(desc(schema.users.lastSeenAt));
}

export async function activityFeed(adminId: string, limit = 25) {
  const [[me], items] = await Promise.all([
    db().select({ seen: schema.users.activitySeenId }).from(schema.users).where(eq(schema.users.id, adminId)),
    db()
      .select({ item: schema.activity, name: schema.users.name })
      .from(schema.activity)
      .leftJoin(schema.users, eq(schema.users.id, schema.activity.userId))
      .orderBy(desc(schema.activity.id))
      .limit(limit),
  ]);
  const seen = me?.seen ?? 0;
  const [unread] = await db().select({ n: count() }).from(schema.activity).where(gt(schema.activity.id, seen));
  return { seen, unread: unread.n, items: items.map((r) => ({ ...r.item, name: r.name })) };
}

export async function markActivitySeen(adminId: string, upTo: number) {
  await db()
    .update(schema.users)
    .set({ activitySeenId: sql`greatest(${schema.users.activitySeenId}, ${upTo})` })
    .where(eq(schema.users.id, adminId));
}
