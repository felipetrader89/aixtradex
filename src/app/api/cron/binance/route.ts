import { timingSafeEqual } from "node:crypto";
import { syncBinance } from "@/lib/payments";

// Chamado a cada minuto pelo pulse-binance.timer da VPS:
//   curl -H "x-cron-secret: $CRON_SECRET" http://127.0.0.1:3100/api/cron/binance
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET ?? "";
  const given = request.headers.get("x-cron-secret") ?? "";
  if (expected.length < 16 || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export async function POST(request: Request) {
  if (!authorized(request)) return new Response("forbidden", { status: 403 });
  try {
    const state = await syncBinance();
    return Response.json(state, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("cron binance", error);
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
}

export const GET = POST;
