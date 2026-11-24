import { getCurrentUser } from "@/lib/auth";
import { activityFeed, markActivitySeen, onlineCustomers } from "@/lib/activity";

// Sininho do admin: GET = últimos acontecimentos + quem está online; POST { upTo } = marca como visto.

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return new Response("Forbidden", { status: 403 });
  const [feed, online] = await Promise.all([activityFeed(user.id), onlineCustomers()]);
  return Response.json(
    {
      unread: feed.unread,
      seen: feed.seen,
      online: online.map((o) => ({ email: o.email, name: o.name, lastSeenAt: o.lastSeenAt })),
      items: feed.items.map((i) => ({ id: i.id, kind: i.kind, email: i.email, name: i.name, detail: i.detail, createdAt: i.createdAt })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return new Response("Forbidden", { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { upTo?: unknown };
  const upTo = Number(body.upTo);
  if (!Number.isInteger(upTo) || upTo < 0) return new Response("Bad request", { status: 400 });
  await markActivitySeen(user.id, upTo);
  return Response.json({ ok: true });
}
